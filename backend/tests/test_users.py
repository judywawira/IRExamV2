"""
User Management API Tests
"""
import pytest


@pytest.mark.asyncio
async def test_list_users_admin(async_client, admin_token, admin_user, student_user):
    """Test admin can list users"""
    response = await async_client.get(
        "/api/v1/users",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 2  # At least admin and student


@pytest.mark.asyncio
async def test_approve_user(async_client, admin_token, test_db):
    """Test admin can approve users"""
    from app.models.user import User
    from app.core.security import hash_password

    # Create unapproved user
    user = User(
        email="pending@test.com",
        password=hash_password("Password123"),
        first_name="Pending",
        last_name="User",
        role="student",
        is_approved=False
    )
    await user.insert()

    # Approve user
    response = await async_client.patch(
        f"/api/v1/users/{str(user.id)}",
        json={"is_approved": True},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["is_approved"] == True


@pytest.mark.asyncio
async def test_archive_user(async_client, admin_token, student_user):
    """Test admin can archive users"""
    response = await async_client.delete(
        f"/api/v1/users/{str(student_user.id)}",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200

    # Verify user is archived
    from app.models.user import User
    user = await User.get(str(student_user.id))
    assert user.is_archived == True
