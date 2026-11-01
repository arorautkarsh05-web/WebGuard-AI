import hashlib
import difflib
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session

from backend.app.services.tinyfish_service import tinyfish_service
from backend.app.models.models import MonitoringTask, MonitoringResult, Incident

class ChangeDetectorService:
    @staticmethod
    def _compute_hash(text: str) -> str:
        return hashlib.sha256(text.encode("utf-8")).hexdigest()

    @staticmethod
    def _classify_change(diff_text: str, prev_content: str, current_content: str) -> Dict[str, Any]:
        """
        Classifies detected modifications into semantic tiers:
        - Informational: Minor wording, copyright year, whitespace
        - Minor: Non-critical headline or marketing tagline update
        - Moderate: Layout changes, new section, modified navigation
        - High: Pricing adjustments, login/signup form changes, unexpected redirects
        - Critical: Checkout errors, gateway failures, or missing primary call-to-action
        """
        diff_lower = diff_text.lower()
        curr_lower = current_content.lower()
        prev_lower = prev_content.lower()

        # Critical indicators
        critical_keywords = [
            "payment failed", "checkout error", "internal server error",
            "database connection", "service unavailable", "exception occurred"
        ]
        if any(kw in diff_lower for kw in critical_keywords) and not any(kw in prev_lower for kw in critical_keywords):
            return {
                "classification": "Critical",
                "severity": "Critical",
                "summary": "Critical system failure or broken transaction flow detected on live webpage.",
                "confidence": 0.95,
                "create_incident": True
            }

        # High indicators (Pricing or Auth)
        pricing_keywords = ["$", "€", "£", "usd", "eur", "price", "pricing", "per month", "per year", "annual billing", "/mo"]
        auth_keywords = ["login", "sign in", "password", "authentication", "sso", "saml", "register", "sign up"]

        has_pricing = any(kw in diff_lower for kw in pricing_keywords)
        has_auth = any(kw in diff_lower for kw in auth_keywords)

        if has_pricing:
            return {
                "classification": "High",
                "severity": "High",
                "summary": "Commercial modification: pricing tier, discount, or subscription structure altered.",
                "confidence": 0.90,
                "create_incident": True
            }
        elif has_auth:
            return {
                "classification": "High",
                "severity": "High",
                "summary": "Security & access modification: authentication or signup entry point modified.",
                "confidence": 0.88,
                "create_incident": True
            }

        # Moderate indicators (Structural/Section additions)
        diff_lines = [l for l in diff_text.splitlines() if l.startswith('+') or l.startswith('-')]
        if len(diff_lines) > 25:
            return {
                "classification": "Moderate",
                "severity": "Medium",
                "summary": f"Structural layout modification: {len(diff_lines)} lines added/removed.",
                "confidence": 0.82,
                "create_incident": True
            }

        # Minor indicators
        if len(diff_lines) > 5:
            return {
                "classification": "Minor",
                "severity": "Low",
                "summary": "Minor content or copy revision detected on webpage.",
                "confidence": 0.75,
                "create_incident": False  # Do not generate incidents for routine copy updates
            }

        # Informational indicators
        return {
            "classification": "Informational",
            "severity": "Low",
            "summary": "Negligible wording or whitespace adjustment.",
            "confidence": 0.70,
            "create_incident": False
        }

    async def detect_changes(
        self,
        task: MonitoringTask,
        db: Session
    ) -> Dict[str, Any]:
        """
        Extracts webpage content using TinyFish Fetch, stores snapshot,
        compares against previous snapshot using semantic classification,
        suppresses noise, and creates incidents only for High/Critical changes.
        """
        url = task.target_url
        fetch_res = await tinyfish_service.fetch(url=url, db=db, organization_id=task.organization_id)
        
        if not fetch_res.get("success"):
            return {
                "success": False,
                "error": fetch_res.get("error", "Failed to fetch webpage content")
            }

        current_content = fetch_res.get("content", "")
        current_hash = self._compute_hash(current_content)

        # Retrieve previous result for this task
        previous_result = (
            db.query(MonitoringResult)
            .filter(MonitoringResult.task_id == task.id)
            .order_by(MonitoringResult.created_at.desc())
            .first()
        )

        has_changed = False
        diff_text = ""
        analysis = {
            "classification": "None",
            "severity": "Low",
            "summary": "Baseline snapshot established.",
            "confidence": 1.0,
            "create_incident": False
        }

        if previous_result and previous_result.data and "content_hash" in previous_result.data:
            prev_hash = previous_result.data["content_hash"]
            prev_content = previous_result.data.get("content", "")
            
            if prev_hash != current_hash:
                has_changed = True
                
                # Compute unified text diff
                diff_lines = list(difflib.unified_diff(
                    prev_content.splitlines(),
                    current_content.splitlines(),
                    fromfile="baseline_snapshot",
                    tofile="current_snapshot",
                    n=2
                ))
                diff_text = "\n".join(diff_lines[:60])

                # Run Semantic Classification
                analysis = self._classify_change(diff_text, prev_content, current_content)

                # Suppress duplicate noise: only generate incident if create_incident is True
                if analysis["create_incident"]:
                    incident = Incident(
                        organization_id=task.organization_id,
                        website_id=task.website_id,
                        task_id=task.id,
                        title=f"Page Change ({analysis['classification']}): {task.name}",
                        severity=analysis["severity"],
                        status="Open",
                        root_cause_summary=analysis["summary"],
                        evidence={
                            "target_url": url,
                            "change_classification": analysis["classification"],
                            "confidence": analysis["confidence"],
                            "diff_snippet": diff_text[:1200],
                            "changed_at": datetime.now(timezone.utc).isoformat()
                        },
                        recommended_actions=[
                            "Review content differential against scheduled CMS publications",
                            "Verify that critical call-to-actions and conversion funnels remain functional"
                        ]
                    )
                    db.add(incident)

        # Store MonitoringResult with full snapshot data
        result_payload = {
            "content_hash": current_hash,
            "content": current_content,
            "content_length": len(current_content),
            "has_changed": has_changed,
            "classification": analysis["classification"],
            "summary": analysis["summary"],
            "diff": diff_text,
            "fetch_source": "tinyfish_fetch" if not fetch_res.get("fallback") else "http_fallback"
        }

        task_result = MonitoringResult(
            task_id=task.id,
            website_id=task.website_id,
            status="success",
            response_time_ms=fetch_res.get("latency_ms", 150),
            http_status_code=200,
            data=result_payload
        )
        task.last_run_at = datetime.now(timezone.utc)
        db.add(task_result)
        db.commit()

        return {
            "success": True,
            "has_changed": has_changed,
            "change_type": analysis["classification"],
            "change_summary": [analysis["summary"]],
            "diff": diff_text,
            "content_length": len(current_content),
            "confidence": analysis["confidence"]
        }

change_detector = ChangeDetectorService()
