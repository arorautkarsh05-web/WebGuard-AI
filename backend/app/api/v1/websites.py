from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import validate_target_url
from backend.app.models.models import Website, MonitoringTask, MonitoringResult, User
from backend.app.schemas.schemas import WebsiteCreate, WebsiteOut, WebsiteUpdate, MonitoringResultOut
from backend.app.api.deps import get_current_user
from backend.app.services.health_monitor import health_monitor

router = APIRouter()

@router.post("", response_model=WebsiteOut)
async def create_website(
    website_in: WebsiteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce SSRF validation
    valid_url = validate_target_url(website_in.url)

    website = Website(
        organization_id=current_user.organization_id,
        name=website_in.name,
        url=valid_url,
        check_frequency_minutes=website_in.check_frequency_minutes or 5,
        settings=website_in.settings or {}
    )
    db.add(website)
    db.commit()
    db.refresh(website)

    # Automatically create default health check monitoring task
    task = MonitoringTask(
        organization_id=current_user.organization_id,
        website_id=website.id,
        name=f"Health Check - {website.name}",
        task_type="health_check",
        target_url=valid_url,
        schedule_cron=f"*/{website.check_frequency_minutes} * * * *"
    )
    db.add(task)
    db.commit()

    # Trigger initial health check asynchronously
    await health_monitor.check_website_health(website, db, task_id=task.id)
    db.refresh(website)

    return website

@router.get("", response_model=List[WebsiteOut])
def get_websites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    websites = (
        db.query(Website)
        .filter(Website.organization_id == current_user.organization_id)
        .order_by(Website.created_at.desc())
        .all()
    )
    return websites

@router.get("/{website_id}", response_model=Dict[str, Any])
def get_website_details(
    website_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    website = (
        db.query(Website)
        .filter(Website.id == website_id, Website.organization_id == current_user.organization_id)
        .first()
    )
    if not website:
        raise HTTPException(status_code=404, detail="Website not found.")

    results = (
        db.query(MonitoringResult)
        .filter(MonitoringResult.website_id == website_id)
        .order_by(MonitoringResult.created_at.desc())
        .limit(30)
        .all()
    )

    return {
        "website": WebsiteOut.model_validate(website),
        "recent_results": [
            {
                "id": r.id,
                "status": r.status,
                "response_time_ms": r.response_time_ms,
                "http_status_code": r.http_status_code,
                "created_at": r.created_at.isoformat(),
                "error_message": r.error_message
            }
            for r in results
        ]
    }

@router.post("/{website_id}/check")
async def trigger_health_check(
    website_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    website = (
        db.query(Website)
        .filter(Website.id == website_id, Website.organization_id == current_user.organization_id)
        .first()
    )
    if not website:
        raise HTTPException(status_code=404, detail="Website not found.")

    res = await health_monitor.check_website_health(website, db)
    return {
        "success": True,
        "health_status": website.health_status,
        "response_time_ms": website.last_response_time_ms,
        "status_code": website.last_status_code,
        "checked_at": website.last_checked_at.isoformat() if website.last_checked_at else None
    }

@router.delete("/{website_id}")
def delete_website(
    website_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    website = (
        db.query(Website)
        .filter(Website.id == website_id, Website.organization_id == current_user.organization_id)
        .first()
    )
    if not website:
        raise HTTPException(status_code=404, detail="Website not found.")

    db.delete(website)
    db.commit()
    return {"message": "Website deleted successfully."}
