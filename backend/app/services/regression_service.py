import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from bs4 import BeautifulSoup

from backend.app.models.models import RegressionTest, User, Website
from backend.app.services.tinyfish_service import tinyfish_service
from backend.app.core.security import create_ssrf_safe_client, validate_target_url

class RegressionService:
    async def execute_regression_test(
        self,
        test: RegressionTest,
        db: Session
    ) -> Dict[str, Any]:
        """
        Executes an autonomous synthetic regression test.
        Uses TinyFish Agent for real browser automation when available.
        Falls back to deep HTTP DOM inspection if API is unconfigured/offline,
        always clearly distinguishing the execution engine.
        """
        start_time = time.time()
        url = test.target_url
        objective = test.objective

        # Validate URL for SSRF
        validate_target_url(url)

        # Attempt TinyFish Browser Agent Execution first
        if tinyfish_service.api_key:
            try:
                agent_res = await tinyfish_service.run_agent(
                    url=url,
                    goal=objective,
                    db=db,
                    organization_id=test.organization_id
                )

                elapsed_ms = (time.time() - start_time) * 1000
                test.last_run_at = datetime.now(timezone.utc)
                test.last_duration_ms = round(elapsed_ms, 2)

                if agent_res.get("success"):
                    test.last_run_status = "passed"
                    test.failed_step = None
                    test.evidence = {
                        "runner_type": "tinyfish-cloud-browser",
                        "steps": agent_res.get("steps", []),
                        "result_summary": agent_res.get("result"),
                        "streaming_url": agent_res.get("streaming_url"),
                        "duration_ms": elapsed_ms
                    }
                else:
                    error = agent_res.get("error", "Workflow execution failed")
                    if "timeout" in error.lower() or "500" in str(agent_res.get("status_code", "")):
                        test.last_run_status = "unavailable"
                    elif "captcha" in error.lower() or "verification" in error.lower():
                        test.last_run_status = "inconclusive"
                    else:
                        test.last_run_status = "failed"

                    test.failed_step = error
                    test.evidence = {
                        "runner_type": "tinyfish-cloud-browser",
                        "error": error,
                        "steps": agent_res.get("steps", []),
                        "duration_ms": elapsed_ms
                    }

                db.commit()
                db.refresh(test)

                return {
                    "success": test.last_run_status == "passed",
                    "status": test.last_run_status,
                    "runner_type": "tinyfish-cloud-browser",
                    "duration_ms": elapsed_ms,
                    "failed_step": test.failed_step,
                    "evidence": test.evidence
                }

            except Exception as e:
                # If safety exception or network exception, fall through or record
                if "Safety Policy" in str(e):
                    elapsed_ms = (time.time() - start_time) * 1000
                    test.last_run_at = datetime.now(timezone.utc)
                    test.last_duration_ms = round(elapsed_ms, 2)
                    test.last_run_status = "failed"
                    test.failed_step = str(e)
                    test.evidence = {"runner_type": "policy_block", "error": str(e)}
                    db.commit()
                    return {"success": False, "status": "failed", "error": str(e)}

        # Deterministic HTTP DOM Regression Fallback
        try:
            async with create_ssrf_safe_client(timeout=15.0) as client:
                resp = await client.get(url)
                elapsed_ms = (time.time() - start_time) * 1000
                test.last_run_at = datetime.now(timezone.utc)
                test.last_duration_ms = round(elapsed_ms, 2)

                soup = BeautifulSoup(resp.text, "html.parser")
                for s in soup(["script", "style"]):
                    s.extract()
                page_text = soup.get_text().lower()

                # Keyword assertion heuristic from objective
                target_keywords = [
                    w.strip().lower() for w in objective.replace("Verify", "").replace("Check", "").split()
                    if len(w) > 3 and w.lower() not in ("page", "present", "visible", "that", "with")
                ]
                matched_keywords = [kw for kw in target_keywords if kw in page_text]
                is_passed = resp.status_code == 200 and (len(matched_keywords) > 0 or not target_keywords)

                test.last_run_status = "passed" if is_passed else "failed"
                test.failed_step = None if is_passed else f"HTTP Status {resp.status_code} or keywords not matched: {target_keywords}"
                test.evidence = {
                    "runner_type": "http-synthetic-fallback",
                    "status_code": resp.status_code,
                    "matched_keywords": matched_keywords,
                    "duration_ms": elapsed_ms,
                    "note": "Static DOM assertion executed because TinyFish browser automation was bypassed or unconfigured."
                }
                db.commit()
                db.refresh(test)

                return {
                    "success": is_passed,
                    "status": test.last_run_status,
                    "runner_type": "http-synthetic-fallback",
                    "duration_ms": elapsed_ms,
                    "failed_step": test.failed_step,
                    "evidence": test.evidence
                }
        except Exception as fallback_e:
            elapsed_ms = (time.time() - start_time) * 1000
            test.last_run_at = datetime.now(timezone.utc)
            test.last_duration_ms = round(elapsed_ms, 2)
            test.last_run_status = "unavailable"
            test.failed_step = str(fallback_e)
            test.evidence = {"runner_type": "http-synthetic-fallback", "error": str(fallback_e)}
            db.commit()
            return {"success": False, "status": "unavailable", "error": str(fallback_e)}

regression_service = RegressionService()
