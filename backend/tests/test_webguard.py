import pytest
import uuid
from fastapi.testclient import TestClient
from fastapi import HTTPException

from backend.main import app
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Organization, Website, Incident, AIAction, RegressionTest
from backend.app.core.security import validate_target_url, get_password_hash

# Ensure tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def get_auth_token():
    # Login as admin or register a test user
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@webguard.ai",
        "password": "WebGuardPass2026!"
    })
    if login_res.status_code == 200:
        return login_res.json()["access_token"]
    
    # Or create a fresh user
    reg_res = client.post("/api/v1/auth/register", json={
        "email": f"test_{uuid.uuid4().hex[:6]}@webguard.ai",
        "password": "WebGuardPass2026!",
        "confirm_password": "WebGuardPass2026!",
        "full_name": "Test User",
        "organization_name": "Test Org"
    })
    return reg_res.json()["access_token"]

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["tinyfish_configured"] is True
    assert "environment" in data

def test_unauthenticated_protected_route_rejection():
    # Attempting to access protected endpoints without token must return 401
    response = client.get("/api/v1/websites")
    assert response.status_code == 401

def test_user_registration_and_login():
    random_email = f"user_{uuid.uuid4().hex[:6]}@webguard.ai"
    reg_payload = {
        "email": random_email,
        "password": "SecretPassword123!",
        "confirm_password": "SecretPassword123!",
        "full_name": "Alice Security",
        "organization_name": "Alice Cyber"
    }
    reg_res = client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 200
    data = reg_res.json()
    assert "access_token" in data
    assert data["user"]["email"] == random_email

    # Test login with same credentials
    login_res = client.post("/api/v1/auth/login", json={
        "email": random_email,
        "password": "SecretPassword123!"
    })
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Test profile /me
    token = login_res.json()["access_token"]
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == random_email

def test_ssrf_protection_blocks_localhost():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("http://localhost:8000/admin")
    assert excinfo.value.status_code == 400
    assert "SSRF" in excinfo.value.detail or "restricted" in excinfo.value.detail or "blocked" in excinfo.value.detail

def test_ssrf_protection_blocks_private_ip():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("http://192.168.1.1/secret")
    assert excinfo.value.status_code == 400

def test_ssrf_protection_blocks_cloud_metadata():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("http://169.254.169.254/latest/meta-data/")
    assert excinfo.value.status_code == 400

def test_ssrf_protection_blocks_file_scheme():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("file:///etc/passwd")
    assert excinfo.value.status_code == 400

