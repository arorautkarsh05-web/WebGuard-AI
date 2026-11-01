from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import validate_target_url
from backend.app.models.models import MonitoringTask, MonitoringResult, Website, User
from backend.app.schemas.schemas import MonitoringTaskCreate, MonitoringTaskOut, MonitoringResultOut
from backend.app.api.deps import get_current_user
from backend.app.services.health_monitor import health_monitor
from backend.app.services.change_detector import change_detector
from backend.app.services.tinyfish_service import tinyfish_service

router = APIRouter()

@router.post("/tasks", response_model=MonitoringTaskOut)
def create_monitoring_task(
    task_in: MonitoringTaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    valid_url = validate_target_url(task_in.target_url)

    task = MonitoringTask(
        organization_id=current_user.organization_id,
        website_id=task_in.website_id,
        name=task_in.name,
        task_type=task_in.task_type,
        target_url=valid_url,
        schedule_cron=task_in.schedule_cron or "*/5 * * * *",
        config=task_in.config or {}
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.get("/tasks", response_model=List[MonitoringTaskOut])
def get_monitoring_tasks(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    tasks = (
        db.query(MonitoringTask)
        .filter(MonitoringTask.organization_id == current_user.organization_id)
        .order_by(MonitoringTask.created_at.desc())
        .all()
    )
    return tasks

@router.post("/tasks/{task_id}/run")
async def run_monitoring_task(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = (
        db.query(MonitoringTask)
        .filter(MonitoringTask.id == task_id, MonitoringTask.organization_id == current_user.organization_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Monitoring task not found.")

    if task.task_type == "health_check":
        website = db.query(Website).filter(Website.id == task.website_id).first()
        if not website:
            website = Website(
                organization_id=current_user.organization_id,
                name=task.name,
                url=task.target_url
            )
            db.add(website)
            db.commit()
            db.refresh(website)
        res = await health_monitor.check_website_health(website, db, task_id=task.id)
        return {
            "success": True,
            "task_id": task.id,
            "type": "health_check",
            "status": res.status,
            "response_time_ms": res.response_time_ms,
            "status_code": res.http_status_code
        }

    elif task.task_type == "change_detection":
        res = await change_detector.detect_changes(task, db)
        return {
            "success": True,
            "task_id": task.id,
            "type": "change_detection",
            "has_changed": res.get("has_changed", False),
            "change_type": res.get("change_type"),
            "change_summary": res.get("change_summary", []),
            "diff": res.get("diff")
        }

    elif task.task_type == "functional_test":
        goal = (task.config or {}).get("goal", "Verify homepage loads, buttons are clickable, and navigation links function.")
        agent_res = await tinyfish_service.run_agent(
            url=task.target_url,
            goal=goal,
            db=db,
            organization_id=task.organization_id
        )
        return {
            "success": agent_res.get("success", False),
            "task_id": task.id,
            "type": "functional_test",
            "agent_response": agent_res
        }

    return {"success": False, "message": f"Unsupported task type: {task.task_type}"}

@router.get("/tasks/{task_id}/results", response_model=List[MonitoringResultOut])
def get_task_results(
    task_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    task = (
        db.query(MonitoringTask)
        .filter(MonitoringTask.id == task_id, MonitoringTask.organization_id == current_user.organization_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Monitoring task not found.")

    results = (
        db.query(MonitoringResult)
        .filter(MonitoringResult.task_id == task_id)
        .order_by(MonitoringResult.created_at.desc())
        .limit(50)
        .all()
    )
    return results
