from fastapi import FastAPI, HTTPException, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import os
import boto3
from botocore.exceptions import ClientError

# --- CLOUDFLARE R2 SETUP ---
# boto3 is the standard Python library for S3-compatible storage.
# R2 works exactly like S3 — the only difference is the endpoint_url.
r2 = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
)
R2_BUCKET = os.getenv("R2_BUCKET_NAME")

app = FastAPI()

# --- CORS SETTINGS ---
# This allows your React app (on port 5173) to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, we allow all. 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://db:27017"))
db = client.stamp_archive
collection = db.stamps

# Pydantic model for Stamp
class Stamp(BaseModel):
    name: str
    scott_number: str = Field(..., description="Primary identifier")
    country: str
    denomination: str
    print_year: Optional[int] = None      # Changed from datetime for simplicity
    color: str
    dimensions: str                      # e.g., "22mm x 25mm"
    perforations: Optional[str] = None    # e.g., "11 x 10.5"
    condition: str
    value: float
    image_url: str
    tags: List[str] = []

    # Mount static files for images
# Note: Ensure the directory "images" exists in your backend folder
# or matches your Docker volume mount path
if not os.path.exists("images"):
    os.makedirs("images")

app.mount("/images", StaticFiles(directory="images"), name="images")

# Create unique index on startup
@app.on_event("startup")
async def startup_event():
    # Remove the old single-field index if it exists
    try:
        await collection.drop_index("scott_number_1")
    except:
        pass # Index might not exist yet
    
    # Create the new Compound Unique Index
    # This allows '296' to exist for multiple countries
    await collection.create_index(
        [("country", 1), ("scott_number", 1)], 
        unique=True
    )

# API Routes
@app.get("/stamps", response_model=List[Stamp])
async def get_stamps(limit: int = 50, skip: int = 0, country: Optional[str] = None):
    query = {}
    if country:
        query["country"] = country
    pipeline = [
        {"$match": query},
        {"$addFields": {"scott_number_int": {"$let": {
            "vars": {"m": {"$regexFind": {"input": "$scott_number", "regex": "^\\d+"}}},
            "in": {"$convert": {"input": "$$m.match", "to": "int", "onError": 0, "onNull": 0}}
        }}}},
        {"$sort": {"print_year": 1, "scott_number_int": 1, "scott_number": 1}},
        {"$skip": skip},
        {"$limit": limit},
    ]
    stamps = await collection.aggregate(pipeline).to_list(length=limit)
    return stamps

@app.get("/countries")
async def get_countries():
    """Returns a list of all unique countries in the collection"""
    countries = await collection.distinct("country")
    return sorted(countries)

@app.get("/statistics")
async def get_statistics():
    """Returns country statistics: count and total value per country"""
    # Aggregate stamps by country
    pipeline = [
        {
            "$group": {
                "_id": "$country",
                "count": {"$sum": 1},
                "total_value": {"$sum": "$value"}
            }
        },
        {
            "$sort": {"_id": 1}
        }
    ]
    
    results = await collection.aggregate(pipeline).to_list(None)
    
    # Calculate grand total value
    grand_total = sum(item["total_value"] for item in results)
    
    # Format response
    stats = {
        "by_country": [
            {
                "country": item["_id"],
                "count": item["count"],
                "total_value": item["total_value"]
            }
            for item in results
        ],
        "grand_total_value": grand_total,
        "total_countries": len(results),
        "total_stamps": sum(item["count"] for item in results)
    }
    
    return stats

@app.post("/stamps", response_model=Stamp)
async def create_stamp(stamp: Stamp):
    # Check for the specific country + scott_number combo
    existing = await collection.find_one({
        "country": stamp.country, 
        "scott_number": stamp.scott_number
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Stamp {stamp.scott_number} already exists for {stamp.country}"
        )
    result = await collection.insert_one(stamp.dict())
    return stamp

@app.get("/stamps/{country}/{scott_number}", response_model=Stamp)
async def get_stamp(country: str, scott_number: str):
    stamp = await collection.find_one({
        "country": country, 
        "scott_number": scott_number
    })
    if not stamp:
        raise HTTPException(status_code=404, detail="Stamp not found")
    return Stamp(**stamp)

@app.put("/stamps/{country}/{scott_number}", response_model=Stamp)
async def update_stamp(country: str, scott_number: str, stamp: Stamp):
    result = await collection.replace_one(
        {"country": country, "scott_number": scott_number}, 
        stamp.dict()
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stamp not found")
    return stamp

@app.delete("/stamps/{country}/{scott_number}")
async def delete_stamp(country: str, scott_number: str):
    result = await collection.delete_one({"country": country, "scott_number": scott_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stamp not found")
    return {"message": "Stamp deleted"}
async def delete_stamp(scott_number: str):
    result = await collection.delete_one({"scott_number": scott_number})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stamp not found")
    return {"message": "Stamp deleted"}

# --- IMAGE UPLOAD ENDPOINT ---
# This receives an image file from the frontend, uploads it to Cloudflare R2,
# and returns the public URL to be stored in the stamp's image_url field.
@app.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    try:
        # Read the file contents into memory
        contents = await file.read()

        # Upload to R2. The file is stored under its original filename.
        r2.put_object(
            Bucket=R2_BUCKET,
            Key=file.filename,
            Body=contents,
            ContentType=file.content_type,
        )

        # Build the public URL (requires the bucket to have public access enabled in R2)
        public_url = f"{os.getenv('R2_PUBLIC_URL')}/{file.filename}"
        return {"url": public_url}

    except ClientError as e:
        # ClientError is raised by boto3 when R2 rejects the request
        raise HTTPException(status_code=500, detail=str(e))


# Bulk insert for loading 20,000+ stamps
@app.post("/stamps/bulk")
async def bulk_insert_stamps(stamps: List[Stamp]):
    # Use insert_many for efficiency
    data = [stamp.dict() for stamp in stamps]
    try:
        result = await collection.insert_many(data, ordered=False)
        return {"inserted_count": len(result.inserted_ids)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))