"""
Authentication API Tests
"""
import pytest


@pytest.mark.asyncio
async def test_register_user(async_client):
    """Test user registration"""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@test.com",
            "password": "Password123",
            "first_name": "New",
            "last_name": "User",
            "role": "student"
        }
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "newuser@test.com"
    assert data["is_approved"] == False  # Requires approval


@pytest.mark.asyncio
async def test_register_duplicate_email(async_client, student_user):
    """Test registration with duplicate email fails"""
    response = await async_client.post(
        "/api/v1/auth/register",
        json={
            "email": "student@test.com",  # Already exists
            "password": "Password123",
            "first_name": "Duplicate",
            "last_name": "User",
            "role": "student"
        }
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_success(async_client, admin_user):
    """Test successful login"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "admin@test.com",
            "password": "Admin@123"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(async_client, admin_user):
    """Test login with wrong password"""
    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "admin@test.com",
            "password": "WrongPassword"
        }
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_unapproved_user(async_client, test_db):
    """Test login with unapproved user"""
    from app.models.user import User
    from app.core.security import hash_password

    # Create unapproved user
    user = User(
        email="unapproved@test.com",
        password=hash_password("Password123"),
        first_name="Unapproved",
        last_name="User",
        role="student",
        is_approved=False
    )
    await user.insert()

    response = await async_client.post(
        "/api/v1/auth/login",
        data={
            "username": "unapproved@test.com",
            "password": "Password123"
        }
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user(async_client, admin_token):
    """Test getting current user info"""
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "admin@test.com"
    assert data["role"] == "admin"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token(async_client):
    """Test getting user with invalid token"""
    response = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer invalid_token"}
    )
    assert response.status_code == 401
