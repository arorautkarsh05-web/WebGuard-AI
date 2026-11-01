import time
import httpx
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from backend.app.core.config import settings
from backend.app.services.remediation.base import BaseRemediationAdapter, RemediationResult, STATE_UNCONFIGURED

class CloudflareCDNAdapter(BaseRemediationAdapter):
    @property
    def adapter_name(self) -> str:
        return "cloudflare_cdn"

    def is_configured(self) -> bool:
        return bool(settings.CLOUDFLARE_API_TOKEN and settings.CLOUDFLARE_ZONE_ID)

    async def execute(
        self,
        parameters: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> RemediationResult:
        start_time = time.time()
        domain = parameters.get("domain", "")
        paths = parameters.get("paths", ["/*"])
        purge_all = parameters.get("purge_all", False)

        if not self.is_configured():
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status=STATE_UNCONFIGURED,
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=(
                    f"Cloudflare CDN integration is not configured. "
                    f"To enable live cache purges for {domain}, configure CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID."
                ),
                details={"domain": domain, "requested_paths": paths, "purge_all": purge_all}
            )

        endpoint = f"https://api.cloudflare.com/client/v4/zones/{settings.CLOUDFLARE_ZONE_ID}/purge_cache"
        headers = {
            "Authorization": f"Bearer {settings.CLOUDFLARE_API_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {"purge_everything": True} if purge_all else {"files": paths}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(endpoint, json=payload, headers=headers)
                elapsed_ms = (time.time() - start_time) * 1000
                data = res.json()
                if res.status_code == 200 and data.get("success"):
                    return RemediationResult(
                        success=True,
                        status="executed",
                        adapter_name=self.adapter_name,
                        duration_ms=elapsed_ms,
                        message=f"Successfully purged Cloudflare cache for {domain} ({len(paths)} path rules).",
                        details=data
                    )
                else:
                    return RemediationResult(
                        success=False,
                        status="failed",
                        adapter_name=self.adapter_name,
                        duration_ms=elapsed_ms,
                        message=f"Cloudflare API returned error: {data.get('errors')}",
                        details=data
                    )
        except Exception as e:
            elapsed_ms = (time.time() - start_time) * 1000
            return RemediationResult(
                success=False,
                status="failed",
                adapter_name=self.adapter_name,
                duration_ms=elapsed_ms,
                message=f"Network exception connecting to Cloudflare: {str(e)}",
                details={"error": str(e)}
            )

cdn_adapter = CloudflareCDNAdapter()

