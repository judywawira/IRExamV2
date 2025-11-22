"""
Case Management API Endpoints
CRUD operations for medical cases with image upload
"""
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import List
import os
import uuid
from datetime import datetime

from app.core.security import verify_examiner, get_current_active_user, verify_admin
from app.core.config import settings
from app.models.user import User
from app.models.case import Case, CaseImage, CaseAnnotation
from app.schemas.case import (
    CaseCreate,
    CaseUpdate,
    CaseResponse,
    CaseImageResponse,
    CaseAnnotationResponse,
    ImageUploadResponse
)


router = APIRouter()


def convert_case_to_response(case: Case) -> CaseResponse:
    """Helper to convert Case model to response schema"""
    return CaseResponse(
        id=str(case.id),
        title=case.title,
        clinical_history=case.clinical_history,
        findings=case.findings,
        diagnosis=case.diagnosis,
        discussion_points=case.discussion_points,
        images=[
            CaseImageResponse(**img.dict())
            for img in case.images
        ],
        annotations=[
            CaseAnnotationResponse(**ann.dict())
            for ann in case.annotations
        ],
        created_by=str(case.created_by.ref.id),
        created_at=case.created_at,
        updated_at=case.updated_at
    )


@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
async def create_case(
    case_data: CaseCreate,
    current_user: User = Depends(verify_examiner)
):
    """Create a new case (Examiner/Admin only)"""
    case = Case(
        title=case_data.title,
        clinical_history=case_data.clinical_history,
        findings=case_data.findings,
        diagnosis=case_data.diagnosis,
        discussion_points=case_data.discussion_points,
        created_by=current_user
    )

    await case.insert()

    return convert_case_to_response(case)


@router.get("/", response_model=List[CaseResponse])
async def list_cases(
    current_user: User = Depends(get_current_active_user)
):
    """
    List cases
    - Examiners see only their own cases
    - Admins see all cases
    """
    if current_user.role == 'admin':
        cases = await Case.find_all().to_list()
    else:
        cases = await Case.find(Case.created_by.ref.id == current_user.id).to_list()

    return [convert_case_to_response(case) for case in cases]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(
    case_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get case by ID"""
    case = await Case.get(case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership for non-admins
    if current_user.role != 'admin' and str(case.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this case"
        )

    return convert_case_to_response(case)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(
    case_id: str,
    case_update: CaseUpdate,
    current_user: User = Depends(verify_examiner)
):
    """Update case (owner or admin only)"""
    case = await Case.get(case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if current_user.role != 'admin' and str(case.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this case"
        )

    # Update fields
    update_data = case_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    case.updated_at = datetime.utcnow()
    await case.save()

    return convert_case_to_response(case)


@router.delete("/{case_id}")
async def delete_case(
    case_id: str,
    current_user: User = Depends(verify_examiner)
):
    """Delete case (owner or admin only)"""
    case = await Case.get(case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if current_user.role != 'admin' and str(case.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this case"
        )

    # Delete associated images from filesystem
    for image in case.images:
        try:
            os.remove(image.path)
        except FileNotFoundError:
            pass

    await case.delete()

    return {"success": True, "message": "Case deleted"}


@router.post("/{case_id}/images", response_model=ImageUploadResponse)
async def upload_case_image(
    case_id: str,
    file: UploadFile = File(...),
    description: str = None,
    current_user: User = Depends(verify_examiner)
):
    """Upload image to case"""
    case = await Case.get(case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if current_user.role != 'admin' and str(case.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this case"
        )

    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only JPEG and PNG images are allowed"
        )

    # Validate file size
    contents = await file.read()
    if len(contents) > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {settings.MAX_FILE_SIZE} bytes"
        )

    # Generate unique filename
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)

    # Save file
    with open(file_path, "wb") as f:
        f.write(contents)

    # Create image record
    case_image = CaseImage(
        filename=unique_filename,
        original_name=file.filename,
        path=file_path,
        mimetype=file.content_type,
        size=len(contents),
        description=description
    )

    case.images.append(case_image)
    case.updated_at = datetime.utcnow()
    await case.save()

    return ImageUploadResponse(
        image_id=case_image.id,
        filename=case_image.filename,
        original_name=case_image.original_name,
        path=case_image.path,
        url=f"/uploads/{unique_filename}"
    )


@router.delete("/{case_id}/images/{image_id}")
async def delete_case_image(
    case_id: str,
    image_id: str,
    current_user: User = Depends(verify_examiner)
):
    """Delete image from case"""
    case = await Case.get(case_id)

    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found"
        )

    # Check ownership
    if current_user.role != 'admin' and str(case.created_by.ref.id) != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to modify this case"
        )

    # Find and remove image
    image_to_delete = None
    for img in case.images:
        if img.id == image_id:
            image_to_delete = img
            break

    if not image_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Remove file from filesystem
    try:
        os.remove(image_to_delete.path)
    except FileNotFoundError:
        pass

    # Remove from case
    case.images.remove(image_to_delete)
    case.updated_at = datetime.utcnow()
    await case.save()

    return {"success": True, "message": "Image deleted"}
