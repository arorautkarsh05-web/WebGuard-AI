import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Organization
from backend.app.core.security import validate_target_url, get_password_hash
from fastapi import HTTPException

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
        "email": "testuser@webguard.ai",
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

def test_unauthenticated_protected_route_rejection():
    # Attempting to access protected endpoints without token must return 401
    response = client.get("/api/v1/websites")
    assert response.status_code == 401

def test_user_registration_and_login():
    import uuid
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
    assert "SSRF" in excinfo.value.detail or "blocked" in excinfo.value.detail or "restricted" in excinfo.value.detail

def test_ssrf_protection_blocks_private_ip():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("http://192.168.1.1/secret")
    assert excinfo.value.status_code == 400

def test_ssrf_protection_blocks_file_scheme():
    with pytest.raises(HTTPException) as excinfo:
        validate_target_url("file:///etc/passwd")
    assert excinfo.value.status_code == 400

def test_tinyfish_status_endpoint():
    response = client.get("/api/v1/tinyfish/status")
    assert response.status_code == 200
    data = response.json()
    assert data["configured"] is True

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
        "name": "Example Domain",
        "url": "https://example.com",
        "check_frequency_minutes": 5
    }
    response = client.post("/api/v1/websites", json=payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    site = response.json()
    assert site["name"] == "Example Domain"
    assert site["url"] == "https://example.com"
    site_id = site["id"]

    # Trigger health check
    check_res = client.post(f"/api/v1/websites/{site_id}/check", headers={"Authorization": f"Bearer {token}"})
    assert check_res.status_code == 200
    assert check_res.json()["success"] is True

def test_competitor_creation_and_products():
    token = get_auth_token()
    comp_payload = {
        "name": "Stripe",
        "website_url": "https://stripe.com",
        "description": "Payment infrastructure competitor"
    }
    response = client.post("/api/v1/competitors", json=comp_payload, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    comp = response.json()
    assert comp["name"] == "Stripe"
    comp_id = comp["id"]

    prod_payload = {
        "name": "Stripe Payments Standard",
        "url": "https://stripe.com/pricing",
        "current_price": 29.0,
        "currency": "USD"
    }
    prod_res = client.post(f"/api/v1/competitors/{comp_id}/products", json=prod_payload, headers={"Authorization": f"Bearer {token}"})
    assert prod_res.status_code == 200
    assert prod_res.json()["current_price"] == 29.0

def test_tinyfish_live_search():
    token = get_auth_token()
    search_payload = {"query": "web monitoring saas"}
    res = client.post("/api/v1/tinyfish/search", json=search_payload, headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    data = res.json()
    assert data.get("success") is True
    assert "results" in data
