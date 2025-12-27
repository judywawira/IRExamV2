"""
Session Management API Endpoints
CRUD operations for exam sessions
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime

from app.core.security import verify_examiner, get_current_active_user
from app.models.user import User
from app.models.session import Session
from app.models.exam import Exam
from app.schemas.session import SessionCreate, SessionUpdate, SessionResponse


router = APIRouter()


async def convert_session_to_response(session: Session) -> SessionResponse:
    """Helper to convert Session model to response schema"""
    await session.fetch_all_links()

    # Helper function to safely extract ID from Link or object
    def get_id(obj):
        if hasattr(obj, 'ref'):
            return str(obj.ref.id)
        elif hasattr(obj, 'id'):
            return str(obj.id)
        else:
            return str(obj)

    return SessionResponse(
        id=str(session.id),
        name=session.name,
        exam_id=get_id(session.exam),
        examiner_id=get_id(session.examiner),
        student_ids=[get_id(s) for s in session.students],
        status=session.status,
        current_case_index=session.current_case_index,
        current_image_index=session.current_image_index,
        scheduled_start=session.scheduled_start,
        actual_start=session.actual_start,
        paused_at=session.paused_at,
        resumed_at=session.resumed_at,
        ended_at=session.ended_at,
        total_pause_duration=session.total_pause_duration,
        is_archived=session.is_archived,
        created_at=session.created_at,
        updated_at=session.updated_at
    )


@router.post("/", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    session_data: SessionCreate,
    current_user: User = Depends(verify_examiner)
):
    """Create a new session (Examiner/Admin only)"""

    # Verify exam exists
    exam = await Exam.get(session_data.exam_id)
    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    # Verify all students exist
    students = []
    for student_id in session_data.student_ids:
        student = await User.get(student_id)
        if not student or student.role != 'student':
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Student {student_id} not found"
            )
        students.append(student)

    # Create session
    session = Session(
        name=session_data.name,
        exam=exam,
        examiner=current_user,
        students=students,
        scheduled_start=session_data.scheduled_start
    )

    await session.insert()

    return await convert_session_to_response(session)


@router.get("/", response_model=List[SessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_active_user)
):
    """
    List sessions
    - Examiners see their own sessions
    - Students see their assigned sessions
    - Admins see all sessions
    """
    if current_user.role == 'admin':
        sessions = await Session.find(Session.is_archived == False).to_list()
    elif current_user.role == 'examiner':
        sessions = await Session.find(
            Session.examiner.ref.id == current_user.id,
            Session.is_archived == False
        ).to_list()
    else:  # student
        # Find sessions where user is in students list
        all_sessions = await Session.find(Session.is_archived == False).to_list()
        sessions = []
        for session in all_sessions:
            await session.fetch_all_links()
            student_ids = [str(s.ref.id) for s in session.students]
            if str(current_user.id) in student_ids:
                sessions.append(session)

    return [await convert_session_to_response(session) for session in sessions]


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get session by ID"""
    session = await Session.get(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await session.fetch_all_links()

    # Check authorization
    if current_user.role == 'student':
        student_ids = [str(s.ref.id) for s in session.students]
        if str(current_user.id) not in student_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session"
            )
    elif current_user.role == 'examiner':
        if str(session.examiner.ref.id) != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session"
            )

    return await convert_session_to_response(session)


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    session_update: SessionUpdate,
    current_user: User = Depends(verify_examiner)
):
    """Update session (owner or admin only)"""
    session = await Session.get(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await session.fetch_all_links()

    # Check ownership
    if current_user.role != 'admin' and str(session.examiner.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this session"
        )

    # Cannot update active session
    if session.status in ['active', 'paused']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update active or paused session"
        )

    # Update fields
    update_data = session_update.dict(exclude_unset=True)

    # Handle student_ids update
    if 'student_ids' in update_data:
        students = []
        for student_id in update_data['student_ids']:
            student = await User.get(student_id)
            if not student or student.role != 'student':
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Student {student_id} not found"
                )
            students.append(student)
        session.students = students
        del update_data['student_ids']

    # Update other fields
    for field, value in update_data.items():
        setattr(session, field, value)

    session.updated_at = datetime.utcnow()
    await session.save()

    return await convert_session_to_response(session)


@router.delete("/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(verify_examiner)
):
    """
    Delete/Archive session (owner or admin only)
    Smart delete: archives if students are assigned
    """
    session = await Session.get(session_id)

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    await session.fetch_all_links()

    # Check ownership
    if current_user.role != 'admin' and str(session.examiner.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this session"
        )

    # Smart delete: archive if students assigned
    if len(session.students) > 0:
        session.is_archived = True
        await session.save()
        return {"success": True, "message": "Session archived (has assigned students)"}
    else:
        await session.delete()
        return {"success": True, "message": "Session deleted"}
