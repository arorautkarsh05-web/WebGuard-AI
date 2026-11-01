import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.database import Base, engine
from backend.app.core.security import validate_target_url
from fastapi import HTTPException

# Ensure tables exist
Base.metadata.create_all(bind=engine)

client = TestClient(app)

def test_health_check_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["tinyfish_configured"] is True

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
    response = client.get("/api/v1/dashboard/overview")
    assert response.status_code == 200
    data = response.json()
    assert "total_websites" in data
    assert "uptime_percentage" in data

def test_website_registration_and_health_check():
    # Register a safe public website
    payload = {
        "name": "Example Domain",
        "url": "https://example.com",
        "check_frequency_minutes": 5
    }
    response = client.post("/api/v1/websites", json=payload)
    assert response.status_code == 200
    site = response.json()
    assert site["name"] == "Example Domain"
    assert site["url"] == "https://example.com"
    site_id = site["id"]

    # Trigger health check
    check_res = client.post(f"/api/v1/websites/{site_id}/check")
    assert check_res.status_code == 200
    assert check_res.json()["success"] is True

def test_competitor_creation_and_products():
    comp_payload = {
        "name": "Stripe",
        "website_url": "https://stripe.com",
        "description": "Payment infrastructure competitor"
    }
    response = client.post("/api/v1/competitors", json=comp_payload)
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
    prod_res = client.post(f"/api/v1/competitors/{comp_id}/products", json=prod_payload)
    assert prod_res.status_code == 200
    assert prod_res.json()["current_price"] == 29.0

def test_tinyfish_live_search():
    search_payload = {"query": "web monitoring saas"}
    res = client.post("/api/v1/tinyfish/search", json=search_payload)
    assert res.status_code == 200
    data = res.json()
    assert data.get("success") is True
    assert "results" in data
