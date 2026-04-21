"""One-time migration: adds quantity=1 to all stamps that don't have a quantity field."""
import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://db:27017")

async def migrate():
    client = AsyncIOMotorClient(MONGODB_URL)
    collection = client.stamp_archive.stamps

    result = await collection.update_many(
        {"quantity": {"$exists": False}},
        {"$set": {"quantity": 1}}
    )

    print(f"Updated {result.modified_count} stamps with quantity=1")

    remaining = await collection.count_documents({"quantity": {"$exists": False}})
    if remaining == 0:
        print("Migration successful — all stamps now have a quantity field.")
    else:
        print(f"WARNING: {remaining} stamps still missing quantity field.")

if __name__ == "__main__":
    asyncio.run(migrate())