def test_cross_organization_data_isolation():
    # 1. Register User A in Organization A
    email_a = f"tenant_a_{uuid.uuid4().hex[:6]}@webguard.ai"
    res_a = client.post("/api/v1/auth/register", json={
        "email": email_a,
        "password": "PassPassword123!",
        "confirm_password": "PassPassword123!",
        "full_name": "Tenant A Admin",
        "organization_name": "Org A Defense"
    })
    assert res_a.status_code == 200
    token_a = res_a.json()["access_token"]

    # 2. Register User B in Organization B
    email_b = f"tenant_b_{uuid.uuid4().hex[:6]}@webguard.ai"
    res_b = client.post("/api/v1/auth/register", json={
        "email": email_b,
        "password": "PassPassword123!",
        "confirm_password": "PassPassword123!",
        "full_name": "Tenant B Admin",
        "organization_name": "Org B Defense"
    })
    assert res_b.status_code == 200
    token_b = res_b.json()["access_token"]

    # 3. User A creates a website in Org A
    site_payload = {"name": "Org A Internal Portal", "url": "https://example.com/org-a"}
    create_res = client.post("/api/v1/websites", json=site_payload, headers={"Authorization": f"Bearer {token_a}"})
    assert create_res.status_code == 200
    site_a_id = create_res.json()["id"]

    # 4. User B tries to read User A's website -> must return 404
    get_res = client.get(f"/api/v1/websites/{site_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_res.status_code == 404

    # 5. User B tries to delete User A's website -> must return 404
    del_res = client.delete(f"/api/v1/websites/{site_a_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_res.status_code == 404

def test_dashboard_overview():
    token = get_auth_token()
    response = client.get("/api/v1/dashboard/overview", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert "total_websites" in data
    assert "uptime_percentage" in data

def test_website_registration_and_health_check():
    token = get_auth_token()
    payload = {
        "name": "Production Target",
        "url": "https://example.com",
        "check_frequency_minutes": 5
    }
    response = client.post("/api/v1/websites", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    site = response.json()
    assert site["name"] == "Production Target"
    assert site["url"] == "https://example.com"
    site_id = site["id"]

    # Trigger health check
    check_res = client.post(f"/api/v1/websites/{site_id}/check", headers={"Authorization": f"Bearer {token}"})
    assert check_res.status_code == 200
    assert check_res.json()["success"] is True

def test_flagship_autonomous_root_cause_investigation():
    token = get_auth_token()
    db = SessionLocal()
    try:
        # Create a test incident
        user = db.query(User).filter(User.email == "admin@webguard.ai").first()
        org_id = user.organization_id if user else "test-org"
        site = db.query(Website).filter(Website.organization_id == org_id).first()

        incident = Incident(
            organization_id=org_id,
            website_id=site.id if site else None,
            title="Synthetic Outage: Endpoint unreachable",
            severity="Critical",
            status="Open",
            root_cause_summary="Initial anomaly detected",
            evidence={"url": site.url if site else "https://example.com", "status_code": 503}
        )
        db.add(incident)
        db.commit()
        db.refresh(incident)
        inc_id = incident.id
    finally:
        db.close()

    # Trigger autonomous investigation
    res = client.post(f"/api/v1/incidents/{inc_id}/investigate", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    report = data["investigation_report"]
    assert "incident_title" in report
    assert "confirmed_failures" in report
    assert "observations" in report
    assert "possible_causes" in report
    assert "supporting_evidence" in report
    assert "confidence" in report
    assert "recommended_actions" in report
    assert report["requires_human_approval"] is True

def test_ai_action_center_human_approval_and_verification():
    token = get_auth_token()
    # Fetch action proposals
    actions_res = client.get("/api/v1/actions", headers={"Authorization": f"Bearer {token}"})
    assert actions_res.status_code == 200
    actions = actions_res.json()
    assert len(actions) > 0

    pending_action = actions[0]
    action_id = pending_action["id"]

    # Approve and execute action
    approve_res = client.post(f"/api/v1/actions/{action_id}/approve", json={"approved": True}, headers={"Authorization": f"Bearer {token}"})
    assert approve_res.status_code == 200
    assert approve_res.json()["success"] is True

    # Re-verify resolution
    verify_res = client.post(f"/api/v1/actions/{action_id}/verify", headers={"Authorization": f"Bearer {token}"})
    assert verify_res.status_code == 200
    assert verify_res.json()["success"] is True

def test_autonomous_regression_testing_lifecycle():
    token = get_auth_token()
    # Create regression test objective
    payload = {
        "name": "Homepage Navigation Verification",
        "objective": "Verify primary navigation links on the homepage render properly.",
        "target_url": "https://example.com",
        "frequency_minutes": 60
    }
    create_res = client.post("/api/v1/regression", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert create_res.status_code == 200
    test_obj = create_res.json()
    assert test_obj["name"] == "Homepage Navigation Verification"
    test_id = test_obj["id"]

    # List tests
    list_res = client.get("/api/v1/regression", headers={"Authorization": f"Bearer {token}"})
    assert list_res.status_code == 200
    assert any(t["id"] == test_id for t in list_res.json())

    # Delete test
    del_res = client.delete(f"/api/v1/regression/{test_id}", headers={"Authorization": f"Bearer {token}"})
    assert del_res.status_code == 200
