import time
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx
from sqlalchemy.orm import Session

from backend.app.core.security import validate_target_url
from backend.app.models.models import Website, MonitoringTask, MonitoringResult, Incident

class HealthMonitorService:
    async def check_website_health(self, website: Website, db: Session, task_id: Optional[str] = None) -> MonitoringResult:
        """
        Executes HTTP health check using HTTPX.
        Monitors availability, response latency, redirects, and HTTP status codes.
        Guards against SSRF before connecting.
        """
        url = website.url
        # SSRF validation
        try:
            validate_target_url(url)
        except Exception as e:
            res = MonitoringResult(
                task_id=task_id or "",
                website_id=website.id,
                status="failed",
                response_time_ms=0,
                http_status_code=400,
                error_message=f"SSRF validation blocked request: {str(e)}",
                data={"reason": "blocked_target_url"}
            )
            website.health_status = "down"
            website.last_checked_at = datetime.now(timezone.utc)
            db.add(res)
            db.commit()
            return res

        start_time = time.time()
        redirect_history = []
        try:
            async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
                response = await client.get(url, headers={"User-Agent": "WebGuard-AI/2.0 HealthBot"})
                elapsed_ms = (time.time() - start_time) * 1000

                for r in response.history:
                    redirect_history.append({"url": str(r.url), "status": r.status_code})

                status_code = response.status_code
                
                # Health status classification
                if 200 <= status_code < 400:
                    if elapsed_ms > 3000:
                        health_status = "degraded"
                    else:
                        health_status = "healthy"
                    is_success = True
                elif 400 <= status_code < 500:
                    health_status = "degraded"
                    is_success = False
                else:
                    health_status = "down"
                    is_success = False

                website.health_status = health_status
                website.last_response_time_ms = round(elapsed_ms, 2)
                website.last_status_code = status_code
                website.last_checked_at = datetime.now(timezone.utc)

                result_data = {
                    "final_url": str(response.url),
                    "redirect_count": len(redirect_history),
                    "redirect_history": redirect_history,
                    "content_length": len(response.content),
                    "headers": dict(list(response.headers.items())[:10])
                }

                monitoring_res = MonitoringResult(
                    task_id=task_id or "",
                    website_id=website.id,
                    status="success" if is_success else "failed",
                    response_time_ms=round(elapsed_ms, 2),
                    http_status_code=status_code,
                    data=result_data,
                    error_message=None if is_success else f"HTTP Status {status_code}"
                )
                db.add(monitoring_res)

                # Generate incident if site is down or severely degraded
                if health_status == "down":
                    incident = Incident(
                        organization_id=website.organization_id,
                        website_id=website.id,
                        task_id=task_id,
                        title=f"Website Outage: {website.name} ({website.url}) returned {status_code}",
                        severity="Critical" if status_code >= 500 else "High",
                        status="Open",
                        root_cause_summary=f"The endpoint returned HTTP {status_code} during automated health inspection.",
                        evidence={
                            "url": url,
                            "status_code": status_code,
                            "latency_ms": elapsed_ms,
                            "redirect_chain": redirect_history
                        },
                        recommended_actions=[
                            "Inspect web server logs and load balancer status",
                            "Verify SSL certificate validity and reverse proxy configuration",
                            "Check upstream application service process health"
                        ]
                    )
                    db.add(incident)

                elif health_status == "degraded" and elapsed_ms > 4000:
                    incident = Incident(
                        organization_id=website.organization_id,
                        website_id=website.id,
                        task_id=task_id,
                        title=f"Degraded Performance: {website.name} latency spiked to {round(elapsed_ms)}ms",
                        severity="Medium",
                        status="Open",
                        root_cause_summary=f"Response time exceeded threshold (4000ms), currently at {round(elapsed_ms)}ms.",
                        evidence={"url": url, "latency_ms": elapsed_ms},
                        recommended_actions=[
                            "Check database connection pool and resource utilization",
                            "Review CDN cache hit ratio"
                        ]
                    )
                    db.add(incident)

                db.commit()
                db.refresh(monitoring_res)
                return monitoring_res

        except httpx.RequestError as e:
            elapsed_ms = (time.time() - start_time) * 1000
            website.health_status = "down"
            website.last_response_time_ms = round(elapsed_ms, 2)
            website.last_status_code = None
            website.last_checked_at = datetime.now(timezone.utc)

            monitoring_res = MonitoringResult(
                task_id=task_id or "",
                website_id=website.id,
                status="failed",
                response_time_ms=round(elapsed_ms, 2),
                http_status_code=None,
                error_message=str(e),
                data={"error_type": type(e).__name__}
            )
            db.add(monitoring_res)

            incident = Incident(
                organization_id=website.organization_id,
                website_id=website.id,
                task_id=task_id,
                title=f"Connection Failure: Unable to connect to {website.name}",
                severity="Critical",
                status="Open",
                root_cause_summary=f"Network connection error: {str(e)}",
                evidence={"url": url, "error": str(e)},
                recommended_actions=[
                    "Verify DNS records and nameserver availability",
                    "Verify target server firewall and port 80/443 reachability"
                ]
            )
            db.add(incident)
            db.commit()
            db.refresh(monitoring_res)
            return monitoring_res

health_monitor = HealthMonitorService()

