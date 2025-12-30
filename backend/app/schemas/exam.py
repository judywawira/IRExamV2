"""
Exam Schemas for API validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class ExamCreate(BaseModel):
    """Schema for creating an exam"""
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0, le=480)  # Optional, max 8 hours
    case_ids: List[str] = Field(..., min_length=1)


class ExamUpdate(BaseModel):
    """Schema for updating an exam"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    duration_minutes: Optional[int] = Field(None, gt=0, le=480)
    case_ids: Optional[List[str]] = None


class ExamResponse(BaseModel):
    """Schema for exam response"""
    id: str
    title: str
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    case_ids: List[str]
    created_by: str  # User ID
    created_at: datetime
    updated_at: datetime
    is_archived: bool

    class Config:
        from_attributes = True
