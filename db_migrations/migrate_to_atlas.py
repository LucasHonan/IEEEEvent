"""One-time migration script: copies all stamps from local MongoDB to Atlas."""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

LOCAL_URL = "mongodb://db:27017"
ATLAS_URL = os.getenv("MONGODB_URL")

async def migrate():
    if not ATLAS_URL:
        print("ERROR: MONGODB_URL env var not set")
        return

    print(f"Connecting to local: {LOCAL_URL}")
    local_client = AsyncIOMotorClient(LOCAL_URL)
    local_col = local_client.stamp_archive.stamps

    print(f"Connecting to Atlas: {ATLAS_URL[:50]}...")
    atlas_client = AsyncIOMotorClient(ATLAS_URL)
    atlas_col = atlas_client.stamp_archive.stamps

    stamps = await local_col.find({}).to_list(length=None)
    print(f"Found {len(stamps)} stamps in local MongoDB")

    if not stamps:
        print("No stamps found, nothing to migrate.")
        return

    # Drop existing Atlas data to avoid duplicates on re-run
    await atlas_col.drop()
    print("Cleared existing Atlas collection")

    result = await atlas_col.insert_many(stamps)
    print(f"Inserted {len(result.inserted_ids)} stamps into Atlas")

    local_count = await local_col.count_documents({})
    atlas_count = await atlas_col.count_documents({})
    print(f"Verification — local: {local_count}, Atlas: {atlas_count}")

    if local_count == atlas_count:
        print("Migration successful!")
    else:
        print("WARNING: counts do not match, check for errors above")

if __name__ == "__main__":
    asyncio.run(migrate())
