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

    async def detect_changes(
        self,
        task: MonitoringTask,
        db: Session
    ) -> Dict[str, Any]:
        """
        Extracts webpage content using TinyFish Fetch, stores snapshot,
        compares against previous snapshot, and generates incidents if critical changes are detected.
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
        change_summary = []
        change_type = "none"
        diff_text = ""

        if previous_result and previous_result.data and "content_hash" in previous_result.data:
            prev_hash = previous_result.data["content_hash"]
            prev_content = previous_result.data.get("content", "")
            
            if prev_hash != current_hash:
                has_changed = True
                
                # Compute text diff
                diff_lines = list(difflib.unified_diff(
                    prev_content.splitlines(),
                    current_content.splitlines(),
                    fromfile="previous_snapshot",
                    tofile="current_snapshot",
                    n=2
                ))
                diff_text = "\n".join(diff_lines[:50])

                # Classify change
                prev_lower = prev_content.lower()
                curr_lower = current_content.lower()

                # Check for pricing or discount indicators
                price_keywords = ["$", "€", "£", "price", "plan", "month", "year", "tier", "billing", "discount", "free"]
                has_pricing_keywords = any(kw in diff_text.lower() for kw in price_keywords)
                
                if has_pricing_keywords:
                    change_type = "pricing_change"
                    change_summary.append("Detected pricing, plan, or subscription tier adjustments on the webpage.")
                elif "error" in curr_lower and "error" not in prev_lower:
                    change_type = "error_content_introduced"
                    change_summary.append("Error messages or broken components detected in rendered page content.")
                else:
                    change_type = "content_updated"
                    change_summary.append(f"Content modification detected ({len(diff_lines)} changed lines).")

                # Generate incident if meaningful change detected
                severity = "Medium" if change_type == "pricing_change" else "Low"
                if change_type == "error_content_introduced":
                    severity = "High"

                incident = Incident(
                    organization_id=task.organization_id,
                    website_id=task.website_id,
                    task_id=task.id,
                    title=f"Page Change: {task.name} ({change_type})",
                    severity=severity,
                    status="Open",
                    root_cause_summary="Automated content comparison detected structural or textual changes on the target webpage.",
                    evidence={
                        "target_url": url,
                        "change_type": change_type,
                        "diff_snippet": diff_text[:1000],
                        "previous_hash": prev_hash,
                        "current_hash": current_hash
                    },
                    recommended_actions=[
                        "Review recent marketing or pricing releases",
                        "Verify whether changes were authorized",
                        "Ensure CTA links and checkout flows remain intact"
                    ]
                )
                db.add(incident)
        else:
            change_summary.append("Initial baseline snapshot captured successfully.")
            change_type = "initial_snapshot"

        # Store monitoring result with snapshot data
        result_record = MonitoringResult(
            task_id=task.id,
            website_id=task.website_id,
            status="success",
            response_time_ms=fetch_res.get("latency_ms", 0),
            http_status_code=200,
            data={
                "content_hash": current_hash,
                "content": current_content[:10000],  # Store truncated snapshot to preserve storage
                "has_changed": has_changed,
                "change_type": change_type,
                "change_summary": change_summary,
                "diff_snippet": diff_text[:500] if diff_text else None
            }
        )
        db.add(result_record)
        task.last_run_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(result_record)

        return {
            "success": True,
            "has_changed": has_changed,
            "change_type": change_type,
            "change_summary": change_summary,
            "diff": diff_text
        }

change_detector = ChangeDetectorService()
