"""
Case Management API Tests
"""
import pytest


@pytest.mark.asyncio
async def test_create_case(async_client, examiner_token):
    """Test case creation"""
    response = await async_client.post(
        "/api/v1/cases",
        json={
            "title": "Test Case",
            "clinical_history": "Patient with chest pain",
            "findings": "Pneumothorax",
            "diagnosis": "Spontaneous pneumothorax"
        },
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Case"
    assert data["clinical_history"] == "Patient with chest pain"


@pytest.mark.asyncio
async def test_list_cases_examiner(async_client, examiner_token, examiner_user):
    """Test listing cases as examiner"""
    from app.models.case import Case

    # Create case owned by examiner
    case = Case(
        title="Examiner Case",
        created_by=examiner_user
    )
    await case.insert()

    response = await async_client.get(
        "/api/v1/cases",
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["title"] == "Examiner Case"


@pytest.mark.asyncio
async def test_update_case(async_client, examiner_token, examiner_user):
    """Test case update"""
    from app.models.case import Case

    # Create case
    case = Case(
        title="Original Title",
        created_by=examiner_user
    )
    await case.insert()

    # Update case
    response = await async_client.patch(
        f"/api/v1/cases/{str(case.id)}",
        json={"title": "Updated Title"},
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"


@pytest.mark.asyncio
async def test_delete_case(async_client, examiner_token, examiner_user):
    """Test case deletion"""
    from app.models.case import Case

    # Create case
    case = Case(
        title="To Delete",
        created_by=examiner_user
    )
    await case.insert()

    # Delete case
    response = await async_client.delete(
        f"/api/v1/cases/{str(case.id)}",
        headers={"Authorization": f"Bearer {examiner_token}"}
    )
    assert response.status_code == 200

    # Verify deleted
    deleted_case = await Case.get(str(case.id))
    assert deleted_case is None
