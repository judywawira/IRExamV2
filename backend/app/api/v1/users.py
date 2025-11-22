"""
User Management API Endpoints
Admin-only user management
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List

from app.core.security import verify_admin, get_current_active_user
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdate


router = APIRouter()


@router.get("/", response_model=List[UserResponse])
async def list_users(
    role: str = None,
    is_approved: bool = None,
    current_user: User = Depends(verify_admin)
):
    """
    List all users (Admin only)
    Optional filters: role, is_approved
    """
    query = {}

    if role:
        query['role'] = role
    if is_approved is not None:
        query['is_approved'] = is_approved

    # Exclude archived users by default
    query['is_archived'] = False

    users = await User.find(query).to_list()

    return [
        UserResponse(
            id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role,
            is_approved=user.is_approved,
            is_archived=user.is_archived,
            created_at=user.created_at
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_user: User = Depends(verify_admin)
):
    """Get user by ID (Admin only)"""
    user = await User.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_approved=user.is_approved,
        is_archived=user.is_archived,
        created_at=user.created_at
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(verify_admin)
):
    """Update user (Admin only)"""
    user = await User.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)

    await user.save()

    return UserResponse(
        id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role,
        is_approved=user.is_approved,
        is_archived=user.is_archived,
        created_at=user.created_at
    )


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(verify_admin)
):
    """
    Archive user (Admin only)
    Soft delete - marks user as archived
    """
    user = await User.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent self-deletion
    if str(user.id) == str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    user.is_archived = True
    await user.save()

    return {"success": True, "message": "User archived"}
