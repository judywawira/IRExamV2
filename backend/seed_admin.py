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
    print(f"📧 Admin email: {settings.ADMIN_EMAIL}")
    print(f"🔑 Admin password length: {len(settings.ADMIN_PASSWORD)} characters")

    # Validate configuration
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        print("❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env")
        return

    if len(settings.ADMIN_PASSWORD) < 8:
        print("⚠️  Warning: Password is less than 8 characters (weak)")

    try:
        # Connect to MongoDB
        print(f"🔌 Connecting to MongoDB: {settings.MONGODB_URL}")
        client = AsyncIOMotorClient(settings.MONGODB_URL)

        await init_beanie(
            database=client[settings.DATABASE_NAME],
            document_models=[User, Case, Exam, Session]
        )
        print(f"✅ Connected to database: {settings.DATABASE_NAME}")

        # Check if admin already exists
        existing_admin = await User.find_one(User.email == settings.ADMIN_EMAIL)

        if existing_admin:
            print(f"❌ Admin user already exists: {settings.ADMIN_EMAIL}")
            print(f"   To recreate, first delete the existing user from MongoDB")
            client.close()
            return

        # Hash password (with SHA-256 + bcrypt)
        print("🔐 Hashing password (SHA-256 + bcrypt)...")
        try:
            hashed_password = hash_password(settings.ADMIN_PASSWORD)
            print(f"✅ Password hashed successfully (hash length: {len(hashed_password)})")
        except Exception as e:
            print(f"❌ Password hashing failed: {e}")
            print(f"   This should never happen with SHA-256 pre-hashing!")
            print(f"   Check app/core/security.py implementation")
            client.close()
            return

        # Create admin user
        print("👤 Creating admin user...")
        admin = User(
            email=settings.ADMIN_EMAIL,
            password=hashed_password,
            first_name=settings.ADMIN_FIRST_NAME,
            last_name=settings.ADMIN_LAST_NAME,
            role="admin",
            is_approved=True,  # Auto-approved
            is_archived=False,
            created_at=datetime.utcnow()
        )

        await admin.insert()

        print(f"\n✅ Admin user created successfully!")
        print(f"   Email: {settings.ADMIN_EMAIL}")
        print(f"   Password: {settings.ADMIN_PASSWORD}")
        print(f"   🔐 IMPORTANT: Change the password after first login!")
        print(f"\n🚀 You can now start the server:")
        print(f"   uvicorn app.main:socket_app --reload")

        client.close()

    except Exception as e:
        print(f"\n❌ Error during seeding: {e}")
        print(f"\nTroubleshooting:")
        print(f"1. Check MongoDB is running: mongosh")
        print(f"2. Verify .env file exists and is configured")
        print(f"3. Check MONGODB_URL in .env: {settings.MONGODB_URL}")
        print(f"4. See backend/TROUBLESHOOTING.md for common issues")
        raise


if __name__ == "__main__":
    asyncio.run(seed_admin())
