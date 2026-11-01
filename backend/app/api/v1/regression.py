from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import validate_target_url
from backend.app.models.models import RegressionTest, User
from backend.app.schemas.schemas import RegressionTestCreate, RegressionTestOut
from backend.app.api.deps import get_current_user
from backend.app.services.regression_service import regression_service

router = APIRouter()

@router.get("", response_model=List[RegressionTestOut])
def get_regression_tests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all reusable regression test funnels for the current organization."""
    return (
        db.query(RegressionTest)
        .filter(RegressionTest.organization_id == current_user.organization_id)
        .order_by(RegressionTest.created_at.desc())
        .all()
    )

@router.post("", response_model=RegressionTestOut)
def create_regression_test(
    test_in: RegressionTestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Registers a reusable synthetic regression test objective with schedule interval."""
    valid_url = validate_target_url(test_in.target_url)

    test = RegressionTest(
        organization_id=current_user.organization_id,
        website_id=test_in.website_id,
        name=test_in.name,
        objective=test_in.objective,
        target_url=valid_url,
        frequency_minutes=test_in.frequency_minutes or 60,
        status="active",
        last_run_status="pending"
    )
    db.add(test)
    db.commit()
    db.refresh(test)
    return test

@router.post("/{test_id}/run", response_model=Dict[str, Any])
async def run_regression_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Executes a regression test on demand via TinyFish browser automation."""
    test = (
        db.query(RegressionTest)
        .filter(RegressionTest.id == test_id, RegressionTest.organization_id == current_user.organization_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Regression test not found.")

    res = await regression_service.execute_regression_test(test, db)
    return res

@router.delete("/{test_id}")
def delete_regression_test(
    test_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    test = (
        db.query(RegressionTest)
        .filter(RegressionTest.id == test_id, RegressionTest.organization_id == current_user.organization_id)
        .first()
    )
    if not test:
        raise HTTPException(status_code=404, detail="Regression test not found.")

    db.delete(test)
    db.commit()
    return {"message": "Regression test deleted successfully."}

