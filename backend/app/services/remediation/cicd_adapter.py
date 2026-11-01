import time
import json
import uuid
import hmac
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.core.config import settings
from backend.app.core.security import validate_target_url, create_ssrf_safe_client
from backend.app.services.remediation.base import BaseRemediationAdapter, RemediationResult, STATE_UNCONFIGURED

class CICDRollbackAdapter(BaseRemediationAdapter):
    @property
    def adapter_name(self) -> str:
        return "cicd_webhook_rollback"

    def is_configured(self) -> bool:
        return bool(settings.CICD_ROLLBACK_WEBHOOK_URL)

    def _compute_hmac_signature(self, payload_bytes: bytes, secret: str) -> str:
        sig = hmac.new(secret.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
        return f"sha256={sig}"

    async def execute(
        self,
        parameters: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> RemediationResult:
        start_time = time.time()
        service_name = parameters.get("service_name", "web-application")
        target_revision = parameters.get("rollback_target_revision", "previous-stable")
        webhook_url = parameters.get("webhook_url") or settings.CICD_ROLLBACK_WEBHOOK_URL

        # Validate webhook target URL against SSRF first if provided
        if webhook_url:
            try:
                validate_target_url(webhook_url)
            except Exception as e:
                elapsed_ms = (time.time() - start_time) * 1000
                return RemediationResult(
                    success=False,
                    status="failed",
                    adapter_name=self.adapter_name,
                    duration_ms=elapsed_ms,
                    message=f"SSRF validation blocked target webhook URL: {e}",
                    details={"webhook_url": webhook_url}
                )

        if not self.is_configured() and not parameters.get("webhook_url"):
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status=STATE_UNCONFIGURED,
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=(
                    "CI/CD rollback webhook is unconfigured (CICD_ROLLBACK_WEBHOOK_URL is not set). "
                    "Cannot trigger external build rollback."
                ),
                details={"service_name": service_name, "target_revision": target_revision}
            )

        nonce = str(uuid.uuid4())
        timestamp_str = datetime.now(timezone.utc).isoformat()
        payload = {
            "event": "REVERT_DEPLOYMENT",
            "service": service_name,
            "target_revision": target_revision,
            "timestamp": timestamp_str,
            "nonce": nonce,
            "idempotency_key": idempotency_key or nonce
        }
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")

        headers = {
            "Content-Type": "application/json",
            "X-WebGuard-Timestamp": timestamp_str,
            "X-WebGuard-Nonce": nonce
        }

        if settings.CICD_WEBHOOK_SECRET:
            sig = hmac.new(settings.CICD_WEBHOOK_SECRET.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
            headers["X-WebGuard-Signature"] = f"sha256={sig}"

        try:
            async with create_ssrf_safe_client(timeout=15.0) as client:
                res = await client.post(webhook_url, content=payload_bytes, headers=headers)
                elapsed_ms = (time.time() - start_time) * 1000
                if res.status_code in (200, 201, 202, 204):
                    return RemediationResult(
                        success=True,
                        status="executed",
                        adapter_name=self.adapter_name,
                        duration_ms=elapsed_ms,
                        message=f"Dispatched verified signed rollback webhook to CI/CD pipeline (HTTP {res.status_code}).",
                        details={"status_code": res.status_code, "response_preview": res.text[:200]}
                    )
                else:
                    return RemediationResult(
                        success=False,
                        status="failed",
                        adapter_name=self.adapter_name,
                        duration_ms=elapsed_ms,
                        message=f"CI/CD rollback webhook returned status {res.status_code}: {res.text[:200]}",
                        details={"status_code": res.status_code}
                    )
        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status="failed",
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=f"Error dispatching CI/CD rollback webhook: {str(e)}",
                details={"error": str(e)}
            )

cicd_adapter = CICDRollbackAdapter()
