from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.models.models import Incident, User
from backend.app.schemas.schemas import IncidentOut, IncidentStatusUpdate
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("", response_model=List[IncidentOut])
def get_incidents(
    severity: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Incident).filter(Incident.organization_id == current_user.organization_id)
    if severity:
        query = query.filter(Incident.severity == severity)
    if status:
        query = query.filter(Incident.status == status)
    incidents = query.order_by(Incident.created_at.desc()).all()
    return incidents

@router.get("/{incident_id}", response_model=IncidentOut)
def get_incident_detail(
    incident_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.organization_id == current_user.organization_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    return incident

@router.patch("/{incident_id}/status", response_model=IncidentOut)
def update_incident_status(
    incident_id: str,
    status_update: IncidentStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    incident = (
        db.query(Incident)
        .filter(Incident.id == incident_id, Incident.organization_id == current_user.organization_id)
        .first()
    )
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")

    valid_statuses = {"Open", "Investigating", "Resolved", "False_Positive"}
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    incident.status = status_update.status
    if status_update.status == "Resolved":
        incident.resolved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(incident)
    return incident
