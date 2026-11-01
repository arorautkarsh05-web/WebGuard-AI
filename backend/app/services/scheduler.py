import asyncio
import time
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import SessionLocal
from backend.app.models.models import MonitoringTask, Website, Competitor, RegressionTest
from backend.app.services.health_monitor import health_monitor
from backend.app.services.change_detector import change_detector
from backend.app.services.competitor_service import competitor_service
from backend.app.services.regression_service import regression_service

def acquire_distributed_lease(lock_name: str, lease_seconds: int = 45) -> bool:
    """
    Acquires a distributed lease using Redis if available.
    Guarantees that multiple backend/worker instances running against the
    same database do not trigger identical scheduled tasks concurrently.
    """
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL or "redis://localhost:6379/0", socket_timeout=1.0)
        acquired = client.set(f"webguard:lease:{lock_name}", "held", nx=True, ex=lease_seconds)
        return bool(acquired)
    except Exception:
        # If Redis is unavailable in local dev, allow execution with process-level isolation
        return True

def release_distributed_lease(lock_name: str):
    try:
        import redis
        client = redis.Redis.from_url(settings.REDIS_URL or "redis://localhost:6379/0", socket_timeout=1.0)
        client.delete(f"webguard:lease:{lock_name}")
    except Exception:
        pass

class BackgroundScheduler:
    def __init__(self):
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def start(self):
        if not settings.ENABLE_BACKGROUND_SCHEDULER:
            print("[Scheduler] Background scheduler is disabled in configuration.")
            return

        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._scheduler_loop())
            print("[Scheduler] Distributed-aware autonomous scheduler initiated.")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
            print("[Scheduler] Background scheduler gracefully stopped.")

    async def _scheduler_loop(self):
        while self._running:
            try:
                await self._run_due_jobs()
            except Exception as e:
                print(f"[Scheduler Error] Unhandled exception in background loop: {e}")
            await asyncio.sleep(settings.SCHEDULER_INTERVAL_SECONDS)

    async def _run_due_jobs(self):
        # Master loop distributed lease check
        if not acquire_distributed_lease("scheduler_master_loop", lease_seconds=settings.SCHEDULER_INTERVAL_SECONDS - 2):
            return

        db: Session = SessionLocal()
        try:
            now = datetime.now(timezone.utc)

            # 1. Due Health Monitoring Tasks with per-task distributed locking
            due_tasks = (
                db.query(MonitoringTask)
                .filter(MonitoringTask.status == "active")
                .all()
            )

            for task in due_tasks:
                task_lock = f"task_run_{task.id}"
                if not acquire_distributed_lease(task_lock, lease_seconds=120):
                    continue

                try:
                    should_run = False
                    if not task.last_run_at:
                        should_run = True
                    else:
                        interval_mins = 5
                        if task.website_id:
                            site = db.query(Website).filter(Website.id == task.website_id).first()
                            if site and site.check_frequency_minutes:
                                interval_mins = site.check_frequency_minutes

                        last_run = task.last_run_at.replace(tzinfo=timezone.utc) if task.last_run_at.tzinfo is None else task.last_run_at
                        next_due = last_run + timedelta(minutes=interval_mins)
                        if now >= next_due:
                            should_run = True

                    if should_run:
                        task.status = "running"
                        db.commit()

                        if task.task_type == "health_check" and task.website_id:
                            site = db.query(Website).filter(Website.id == task.website_id).first()
                            if site:
                                await asyncio.wait_for(
                                    health_monitor.check_website_health(site, db, task_id=task.id),
                                    timeout=30.0
                                )

                        elif task.task_type == "change_detection":
                            await asyncio.wait_for(
                                change_detector.detect_changes(task, db),
                                timeout=45.0
                            )

                        task.status = "active"
                        task.last_run_at = datetime.now(timezone.utc)
                        db.commit()

                except asyncio.TimeoutError:
                    print(f"[Scheduler] Task {task.id} execution timed out.")
                    task.status = "active"
                    db.commit()
                except Exception as task_err:
                    print(f"[Scheduler] Task {task.id} execution failed: {task_err}")
                    task.status = "failed"
                    db.commit()
                finally:
                    release_distributed_lease(task_lock)

            # 2. Due Autonomous Regression Tests
            due_regression_tests = (
                db.query(RegressionTest)
                .filter(RegressionTest.status == "active")
                .all()
            )

            for reg_test in due_regression_tests:
                reg_lock = f"reg_test_{reg_test.id}"
                if not acquire_distributed_lease(reg_lock, lease_seconds=180):
                    continue

                try:
                    should_run = False
                    if not reg_test.last_run_at:
                        should_run = True
                    else:
                        reg_last_run = reg_test.last_run_at.replace(tzinfo=timezone.utc) if reg_test.last_run_at.tzinfo is None else reg_test.last_run_at
                        next_due = reg_last_run + timedelta(minutes=reg_test.schedule_interval_minutes)
                        if now >= next_due:
                            should_run = True

                    if should_run:
                        await asyncio.wait_for(
                            regression_service.execute_regression_test(reg_test, db),
                            timeout=60.0
                        )
                except asyncio.TimeoutError:
                    print(f"[Scheduler] Regression test {reg_test.id} timed out.")
                except Exception as reg_err:
                    print(f"[Scheduler] Regression test {reg_test.id} error: {reg_err}")
                finally:
                    release_distributed_lease(reg_lock)

            # 3. Competitor Intelligence Sweeps (Hourly)
            comp_lock = "competitor_hourly_sweep"
            if acquire_distributed_lease(comp_lock, lease_seconds=3600):
                competitors = db.query(Competitor).all()
                for comp in competitors:
                    try:
                        await asyncio.wait_for(
                            competitor_service.scan_competitor(comp, db),
                            timeout=60.0
                        )
                    except Exception as comp_err:
                        print(f"[Scheduler] Competitor scan error: {comp_err}")

        finally:
            db.close()
            release_distributed_lease("scheduler_master_loop")

scheduler = BackgroundScheduler()
