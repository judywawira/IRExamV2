"""
Session Model
Live exam session with real-time state management
"""
from beanie import Document, Link
from pydantic import Field
from datetime import datetime
from typing import List, Optional, Literal, Dict, Any


class Session(Document):
    """Session document model for live exams"""

    name: str  # Session name/identifier
    exam: Link["Exam"]  # Reference to exam
    examiner: Link["User"]  # Examiner conducting the session
    students: List[Link["User"]] = []  # Assigned students

    # Session lifecycle
    status: Literal["scheduled", "active", "paused", "completed"] = "scheduled"

    # Real-time state (server-authoritative)
    current_case_index: int = 0
    current_image_index: int = 0

    # Timing
    scheduled_start: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    resumed_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    total_pause_duration: int = 0  # In seconds

    # Archive support
    is_archived: bool = False

    # Activity tracking
    participants_online: List[str] = []  # List of user IDs currently connected

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "sessions"
        indexes = [
            "name",
            "examiner",
            "status",
            "created_at",
            "is_archived"
        ]

    def get_current_time_elapsed(self) -> int:
        """Calculate time elapsed in seconds"""
        if not self.actual_start:
            return 0

        if self.status == "completed" and self.ended_at:
            total = int((self.ended_at - self.actual_start).total_seconds())
        elif self.status == "paused" and self.paused_at:
            total = int((self.paused_at - self.actual_start).total_seconds())
        else:
            total = int((datetime.utcnow() - self.actual_start).total_seconds())

        return total - self.total_pause_duration

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Morning Session - January 2024",
                "status": "scheduled",
                "current_case_index": 0,
                "current_image_index": 0
            }
        }
