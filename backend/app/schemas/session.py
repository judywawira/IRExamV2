"""
Session Schemas for API validation
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List, Literal


class SessionCreate(BaseModel):
    """Schema for creating a session"""
    name: str = Field(..., min_length=1, max_length=200)
    exam_id: str
    student_ids: List[str] = []
    scheduled_start: Optional[datetime] = None


class SessionUpdate(BaseModel):
    """Schema for updating a session"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    student_ids: Optional[List[str]] = None
    scheduled_start: Optional[datetime] = None


class SessionResponse(BaseModel):
    """Schema for session response"""
    id: str
    name: str
    exam_id: str
    examiner_id: str
    student_ids: List[str]
    status: Literal["scheduled", "active", "paused", "completed"]
    current_case_index: int
    current_image_index: int
    scheduled_start: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    resumed_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    total_pause_duration: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionStateSnapshot(BaseModel):
    """Real-time session state for WebSocket sync"""
    session_id: str
    status: Literal["scheduled", "active", "paused", "completed"]
    current_case_index: int
    current_image_index: int
    time_elapsed: int  # Seconds
    duration_minutes: int
    is_paused: bool
    participants_online: List[str]
