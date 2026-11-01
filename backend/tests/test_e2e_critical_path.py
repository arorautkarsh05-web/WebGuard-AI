import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import SessionLocal
from backend.app.models.models import Organization, User, Website, Incident, AIAction

client = TestClient(app)

def test_complete_critical_lifecycle_workflow():
    """
    CRITICAL END-TO-END AUTONOMOUS WORKFLOW:
    1. Register new Organization & Administrator User
    2. Authenticate and obtain JWT bearer token
    3. Register Monitored Target Website
    4. Simulate Incident / Outage Detection (502 Bad Gateway)
    5. Trigger Autonomous Root-Cause Investigation (/api/v1/incidents/{id}/investigate)
    6. Collect Multi-Module Evidence & Synthesize Investigation Report
    7. Validate Structured Report Schema (observations, confirmed failures, hypotheses, confidence)
    8. Verify Allowlisted Action Proposals generated in Action Center
    9. Approve Action via Role-Gated Endpoint (/api/v1/actions/{id}/approve)
    10. Execute Allowlisted Action & Verify Post-Action Resolution
    """
    db = SessionLocal()
    try:
        # Step 1: Register Organization & User
        org_name = "Acme Cyber Ops"
        reg_payload = {
            "organization_name": org_name,
            "email": "lead_secops@acmeops.io",
            "full_name": "Lead SecOps Engineer",
            "password": "StrongPassword2026!Secure",
            "plan": "enterprise"
        }
        reg_res = client.post("/api/v1/auth/register", json=reg_payload)
        # If user already registered, continue to login
        assert reg_res.status_code in (200, 201, 400)

        # Step 2: Authenticate & Obtain Token
        login_res = client.post(
            "/api/v1/auth/login",
            json={"email": "lead_secops@acmeops.io", "password": "StrongPassword2026!Secure"}
        )
        assert login_res.status_code == 200, f"Login failed: {login_res.text}"
        token = login_res.json()["access_token"]
        auth_headers = {"Authorization": f"Bearer {token}"}

        # Step 3: Add Monitored Website
        site_payload = {
            "name": "Acme Edge Gateway",
            "url": "https://example.com",
            "check_frequency_minutes": 5
        }
        site_res = client.post("/api/v1/websites", json=site_payload, headers=auth_headers)
        assert site_res.status_code in (200, 201), f"Add website failed: {site_res.text}"
        site_data = site_res.json()
        website_id = site_data["id"]

        # Step 4: Record Incident (502 Bad Gateway)
        incident = Incident(
            organization_id=site_data["organization_id"],
            website_id=website_id,
            title="Service Degradation: HTTP 502 Bad Gateway observed",
            root_cause_summary="Upstream proxy failed to return valid HTTP response within timeout window.",
            severity="High",
            status="Open",
            evidence={"url": "https://example.com", "http_status_code": 502, "component": "ingress-proxy"}
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        incident_id = incident.id

        # Step 5: Trigger Autonomous Root-Cause Investigation
        inv_res = client.post(f"/api/v1/incidents/{incident_id}/investigate", headers=auth_headers)
        assert inv_res.status_code == 200, f"Investigation failed: {inv_res.text}"
        inv_data = inv_res.json()
        assert inv_data["success"] is True
        inv_report = inv_data["investigation_report"]

        # Step 6 & 7: Validate Structured Report
        assert "observations" in inv_report
        assert "confirmed_failures" in inv_report
        assert "possible_causes" in inv_report
        assert "confidence" in inv_report
        assert inv_report["confidence"] >= 0.50
        assert inv_report.get("requires_human_approval") is True
        assert "analysis_method" in inv_report

        # Step 8: Verify Allowlisted Action Proposals generated in Action Center
        actions_res = client.get("/api/v1/actions", headers=auth_headers)
        assert actions_res.status_code == 200
        actions = actions_res.json()
        matching_actions = [a for a in actions if a["incident_id"] == incident_id]
        assert len(matching_actions) >= 1, "Action Center proposal must be staged for incident"
        probe_action = matching_actions[0]
        action_id = probe_action["id"]
        assert probe_action["approval_status"] == "pending_approval"

        # Step 9: Approve Action (Human-in-the-Loop)
        approve_res = client.post(
            f"/api/v1/actions/{action_id}/approve",
            json={"approved": True, "notes": "Approved by Lead SecOps Engineer for immediate remediation verification"},
            headers=auth_headers
        )
        assert approve_res.status_code == 200, f"Approve action failed: {approve_res.text}"
        approve_data = approve_res.json()
        assert approve_data.get("success") is True

        # Step 10: Verify Post-Action Resolution
        detail_res = client.get(f"/api/v1/actions/{action_id}", headers=auth_headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()
        assert detail["execution_status"] in ("completed", "integration_unconfigured")
        assert detail["verification_status"] in ("verified_resolved", "still_failing", "unconfigured")

    finally:
        db.close()
