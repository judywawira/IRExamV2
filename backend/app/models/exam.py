"""
Exam Model
Collection of cases forming an examination
"""
from beanie import Document, Link
from pydantic import Field
from datetime import datetime
from typing import List, Optional


class Exam(Document):
    """Exam document model"""

    title: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None  # Exam duration in minutes (optional, null = no time limit)
    cases: List[Link["Case"]] = []  # References to Case documents

    created_by: Link["User"]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_archived: bool = False

    class Settings:
        name = "exams"
        indexes = [
            "title",
            "created_by",
            "created_at"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Radiology Final Exam 2024",
                "description": "Comprehensive radiology examination",
                "duration_minutes": 120,
                "cases": []
            }
        }
