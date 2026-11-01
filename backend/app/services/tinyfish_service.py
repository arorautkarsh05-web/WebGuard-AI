import time
import httpx
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.app.core.config import settings
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
        # Sanitise request_params so no secret keys are logged
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
        """
        start_time = time.time()
        endpoint = f"{self.search_url}"
        params = {"query": query}
        if location:
            params["location"] = location

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.get(endpoint, params=params, headers=self._get_headers())
                elapsed = (time.time() - start_time) * 1000
                status_code = response.status_code
                
                if response.status_code == 200:
                    data = response.json()
                    results = data if isinstance(data, list) else data.get("results", [])
                    summary = {
                        "result_count": len(results),
                        "first_title": results[0].get("title", "") if results else ""
                    }
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "search", endpoint, params, status_code, elapsed, "success", summary
                        )
                    return {"success": True, "results": results, "count": len(results), "latency_ms": elapsed}
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
        Fallback to direct safe fetch with BeautifulSoup if fetch endpoint has specialized payload structure.
        """
        start_time = time.time()
        endpoint = self.fetch_url
        payload = {"url": url, "format": extract_format}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Try TinyFish Fetch API
                response = await client.post(endpoint, json=payload, headers=self._get_headers())
                elapsed = (time.time() - start_time) * 1000
                status_code = response.status_code

                if response.status_code in (200, 201):
                    data = response.json()
                    content = data.get("content", data.get("markdown", data.get("text", str(data))))
                    summary = {"content_length": len(content), "format": extract_format}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "fetch", endpoint, payload, status_code, elapsed, "success", summary
                        )
                    return {"success": True, "content": content, "raw": data, "latency_ms": elapsed}
                else:
                    # If fetch API returns non-200 or isn't accessible, perform direct content extraction
                    # while logging execution
                    direct_res = await client.get(url, headers={"User-Agent": "WebGuard-AI/2.0"}, follow_redirects=True)
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(direct_res.text, "html.parser")
                    # Remove script & style tags
                    for s in soup(["script", "style", "noscript"]):
                        s.extract()
                    cleaned_text = soup.get_text(separator="\n", strip=True)
                    summary = {"content_length": len(cleaned_text), "fallback": True}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "fetch", endpoint, payload, direct_res.status_code, elapsed, "success", summary
                        )
                    return {"success": True, "content": cleaned_text, "fallback": True, "latency_ms": elapsed}
            except Exception as e:
                elapsed = (time.time() - start_time) * 1000
                # Fallback to direct client fetch
                try:
                    direct_res = await client.get(url, headers={"User-Agent": "WebGuard-AI/2.0"}, follow_redirects=True)
                    from bs4 import BeautifulSoup
                    soup = BeautifulSoup(direct_res.text, "html.parser")
                    for s in soup(["script", "style", "noscript"]):
                        s.extract()
                    cleaned_text = soup.get_text(separator="\n", strip=True)
                    summary = {"content_length": len(cleaned_text), "fallback": True}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "fetch", endpoint, payload, direct_res.status_code, elapsed, "success", summary
                        )
                    return {"success": True, "content": cleaned_text, "fallback": True, "latency_ms": elapsed}
                except Exception as inner_e:
                    summary = {"exception": str(inner_e)}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "fetch", endpoint, payload, 500, elapsed, "failed", summary
                        )
                    return {"success": False, "error": str(inner_e), "latency_ms": elapsed}

    async def run_agent(
        self,
        url: str,
        goal: str,
        db: Optional[Session] = None,
        organization_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Executes a functional browser automation test using TinyFish Agent API.
        Enforces PRD Rule: Must stop before making purchases or irreversible transactions.
        """
        start_time = time.time()
        endpoint = f"{self.agent_url}/v1/automation/run"
        
        # Enforce safety constraints in goal prompt
        safe_goal = f"{goal}. Safety rule: DO NOT enter real payment info or finalize any financial transaction or irreversible deletion."
        payload = {
            "url": url,
            "goal": safe_goal
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(endpoint, json=payload, headers=self._get_headers())
                elapsed = (time.time() - start_time) * 1000
                status_code = response.status_code

                if response.status_code in (200, 201):
                    data = response.json()
                    summary = {
                        "status": data.get("status", "completed"),
                        "steps_completed": len(data.get("steps", []))
                    }
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "agent", endpoint, payload, status_code, elapsed, "success", summary
                        )
                    return {
                        "success": True,
                        "status": data.get("status", "completed"),
                        "result": data.get("result", data),
                        "steps": data.get("steps", []),
                        "latency_ms": elapsed
                    }
                else:
                    error_msg = response.text[:300]
                    # If agent API returned rate limit or error, synthesize functional verification report
                    summary = {"error": error_msg}
                    if db and organization_id:
                        await self._log_execution(
                            db, organization_id, "agent", endpoint, payload, status_code, elapsed, "failed", summary
                        )
                    return {
                        "success": False,
                        "status_code": status_code,
                        "error": error_msg,
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
