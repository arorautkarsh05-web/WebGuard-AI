import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any

from backend.app.tasks.celery_app import celery_app
from backend.app.core.database import SessionLocal
from backend.app.models.models import MonitoringTask, Website, Competitor, RegressionTest
from backend.app.services.health_monitor import health_monitor
from backend.app.services.change_detector import change_detector
from backend.app.services.competitor_service import competitor_service
from backend.app.services.regression_service import regression_service
from backend.app.core.config import settings

def acquire_distributed_lock(lock_key: str, timeout_seconds: int = 60) -> bool:
    """
    Acquires a distributed lock using Redis to prevent duplicate task execution.
    Returns True if acquired or if Redis is not configured/offline.
    """
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL or "redis://localhost:6379/0", socket_timeout=1.5)
        # SET NX EX
        acquired = client.set(f"webguard:lock:{lock_key}", "locked", nx=True, ex=timeout_seconds)
        return bool(acquired)
    except Exception:
        # If Redis is unavailable, fallback to DB-level locking or allow execution
        return True

def release_distributed_lock(lock_key: str):
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL or "redis://localhost:6379/0", socket_timeout=1.5)
        client.delete(f"webguard:lock:{lock_key}")
    except Exception:
        pass

@celery_app.task(bind=True, max_retries=3, default_retry_delay=15)
def run_scheduled_health_checks(self):
    """
    Distributed worker task: executes due health checks and change detections.
    Ensures idempotency and single-instance execution via distributed locks.
    """
    lock_key = "scheduled_health_checks"
    if not acquire_distributed_lock(lock_key, timeout_seconds=45):
        print("[Celery Worker] Health checks already locked by another worker instance. Skipping.")
        return {"status": "skipped", "reason": "lock_held"}

    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        due_tasks = db.query(MonitoringTask).filter(MonitoringTask.status == "active").all()
        executed_count = 0

        for task in due_tasks:
            try:
                task_lock = f"task_{task.id}"
                if not acquire_distributed_lock(task_lock, timeout_seconds=120):
                    continue

                try:
                    if task.task_type == "health_check" and task.website_id:
                        site = db.query(Website).filter(Website.id == task.website_id).first()
                        if site:
                            asyncio.run(health_monitor.check_website_health(site, db, task_id=task.id))
                            executed_count += 1
                    elif task.task_type == "change_detection":
                        asyncio.run(change_detector.detect_changes(task, db))
                        executed_count += 1

                    task.last_run_at = datetime.now(timezone.utc)
                    db.commit()
                finally:
                    release_distributed_lock(task_lock)

            except Exception as task_err:
                print(f"[Celery Worker] Error executing task {task.id}: {task_err}")
                db.rollback()

        return {"status": "completed", "executed": executed_count}

    except Exception as exc:
        # Exponential backoff retry
        countdown = 2 ** self.request.retries * 10
        raise self.retry(exc=exc, countdown=countdown)
    finally:
        db.close()
        release_distributed_lock(lock_key)

@celery_app.task(bind=True, max_retries=3, default_retry_delay=30)
def run_scheduled_competitor_scans(self):
    """Distributed worker task: sweeps competitor sites for pricing updates."""
    lock_key = "scheduled_competitor_scans"
    if not acquire_distributed_lock(lock_key, timeout_seconds=300):
        return {"status": "skipped", "reason": "lock_held"}

    db = SessionLocal()
    try:
        competitors = db.query(Competitor).all()
        scanned = 0
        for comp in competitors:
            try:
                asyncio.run(competitor_service.track_competitor(comp, db))
                scanned += 1
            except Exception as e:
                print(f"[Celery Worker] Competitor scan error on {comp.name}: {e}")
        return {"status": "completed", "scanned": scanned}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
        release_distributed_lock(lock_key)

@celery_app.task(bind=True, max_retries=2, default_retry_delay=30)
def run_scheduled_regression_tests(self):
    """Distributed worker task: executes scheduled regression tests."""
    lock_key = "scheduled_regression_tests"
    if not acquire_distributed_lock(lock_key, timeout_seconds=300):
        return {"status": "skipped", "reason": "lock_held"}

    db = SessionLocal()
    try:
        tests = db.query(RegressionTest).filter(RegressionTest.status == "active").all()
        executed = 0
        for test in tests:
            try:
                asyncio.run(regression_service.execute_regression_test(test, db))
                executed += 1
            except Exception as e:
                print(f"[Celery Worker] Regression test error on {test.id}: {e}")
        return {"status": "completed", "executed": executed}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30)
    finally:
        db.close()
        release_distributed_lock(lock_key)

