from celery import Celery
from celery.schedules import crontab
from backend.app.core.config import settings

broker_url = settings.REDIS_URL or "redis://localhost:6379/0"
result_backend = settings.REDIS_URL or "redis://localhost:6379/0"

celery_app = Celery(
    "webguard_tasks",
    broker=broker_url,
    backend=result_backend,
    include=["backend.app.tasks.monitoring_tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min hard limit
    task_soft_time_limit=240,  # 4 min soft limit
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    beat_schedule={
        "periodic-health-checks": {
            "task": "backend.app.tasks.monitoring_tasks.run_scheduled_health_checks",
            "schedule": 60.0,  # Every 60 seconds
        },
        "periodic-competitor-scans": {
            "task": "backend.app.tasks.monitoring_tasks.run_scheduled_competitor_scans",
            "schedule": 900.0,  # Every 15 minutes
        },
        "periodic-regression-tests": {
            "task": "backend.app.tasks.monitoring_tasks.run_scheduled_regression_tests",
            "schedule": 1800.0,  # Every 30 minutes
        }
    }
)

