from typing import List, Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from backend.app.core.database import get_db
from backend.app.models.models import (
    Website,
    MonitoringTask,
    MonitoringResult,
    Competitor,
    Incident,
    TinyFishExecution,
    User
)
from backend.app.schemas.schemas import DashboardOverview, DashboardActivityItem
from backend.app.api.deps import get_current_user

router = APIRouter()

@router.get("/overview", response_model=DashboardOverview)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id

    total_websites = db.query(Website).filter(Website.organization_id == org_id).count()
    healthy_websites = db.query(Website).filter(Website.organization_id == org_id, Website.health_status == "healthy").count()
    degraded_websites = db.query(Website).filter(Website.organization_id == org_id, Website.health_status == "degraded").count()
    down_websites = db.query(Website).filter(Website.organization_id == org_id, Website.health_status == "down").count()

    active_tasks = db.query(MonitoringTask).filter(MonitoringTask.organization_id == org_id, MonitoringTask.status == "active").count()
    competitors_monitored = db.query(Competitor).filter(Competitor.organization_id == org_id).count()

    critical_incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.severity == "Critical", Incident.status != "Resolved")
        .count()
    )
    open_incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.status.in_(["Open", "Investigating"]))
        .count()
    )

    # Average response time from recent successful health checks
    avg_latency = (
        db.query(func.avg(Website.last_response_time_ms))
        .filter(Website.organization_id == org_id, Website.last_response_time_ms.isnot(None))
        .scalar()
    ) or 0.0

    # Calculate overall uptime percentage
    uptime_percentage = 100.0
    if total_websites > 0:
        uptime_percentage = round((healthy_websites / total_websites) * 100, 1)

    total_changes = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id, Incident.title.contains("Change"))
        .count()
    )

    return DashboardOverview(
        total_websites=total_websites,
        healthy_websites=healthy_websites,
        degraded_websites=degraded_websites,
        down_websites=down_websites,
        active_monitoring_tasks=active_tasks,
        competitors_monitored=competitors_monitored,
        total_changes_detected=total_changes,
        critical_incidents=critical_incidents,
        open_incidents=open_incidents,
        uptime_percentage=uptime_percentage,
        average_response_time_ms=round(float(avg_latency), 2)
    )

@router.get("/activity", response_model=List[DashboardActivityItem])
def get_dashboard_activity(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org_id = current_user.organization_id
    activities = []

    # Recent Incidents
    incidents = (
        db.query(Incident)
        .filter(Incident.organization_id == org_id)
        .order_by(Incident.created_at.desc())
        .limit(10)
        .all()
    )
    for inc in incidents:
        activities.append(DashboardActivityItem(
            id=inc.id,
            type="incident",
            title=inc.title,
            description=inc.root_cause_summary or "Incident flagged by monitoring engine",
            severity=inc.severity,
            timestamp=inc.created_at
        ))

    # Recent TinyFish executions
    executions = (
        db.query(TinyFishExecution)
        .filter(TinyFishExecution.organization_id == org_id)
        .order_by(TinyFishExecution.created_at.desc())
        .limit(10)
        .all()
    )
    for ex in executions:
        activities.append(DashboardActivityItem(
            id=ex.id,
            type="tinyfish",
            title=f"TinyFish {ex.service_type.capitalize()} Execution",
            description=f"Status: {ex.status.upper()} ({round(ex.execution_time_ms or 0)}ms)",
            severity="Informational" if ex.status == "success" else "Medium",
            timestamp=ex.created_at
        ))

    activities.sort(key=lambda x: x.timestamp, reverse=True)
    return activities[:15]

@router.get("/system-status")
def get_system_status():
    """
    Returns live observability metrics for distributed workers, Redis lease locks,
    remediation adapter readiness, and AI integration services.
    """
    from backend.app.core.config import settings
    from backend.app.services.scheduler import scheduler
    from backend.app.services.llm_service import llm_service
    from backend.app.services.tinyfish_service import tinyfish_service
    from backend.app.services.remediation.cdn_adapter import cdn_adapter
    from backend.app.services.remediation.k8s_adapter import k8s_adapter
    from backend.app.services.remediation.cicd_adapter import cicd_adapter

    # Test Redis connectivity
    redis_status = "unconfigured"
    redis_connected = False
    if settings.REDIS_URL:
        try:
            import redis
            client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=0.5)
            client.ping()
            redis_status = "connected"
            redis_connected = True
        except Exception:
            redis_status = "offline"

    scheduler_mode = "distributed-redis-lease" if redis_connected else "in-process-lease (local fallback)"

    return {
        "status": "operational",
        "scheduler": {
            "mode": scheduler_mode,
            "is_running": scheduler._running,
            "interval_seconds": settings.SCHEDULER_INTERVAL_SECONDS
        },
        "redis": {
            "configured": bool(settings.REDIS_URL),
            "status": redis_status
        },
        "remediation_adapters": {
            "cloudflare_cdn": {
                "configured": cdn_adapter.is_configured(),
                "status": "ready" if cdn_adapter.is_configured() else "integration_unconfigured"
            },
            "kubernetes": {
                "configured": k8s_adapter.is_configured(),
                "status": "ready" if k8s_adapter.is_configured() else "integration_unconfigured"
            },
            "cicd_rollback": {
                "configured": cicd_adapter.is_configured(),
                "status": "ready" if cicd_adapter.is_configured() else "integration_unconfigured"
            }
        },
        "ai_services": {
            "tinyfish": {
                "configured": bool(tinyfish_service.api_key),
                "status": "connected" if bool(tinyfish_service.api_key) else "unconfigured"
            },
            "llm": {
                "configured": llm_service.is_available(),
                "provider": llm_service.get_active_provider() or "none",
                "status": "available" if llm_service.is_available() else "offline_or_unconfigured"
            }
        },
        "security": {
            "ssrf_socket_validation": "active",
            "dns_rebinding_prevention": "active",
            "max_redirect_hops": 5,
            "forbidden_networks_enforced": True
        }
    }


