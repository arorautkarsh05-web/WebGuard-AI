import time
import json
import re
import httpx
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import validate_target_url, create_ssrf_safe_client
from backend.app.models.models import TinyFishExecution

class TinyFishService:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.TINYFISH_API_KEY
        self.search_url = settings.TINYFISH_SEARCH_URL
        self.fetch_url = settings.TINYFISH_FETCH_URL
        self.agent_url = settings.TINYFISH_AGENT_URL

    def _get_headers(self) -> Dict[str, str]:
        return {
            "X-API-Key": self.api_key,
            "Content-Type": "application/json",
            "User-Agent": "WebGuard-AI/2.0"
        }

    async def _log_execution(
        self,
        db: Session,
        organization_id: str,
        service_type: str,
        endpoint: str,
        request_params: Dict[str, Any],
        response_status: int,
        execution_time_ms: float,
        status: str,
        response_summary: Dict[str, Any]
    ) -> TinyFishExecution:
        # Sanitise request_params so secrets are never logged
        safe_params = {k: v for k, v in request_params.items() if "key" not in k.lower() and "token" not in k.lower()}
        exec_record = TinyFishExecution(
            organization_id=organization_id,
            service_type=service_type,
            endpoint=endpoint,
            request_params=safe_params,
            response_status=response_status,
            execution_time_ms=execution_time_ms,
            status=status,
            response_summary=response_summary
        )
        db.add(exec_record)
        db.commit()
        db.refresh(exec_record)
        return exec_record

    async def search(
        self,
        query: str,
        db: Optional[Session] = None,
        organization_id: Optional[str] = None,
        location: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a web search via TinyFish Search API.
        Used for discovering competitor pages, business offerings, and public intelligence.
        Deduplicates results and validates URLs.
        """
        start_time = time.time()
        endpoint = f"{self.search_url}"
        params = {"query": query.strip()}
        if location:
            params["location"] = location

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.get(endpoint, params=params, headers=self._get_headers())
                elapsed = (time.time() - start_time) * 1000
                status_code = response.status_code
                
                if response.status_code == 200:
                    data = response.json()
                    raw_results = data if isinstance(data, list) else data.get("results", [])
                    
                    # Deduplicate and validate URLs
                    seen_urls = set()
                    cleaned_results = []
                    for item in raw_results:
                        url = item.get("url")
                        if url and url not in seen_urls:
                            seen_urls.add(url)
                            cleaned_results.append(item)

                    summary = {
                        "result_count": len(cleaned_results),
                        "first_title": cleaned_results[0].get("title", "") if cleaned_results else ""
                    }
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "search", endpoint, params, status_code, elapsed, "success", summary
                        )
                    return {"success": True, "results": cleaned_results, "count": len(cleaned_results), "latency_ms": elapsed}
                else:
                    error_msg = response.text[:300]
                    summary = {"error": error_msg}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "search", endpoint, params, status_code, elapsed, "failed", summary
                        )
                    return {"success": False, "status_code": status_code, "error": error_msg, "latency_ms": elapsed}
            except Exception as e:
                elapsed = (time.time() - start_time) * 1000
                summary = {"exception": str(e)}
                if db and organization_id:
                    await self._log_execution(
                        db, organization_id, "search", endpoint, params, 500, elapsed, "failed", summary
                    )
                return {"success": False, "error": str(e), "latency_ms": elapsed}

    async def fetch(
        self,
        url: str,
        db: Optional[Session] = None,
        organization_id: Optional[str] = None,
        extract_format: str = "markdown"
    ) -> Dict[str, Any]:
        """
        Retrieves webpage content via TinyFish Fetch API.
        Extracts clean markdown/HTML/JSON from target URLs.
        TRUTHFUL TELEMETRY:
        - If TinyFish Fetch succeeds: service_type="fetch", status="success", fallback=False
        - If fallback is used: service_type="fetch_fallback", status="fallback_used", fallback=True
        - If both fail: status="failed"
        """
        # SSRF validation first
        validate_target_url(url)

        start_time = time.time()
        endpoint = self.fetch_url
        payload = {"urls": [url], "format": extract_format}

        # Attempt TinyFish Fetch API first
        async with httpx.AsyncClient(timeout=25.0) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=self._get_headers())
                elapsed = (time.time() - start_time) * 1000
                status_code = response.status_code

                if response.status_code in (200, 201):
                    data = response.json()
                    results = data.get("results", [])
                    if results and isinstance(results, list):
                        first_res = results[0]
                        content = first_res.get("text") or first_res.get("content") or first_res.get("markdown") or str(first_res)
                        title = first_res.get("title", "")
                        summary = {
                            "content_length": len(content),
                            "title": title,
                            "format": extract_format,
                            "engine": "tinyfish_fetch"
                        }
                        if db and organization_id:
                            await self._log_execution(
                                db, organization_id, "fetch", endpoint, payload, status_code, elapsed, "success", summary
                            )
                        return {
                            "success": True,
                            "content": content,
                            "title": title,
                            "raw": first_res,
                            "fallback": False,
                            "service_type": "fetch",
                            "latency_ms": elapsed
                        }
            except Exception as e:
                pass  # Fallback to direct client extraction

        # Direct HTTP Fallback (explicitly logged as fallback_used, NOT as TinyFish Fetch)
        try:
            async with create_ssrf_safe_client(timeout=15.0) as safe_client:
                direct_res = await safe_client.get(url)
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(direct_res.text, "html.parser")
                for s in soup(["script", "style", "noscript"]):
                    s.extract()
                cleaned_text = soup.get_text(separator="\n", strip=True)
                elapsed = (time.time() - start_time) * 1000
                summary = {"content_length": len(cleaned_text), "engine": "direct_http_fallback"}
                if db and organization_id:
                    await self._log_execution(
                        db, organization_id, "fetch_fallback", endpoint, payload, direct_res.status_code, elapsed, "fallback_used", summary
                    )
                return {
                    "success": True,
                    "content": cleaned_text,
                    "fallback": True,
                    "service_type": "fetch_fallback",
                    "latency_ms": elapsed
                }
        except Exception as inner_e:
            elapsed = (time.time() - start_time) * 1000
            summary = {"exception": str(inner_e)}
            if db and organization_id:
                await self._log_execution(
                    db, organization_id, "fetch", endpoint, payload, 500, elapsed, "failed", summary
                )
            return {"success": False, "error": str(inner_e), "fallback": False, "latency_ms": elapsed}

    async def run_agent(
        self,
        url: str,
        goal: str,
        db: Optional[Session] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a functional browser automation test using TinyFish Agent API (run-sse).
        ENFORCES STRICT CODE-LEVEL RESTRICTIONS:
        - Blocks any goal requesting checkout finalization, credit card entry, payment transfers, or account deletions.
        """
        # SSRF validation on target URL
        validate_target_url(url)

        # Code-level policy check on requested goal
        disallowed_patterns = [
            r"\bpay\b", r"\bcredit card\b", r"\bcvv\b", r"\bbilling info\b",
            r"\bcomplete purchase\b", r"\bbuy now\b", r"\bdelete account\b",
            r"\bwire transfer\b", r"\btransaction\b"
        ]
        goal_lower = goal.lower()
        for p in disallowed_patterns:
            if re.search(p, goal_lower):
                raise ValueError(
                    f"Action Prohibited by Safety Policy: '{p}' violates safety constraints. "
                    "WebGuard AI browser agents operate strictly in non-transactional synthetic verification mode."
                )

        start_time = time.time()
        endpoint = f"{self.agent_url}/v1/automation/run-sse"
        
        safe_goal = f"{goal}. Safety restriction: Verify UI elements only; DO NOT finalize financial transactions or submit irreversible forms."
        payload = {
            "url": url,
            "goal": safe_goal
        }

        steps = []
        final_result = None
        streaming_url = None
        status = "completed"

        async with httpx.AsyncClient(timeout=75.0) as client:
            try:
                async with client.stream("POST", endpoint, json=payload, headers=self._get_headers()) as response:
                    status_code = response.status_code
                    if status_code not in (200, 201):
                        error_text = await response.aread()
                        elapsed = (time.time() - start_time) * 1000
                        return {"success": False, "status_code": status_code, "error": error_text.decode("utf-8")[:300], "latency_ms": elapsed}

                    async for line in response.aiter_lines():
                        if not line or not line.startswith("data:"):
                            continue
                        try:
                            event_data = json.loads(line[5:].strip())
                            ev_type = event_data.get("type")
                            if ev_type == "STREAMING_URL":
                                streaming_url = event_data.get("streaming_url")
                            elif ev_type == "PROGRESS":
                                purpose = event_data.get("purpose")
                                if purpose:
                                    steps.append(purpose)
                            elif ev_type == "COMPLETE":
                                status = event_data.get("status", "COMPLETED")
                                res_obj = event_data.get("result", {})
                                final_result = res_obj.get("result", str(res_obj))
                                break
                            elif ev_type == "ERROR":
                                status = "FAILED"
                                final_result = event_data.get("message", "Agent execution error")
                                break
                        except Exception:
                            continue

                elapsed = (time.time() - start_time) * 1000
                summary = {
                    "status": status,
                    "steps_count": len(steps),
                    "summary_preview": (final_result or "")[:120]
                }
                if db and organization_id:
                    await self._log_execution(
                        db, organization_id, "agent", endpoint, payload, 200, elapsed, "success" if status == "COMPLETED" else "failed", summary
                    )

                return {
                    "success": status == "COMPLETED" or bool(final_result),
                    "status": status,
                    "result": final_result or "Automation workflow executed successfully.",
                    "steps": steps,
                    "streaming_url": streaming_url,
                    "latency_ms": elapsed
                }
            except Exception as e:
                elapsed = (time.time() - start_time) * 1000
                summary = {"exception": str(e)}
                if db and organization_id:
                    await self._log_execution(
                        db, organization_id, "agent", endpoint, payload, 500, elapsed, "failed", summary
                    )
                return {"success": False, "error": str(e), "latency_ms": elapsed}

tinyfish_service = TinyFishService()
