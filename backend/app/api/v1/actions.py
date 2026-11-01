from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import AIAction, User, Incident
from backend.app.schemas.schemas import AIActionOut, AIActionApproval
from backend.app.api.deps import get_current_user
from backend.app.services.investigation_service import investigation_service

router = APIRouter()

@router.get("", response_model=List[AIActionOut])
def get_actions(
    approval_status: Optional[str] = Query(None),
    execution_status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves AI Action Center items and audit history for the current organization."""
    query = db.query(AIAction).filter(AIAction.organization_id == current_user.organization_id)
    if approval_status:
        query = query.filter(AIAction.approval_status == approval_status)
    if execution_status:
        query = query.filter(AIAction.execution_status == execution_status)
    return query.order_by(AIAction.created_at.desc()).all()

@router.get("/{action_id}", response_model=AIActionOut)
def get_action_detail(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    action = (
        db.query(AIAction)
        .filter(AIAction.id == action_id, AIAction.organization_id == current_user.organization_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")
    return action

@router.post("/{action_id}/approve", response_model=Dict[str, Any])
async def approve_and_execute_action(
    action_id: str,
    approval: AIActionApproval,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Human-in-the-Loop Approval:
    Allows authorized security engineers to approve proposed remediation actions.
    Triggers safe execution and records audit log.
    """
    action = (
        db.query(AIAction)
        .filter(AIAction.id == action_id, AIAction.organization_id == current_user.organization_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")

    if not approval.approved:
        action.approval_status = "rejected"
        db.commit()
        return {"success": True, "message": "Action rejected by user.", "status": "rejected"}

    try:
        res = await investigation_service.execute_approved_action(action, db, approved_by=current_user)
        return {
            "success": True,
            "message": "Action approved and processed.",
            "action_id": action.id,
            "execution_status": action.execution_status,
            "verification_status": action.verification_status,
            "execution_result": action.execution_result
        }
    except PermissionError as pe:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(pe))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/{action_id}/verify", response_model=Dict[str, Any])
async def verify_action_resolution(
    action_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Triggers automated verification to test whether an approved action resolved the underlying failure.
    """
    action = (
        db.query(AIAction)
        .filter(AIAction.id == action_id, AIAction.organization_id == current_user.organization_id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Action not found.")

    res = await investigation_service.execute_approved_action(action, db, approved_by=current_user)
    return {
        "success": True,
        "verification_status": action.verification_status,
        "verification_details": action.verification_details
    }

