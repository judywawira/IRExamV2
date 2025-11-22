"""
Case Model
Represents a clinical case with images and annotations
"""
from beanie import Document, Link
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import uuid4


class CaseImage(BaseModel):
    """Embedded image document within a case"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    filename: str  # UUID-based filename on disk
    original_name: str  # Original uploaded filename
    path: str  # Relative path to file
    mimetype: str  # image/jpeg or image/png
    size: int  # File size in bytes
    description: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class CaseAnnotation(BaseModel):
    """Embedded annotation document"""

    id: str = Field(default_factory=lambda: str(uuid4()))
    image_id: str  # References CaseImage.id
    image_index: int  # Index in images array
    tool_type: str  # 'circle', 'arrow', 'rectangle', 'freehand'
    data: Dict[str, Any]  # Coordinates and style data
    created_by_id: str  # User ID who created annotation
    is_visible: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Case(Document):
    """Case document model"""

    title: str
    clinical_history: Optional[str] = None
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    discussion_points: Optional[str] = None
    images: List[CaseImage] = []
    annotations: List[CaseAnnotation] = []

    # Usage tracking to prevent deletion of active content
    usage_history: List[Dict[str, Any]] = []

    created_by: Link["User"]  # Forward reference
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "cases"
        indexes = [
            "title",
            "created_by",
            "created_at"
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Chest X-ray - Pneumothorax",
                "clinical_history": "65-year-old male with sudden onset chest pain",
                "findings": "Large right-sided pneumothorax",
                "diagnosis": "Spontaneous pneumothorax",
                "discussion_points": "Emergency chest tube insertion indicated",
                "images": [],
                "annotations": []
            }
        }
