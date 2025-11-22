"""
User Model
Supports three roles: admin, examiner, student
"""
from beanie import Document, Indexed
from pydantic import EmailStr, Field
from datetime import datetime
from typing import Literal


class User(Document):
    """User document model"""

    email: Indexed(EmailStr, unique=True)
    password: str  # SHA-256 pre-hashed + bcrypt
    first_name: str
    last_name: str
    role: Literal["admin", "examiner", "student"]
    is_approved: bool = False
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        indexes = [
            "email",
            "role",
            "is_approved",
            "is_archived"
        ]

    @property
    def full_name(self) -> str:
        """Get user's full name"""
        return f"{self.first_name} {self.last_name}"

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "password": "hashed_password",
                "first_name": "John",
                "last_name": "Doe",
                "role": "examiner",
                "is_approved": True,
                "is_archived": False
            }
        }
