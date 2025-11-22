"""
Case Schemas for API validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Dict, Any


class CaseImageResponse(BaseModel):
    """Schema for case image response"""
    id: str
    filename: str
    original_name: str
    path: str
    mimetype: str
    size: int
    description: Optional[str] = None
    uploaded_at: datetime


class CaseAnnotationResponse(BaseModel):
    """Schema for annotation response"""
    id: str
    image_id: str
    image_index: int
    tool_type: str
    data: Dict[str, Any]
    created_by_id: str
    is_visible: bool
    created_at: datetime


class CaseCreate(BaseModel):
    """Schema for creating a case"""
    title: str = Field(..., min_length=1, max_length=200)
    clinical_history: Optional[str] = None
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    discussion_points: Optional[str] = None


class CaseUpdate(BaseModel):
    """Schema for updating a case"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    clinical_history: Optional[str] = None
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    discussion_points: Optional[str] = None


class CaseResponse(BaseModel):
    """Schema for case response"""
    id: str
    title: str
    clinical_history: Optional[str] = None
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    discussion_points: Optional[str] = None
    images: List[CaseImageResponse] = []
    annotations: List[CaseAnnotationResponse] = []
    created_by: str  # User ID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ImageUploadResponse(BaseModel):
    """Schema for image upload response"""
    image_id: str
    filename: str
    original_name: str
    path: str
    url: str
