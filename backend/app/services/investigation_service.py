import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import (
    Incident,
    Website,
    MonitoringResult,
    TinyFishExecution,
    AIAction,
    User
)
from backend.app.services.intelligence_engine import intelligence_engine
from backend.app.services.action_registry import (
    ALLOWLISTED_ACTIONS,
    ActionExecutor,
    VerificationProbeParams,
    IncidentBriefDispatchParams
)

class InvestigationService:
    async def investigate_incident(
        self,
        incident: Incident,
        db: Session,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Flagship Autonomous Root-Cause Investigation:
        STEP 1: Multi-module Correlation via Unified Intelligence Engine (LLM or deterministic)
        STEP 2: Persist Structured Investigation Report into Incident evidence
        STEP 3: Generate Allowlisted Action Proposals in AI Action Center (human approval gated)
        """
        # Run Unified Intelligence Engine
        report = await intelligence_engine.correlate_incident_intelligence(incident, db)

        # Update Incident in Database
        existing_evidence = incident.evidence or {}
        existing_evidence["investigation_report"] = report
        incident.evidence = existing_evidence
        incident.status = "Investigating"
        db.commit()

        # Retrieve target url
        target_url = (incident.evidence or {}).get("url")
        if not target_url and incident.website_id:
            w = db.query(Website).filter(Website.id == incident.website_id).first()
            if w:
                target_url = w.url

        # Propose Allowlisted Action 1: HTTP Verification Probe (Low Risk)
        self.propose_allowlisted_action(
            db=db,
            organization_id=incident.organization_id,
            incident_id=incident.id,
            action_type="HTTP_VERIFICATION_PROBE",
            title=f"Synthetic Verification Probe: {incident.title}",
            description=f"Automated non-destructive probe to test {target_url or 'endpoint'} recovery without state mutation.",
            parameters={"target_url": target_url or "https://example.com", "expected_status_code": 200},
            user_id=current_user.id if current_user else None
        )

        # Propose Allowlisted Action 2: Incident Brief Dispatch (Low Risk)
        self.propose_allowlisted_action(
            db=db,
            organization_id=incident.organization_id,
            incident_id=incident.id,
            action_type="GENERATE_INCIDENT_BRIEF",
            title=f"Publish Technical Brief: {incident.title}",
            description="Format structured telemetry report and publish to operational notification stream.",
            parameters={"channel": "engineering-incidents", "include_evidence": True},
            user_id=current_user.id if current_user else None
        )

        # If Critical or High, also propose CDN Flush or Infrastructure Recovery (High Risk - Requires Admin)
        if incident.severity.upper() in ("CRITICAL", "HIGH"):
            domain = target_url.split("//")[-1].split("/")[0] if target_url else "example.com"
            self.propose_allowlisted_action(
                db=db,
                organization_id=incident.organization_id,
                incident_id=incident.id,
                action_type="FLUSH_CDN_EDGE_CACHE",
                title=f"Purge Edge Cache: {domain}",
                description=f"Invalidate stale edge reverse proxy caches for {domain}.",
                parameters={"domain": domain, "purge_all": False, "paths": ["/*"]},
                user_id=current_user.id if current_user else None
            )

        return report

    def propose_allowlisted_action(
        self,
        db: Session,
        organization_id: str,
        incident_id: str,
        action_type: str,
        title: str,
        description: str,
        parameters: Dict[str, Any],
        user_id: Optional[str] = None
    ) -> AIAction:
        """
        Validates parameters against action registry and stores pending action in database.
        """
        # Validate against registry
        ActionExecutor.validate_action_params(action_type, parameters)
        def_info = ALLOWLISTED_ACTIONS[action_type]

        existing = (
            db.query(AIAction)
            .filter(
                AIAction.incident_id == incident_id,
                AIAction.action_type == action_type,
                AIAction.approval_status == "pending_approval"
            )
            .first()
        )
        if existing:
            return existing

        action = AIAction(
            organization_id=organization_id,
            incident_id=incident_id,
            user_id=user_id,
            action_type=action_type,
            title=title,
            description=description,
            parameters=parameters,
            risk_level=def_info.risk_level,
            approval_status="pending_approval",
            execution_status="pending",
            verification_status="pending"
        )
        db.add(action)
        db.commit()
        db.refresh(action)
        return action

    async def execute_approved_action(
        self,
        action: AIAction,
        db: Session,
        approved_by: User
    ) -> Dict[str, Any]:
        """
        Executes an action approved by an authorized user and logs execution telemetry.
        Enforces:
        - Registry validation
        - Role-based authorization
        - Parameter re-validation
        - Execution timeouts
        - Post-action verification
        """
        # Role verification
        if not ActionExecutor.check_user_authorization(action.action_type, approved_by.role):
            raise PermissionError(
                f"Unauthorized: Action '{action.action_type}' requires admin privileges. User role is '{approved_by.role}'."
            )

        # Parameter validation
        validated_params = ActionExecutor.validate_action_params(action.action_type, action.parameters or {})

        action.approval_status = "approved"
        action.approved_at = datetime.now(timezone.utc)
        action.user_id = approved_by.id
        action.execution_status = "running"
        db.commit()

        try:
            # Execute allowlisted action via adapter architecture
            exec_res = await ActionExecutor.execute(action.action_type, validated_params)

            # Check if external infrastructure was unconfigured
            if exec_res.get("status") == "integration_unconfigured":
                action.execution_status = "integration_unconfigured"
                action.execution_result = exec_res
                action.verification_status = "unconfigured"
                action.verification_details = {
                    "status": "UNCONFIGURED",
                    "message": exec_res.get("message", "External orchestrator credentials unconfigured.")
                }
                db.commit()
                db.refresh(action)
                return {"success": False, "status": "integration_unconfigured", "action": action}

            action.execution_status = "completed"
            action.executed_at = datetime.now(timezone.utc)
            action.execution_result = exec_res

            # Post-Action Verification Engine
            from backend.app.services.remediation.verification import verifier
            ver_res = await verifier.verify_action_resolution(action, db)

            db.commit()
            db.refresh(action)
            return {"success": True, "action": action, "verification": ver_res}

        except Exception as e:
            action.execution_status = "failed"
            action.execution_result = {"error": str(e)}
            action.verification_status = "verification_failed"
            db.commit()
            return {"success": False, "error": str(e)}

investigation_service = InvestigationService()
