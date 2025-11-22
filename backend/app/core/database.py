"""
Database connection and initialization
Using Beanie ODM for MongoDB
"""
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from typing import Optional

from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.exam import Exam
from app.models.session import Session


# Global database client
db_client: Optional[AsyncIOMotorClient] = None


async def init_db():
    """Initialize database connection and Beanie ODM"""
    global db_client

    # Create Motor client
    db_client = AsyncIOMotorClient(settings.MONGODB_URL)

    # Initialize Beanie with document models
    await init_beanie(
        database=db_client[settings.DATABASE_NAME],
        document_models=[
            User,
            Case,
            Exam,
            Session
        ]
    )

    print(f"✅ Connected to MongoDB: {settings.DATABASE_NAME}")


async def close_db():
    """Close database connection"""
    global db_client
    if db_client:
        db_client.close()
        print("❌ MongoDB connection closed")


async def get_db():
    """Dependency for getting database instance"""
    return db_client[settings.DATABASE_NAME]
