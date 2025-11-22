"""
Pytest configuration and fixtures
"""
import pytest
import asyncio
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.main import app
from app.core.config import settings
from app.models.user import User
from app.models.case import Case
from app.models.exam import Exam
from app.models.session import Session
from app.core.security import hash_password


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db():
    """Setup test database"""
    # Use test database
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    test_db_name = f"{settings.DATABASE_NAME}_test"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User, Case, Exam, Session]
    )

    yield client[test_db_name]

    # Cleanup after test
    await client.drop_database(test_db_name)
    client.close()


@pytest.fixture
async def async_client(test_db):
    """Create async HTTP client for testing"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest.fixture
async def admin_user(test_db):
    """Create admin user for testing"""
    user = User(
        email="admin@test.com",
        password=hash_password("Admin@123"),
        first_name="Admin",
        last_name="Test",
        role="admin",
        is_approved=True
    )
    await user.insert()
    return user


@pytest.fixture
async def examiner_user(test_db):
    """Create examiner user for testing"""
    user = User(
        email="examiner@test.com",
        password=hash_password("Examiner@123"),
        first_name="Examiner",
        last_name="Test",
        role="examiner",
        is_approved=True
    )
    await user.insert()
    return user


@pytest.fixture
async def student_user(test_db):
    """Create student user for testing"""
    user = User(
        email="student@test.com",
        password=hash_password("Student@123"),
        first_name="Student",
        last_name="Test",
        role="student",
        is_approved=True
    )
    await user.insert()
    return user


@pytest.fixture
async def admin_token(async_client, admin_user):
    """Get admin JWT token"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "admin@test.com",
            "password": "Admin@123"
        }
    )
    return response.json()["access_token"]


@pytest.fixture
async def examiner_token(async_client, examiner_user):
    """Get examiner JWT token"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "examiner@test.com",
            "password": "Examiner@123"
        }
    )
    return response.json()["access_token"]
