import time
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from backend.app.models.models import Incident, Website, MonitoringResult, AIAction
from backend.app.services.health_monitor import health_monitor
from backend.app.services.tinyfish_service import tinyfish_service

class RemediationVerifier:
    """
    Automated Post-Remediation Verification Engine:
    1. Runs real probe against affected endpoint.
    2. Compares post-remediation metrics with pre-remediation metrics.
    3. Runs TinyFish browser workflow verification if applicable.
    4. Marks incident resolved only when all verification criteria pass.
    """
    async def verify_remediation(
        self,
        target_url: str,
        pre_status_code: int = 500,
        pre_latency_ms: float = 0.0,
        verify_browser: bool = False
    ):
        """Direct comparative verification helper for unit testing and independent checks."""
        from backend.app.core.security import create_ssrf_safe_client
        start_time = time.time()
        async with create_ssrf_safe_client(timeout=10.0) as client:
            resp = await client.get(target_url)
            post_status = resp.status_code
            post_latency = (time.time() - start_time) * 1000

        verified = (post_status == 200)
        summary = "Resolved: target returned 200 OK." if verified else f"Failed: target returned {post_status}."
        details = {
            "pre_status_code": pre_status_code,
            "post_status_code": post_status,
            "pre_latency_ms": pre_latency_ms,
            "post_latency_ms": round(post_latency, 1)
        }
        return verified, summary, details

    async def verify_action_resolution(
        self,
        action: AIAction,
        db: Session
    ) -> Dict[str, Any]:
        incident: Optional[Incident] = None
        if action.incident_id:
            incident = db.query(Incident).filter(Incident.id == action.incident_id).first()

        website: Optional[Website] = None
        if incident and incident.website_id:
            website = db.query(Website).filter(Website.id == incident.website_id).first()

        target_url = (
            (action.parameters or {}).get("target_url")
            or (incident.evidence or {}).get("url")
            or (website.url if website else None)
        )

        if not target_url:
            return {
                "verified": False,
                "status": "inconclusive",
                "message": "No target URL available to perform post-action verification."
            }

        # 1. Fetch pre-remediation failure baseline
        pre_metrics = (incident.evidence or {}) if incident else {}
        pre_status = pre_metrics.get("http_status_code") or pre_metrics.get("status_code") or 500

        # 2. Execute new health check probe
        start_time = time.time()
        probe_res = None
        if website:
            probe_res = await health_monitor.check_website_health(website, db)
            post_status = probe_res.http_status_code
            post_latency = probe_res.response_time_ms
            post_health = website.health_status
        else:
            from backend.app.core.security import create_ssrf_safe_client
            async with create_ssrf_safe_client(timeout=10.0) as client:
                resp = await client.get(target_url)
                post_status = resp.status_code
                post_latency = (time.time() - start_time) * 1000
                post_health = "healthy" if resp.status_code == 200 else "degraded"

        # 3. Browser Replay Verification (if TinyFish API available and incident is critical/high)
        browser_verified = None
        if tinyfish_service.api_key and incident and incident.severity.upper() in ("CRITICAL", "HIGH"):
            try:
                agent_res = await tinyfish_service.run_agent(
                    url=target_url,
                    goal=f"Post-remediation check: Verify that {target_url} loads without errors and primary navigation is clickable.",
                    db=db,
                    organization_id=action.organization_id
                )
                browser_verified = agent_res.get("success", False)
            except Exception:
                browser_verified = False

        # 4. Comparative Evaluation
        is_recovered = (post_status == 200) and (post_health == "healthy")
        if browser_verified is not None:
            is_recovered = is_recovered and browser_verified

        verification_details = {
            "pre_remediation_status": pre_status,
            "post_remediation_status": post_status,
            "post_remediation_latency_ms": round(post_latency, 1) if post_latency else None,
            "browser_workflow_verified": browser_verified,
            "verified_at": datetime.now(timezone.utc).isoformat()
        }

        if is_recovered:
            action.verification_status = "verified_resolved"
            action.verified_at = datetime.now(timezone.utc)
            action.verification_details = {
                **verification_details,
                "message": f"Endpoint recovered successfully: HTTP {post_status} observed with {post_latency:.1f}ms latency."
            }
            if incident:
                incident.status = "Resolved"
                incident.resolved_at = datetime.now(timezone.utc)
                incident.root_cause_summary = f"{incident.root_cause_summary or ''} [Remediated & Verified via {action.action_type}]"
            db.commit()
            return {"verified": True, "status": "verified_resolved", "details": action.verification_details}
        else:
            action.verification_status = "still_failing"
            action.verified_at = datetime.now(timezone.utc)
            action.verification_details = {
                **verification_details,
                "message": f"Verification failed: Endpoint still returned status {post_status} (Expected 200 OK)."
            }
            db.commit()
            return {"verified": False, "status": "still_failing", "details": action.verification_details}

verifier = RemediationVerifier()
