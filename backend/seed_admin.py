"""
Database Seed Script
Creates the first admin user
Run: python seed_admin.py
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from datetime import datetime

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User
from app.models.case import Case
from app.models.exam import Exam
from app.models.session import Session


async def seed_admin():
    """Create first admin user"""
    print("🌱 Seeding database...")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.DATABASE_NAME],
        document_models=[User, Case, Exam, Session]
    )

    # Check if admin already exists
    existing_admin = await User.find_one(User.email == settings.ADMIN_EMAIL)

    if existing_admin:
        print(f"❌ Admin user already exists: {settings.ADMIN_EMAIL}")
        return

    # Create admin user
    admin = User(
        email=settings.ADMIN_EMAIL,
        password=hash_password(settings.ADMIN_PASSWORD),
        first_name=settings.ADMIN_FIRST_NAME,
        last_name=settings.ADMIN_LAST_NAME,
        role="admin",
        is_approved=True,  # Auto-approved
        is_archived=False,
        created_at=datetime.utcnow()
    )

    await admin.insert()

    print(f"✅ Admin user created successfully!")
    print(f"   Email: {settings.ADMIN_EMAIL}")
    print(f"   Password: {settings.ADMIN_PASSWORD}")
    print(f"   🔐 Please change the password after first login!")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed_admin())
