"""
Exam Management API Endpoints
CRUD operations for exams
"""
from fastapi import APIRouter, HTTPException, status, Depends
from typing import List
from datetime import datetime

from app.core.security import verify_examiner, get_current_active_user
from app.models.user import User
from app.models.exam import Exam
from app.models.case import Case
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse


router = APIRouter()


async def convert_exam_to_response(exam: Exam) -> ExamResponse:
    """Helper to convert Exam model to response schema"""
    await exam.fetch_all_links()

    # Handle Beanie Link for created_by
    if hasattr(exam.created_by, 'ref'):
        created_by_id = str(exam.created_by.ref.id)
    elif hasattr(exam.created_by, 'id'):
        created_by_id = str(exam.created_by.id)
    else:
        created_by_id = str(exam.created_by)

    return ExamResponse(
        id=str(exam.id),
        title=exam.title,
        description=exam.description,
        duration_minutes=exam.duration_minutes,
        case_ids=[str(case.id) for case in exam.cases],
        created_by=created_by_id,
        created_at=exam.created_at,
        updated_at=exam.updated_at,
        is_archived=exam.is_archived
    )


@router.post("/", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    exam_data: ExamCreate,
    current_user: User = Depends(verify_examiner)
):
    """Create a new exam (Examiner/Admin only)"""

    # Verify all cases exist
    cases = []
    for case_id in exam_data.case_ids:
        case = await Case.get(case_id)
        if not case:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Case {case_id} not found"
            )
        cases.append(case)

    # Create exam
    exam = Exam(
        title=exam_data.title,
        description=exam_data.description,
        duration_minutes=exam_data.duration_minutes,
        cases=cases,
        created_by=current_user
    )

    await exam.insert()

    return await convert_exam_to_response(exam)


@router.get("/", response_model=List[ExamResponse])
async def list_exams(
    current_user: User = Depends(get_current_active_user)
):
    """List all exams (accessible to all authenticated users)"""
    exams = await Exam.find(Exam.is_archived == False).to_list()

    return [await convert_exam_to_response(exam) for exam in exams]


@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get exam by ID"""
    exam = await Exam.get(exam_id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    return await convert_exam_to_response(exam)


@router.patch("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: str,
    exam_update: ExamUpdate,
    current_user: User = Depends(verify_examiner)
):
    """Update exam (owner or admin only)"""
    exam = await Exam.get(exam_id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    await exam.fetch_all_links()

    # Check ownership
    if current_user.role != 'admin' and str(exam.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this exam"
        )

    # Update fields
    update_data = exam_update.dict(exclude_unset=True)

    # Handle case_ids update
    if 'case_ids' in update_data:
        cases = []
        for case_id in update_data['case_ids']:
            case = await Case.get(case_id)
            if not case:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Case {case_id} not found"
                )
            cases.append(case)
        exam.cases = cases
        del update_data['case_ids']

    # Update other fields
    for field, value in update_data.items():
        setattr(exam, field, value)

    exam.updated_at = datetime.utcnow()
    await exam.save()

    return await convert_exam_to_response(exam)


@router.delete("/{exam_id}")
async def delete_exam(
    exam_id: str,
    current_user: User = Depends(verify_examiner)
):
    """Archive exam (owner or admin only)"""
    exam = await Exam.get(exam_id)

    if not exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    await exam.fetch_all_links()

    # Check ownership
    if current_user.role != 'admin' and str(exam.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this exam"
        )

    # Soft delete
    exam.is_archived = True
    await exam.save()

    return {"success": True, "message": "Exam archived"}


@router.post("/{exam_id}/clone", response_model=ExamResponse)
async def clone_exam(
    exam_id: str,
    current_user: User = Depends(verify_examiner)
):
    """Clone an exam (creates a duplicate with " (Copy)" suffix)"""
    original_exam = await Exam.get(exam_id)

    if not original_exam:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Exam not found"
        )

    await original_exam.fetch_all_links()

    # Create cloned exam
    cloned_exam = Exam(
        title=f"{original_exam.title} (Copy)",
        description=original_exam.description,
        duration_minutes=original_exam.duration_minutes,
        cases=original_exam.cases,
        created_by=current_user
    )

    await cloned_exam.insert()

    return await convert_exam_to_response(cloned_exam)
