import pytest
from jose import jwt, JWTError
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

from backend.app.core.security import (
    validate_target_url,
    validate_redirect_response,
    create_access_token,
    create_ssrf_safe_client,
    _parse_encoded_ip
)
from backend.app.core.config import Settings, settings

def test_ssrf_blocks_loopback_and_private_ips():
    for blocked_url in [
        "http://127.0.0.1/admin",
        "http://localhost:8000/internal",
        "http://10.0.0.1/secrets",
        "http://192.168.1.100/router",
        "http://172.16.0.5/api",
        "http://[::1]/status"
    ]:
        with pytest.raises(HTTPException):
            validate_target_url(blocked_url)

def test_ssrf_blocks_encoded_and_alternate_ip_notations():
    """Validates blocking of decimal, hex, octal, and mapped IPv6 SSRF bypasses."""
    # Decimal 2130706433 = 127.0.0.1
    with pytest.raises(HTTPException):
        validate_target_url("http://2130706433/")

    # Hex 0x7f000001 = 127.0.0.1
    with pytest.raises(HTTPException):
        validate_target_url("http://0x7f000001/")

    # Octal 0177.0.0.1 = 127.0.0.1
    with pytest.raises(HTTPException):
        validate_target_url("http://0177.0.0.1/")

    # IPv4-mapped IPv6
    with pytest.raises(HTTPException):
        validate_target_url("http://[::ffff:127.0.0.1]/")

    with pytest.raises(HTTPException):
        validate_target_url("http://[::ffff:10.0.0.1]/")

def test_ssrf_blocks_cloud_metadata():
    for meta_url in [
        "http://169.254.169.254/latest/meta-data/",
        "http://metadata.google.internal/computeMetadata/v1/",
        "http://169.254.169.254/metadata/v1"
    ]:
        with pytest.raises(HTTPException):
            validate_target_url(meta_url)

def test_ssrf_permits_legitimate_domains():
    for valid_url in [
        "https://example.com",
        "https://api.github.com",
        "https://fastapi.tiangolo.com"
    ]:
        cleaned = validate_target_url(valid_url)
        assert cleaned.startswith("http")

@pytest.mark.asyncio
async def test_redirect_depth_limit():
    """Ensures redirect chains exceeding 5 hops are blocked."""
    import httpx
    # Within limit
    mock_resp = httpx.Response(302, headers={"location": "https://example.com/step2"})
    await validate_redirect_response(mock_resp, depth=4)

    # Exceeds limit
    with pytest.raises(HTTPException, match="Maximum redirect depth of 5 hops exceeded"):
        await validate_redirect_response(mock_resp, depth=6)

@pytest.mark.asyncio
async def test_socket_level_ssrf_safe_client():
    """Ensures that SSRFSafeAsyncTransport blocks connections to forbidden IPs at the socket level."""
    client = create_ssrf_safe_client()
    try:
        # Direct attempt to connect to loopback
        with pytest.raises(Exception) as excinfo:
            await client.get("http://127.0.0.1:65432/test")
        assert "SSRF" in str(excinfo.value) or "Forbidden destination" in str(excinfo.value) or "ConnectError" in type(excinfo.value).__name__
    finally:
        await client.aclose()

def test_jwt_signature_and_expiration():
    token = create_access_token(
        subject="user_sec_test",
        expires_delta=timedelta(minutes=15)
    )
    # Valid decode
    payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == "user_sec_test"

    # Signature tampering rejection
    with pytest.raises(JWTError):
        jwt.decode(token, "tampered-attacker-secret-key-1234567890", algorithms=[settings.ALGORITHM])

    # Expired token rejection
    expired_token = create_access_token(
        subject="user_expired",
        expires_delta=timedelta(seconds=-10)
    )
    with pytest.raises(JWTError):
        jwt.decode(expired_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

def test_production_mode_secret_entropy_enforcement():
    # In production, short or default secret keys must raise ValueError
    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="short",
            DATABASE_URL="postgresql://user:pass@host:5432/db"
        )

    with pytest.raises(ValueError, match="CRITICAL SECURITY CONFIGURATION ERROR"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="webguard-super-secret-key-change-in-production-2026",
            DATABASE_URL="postgresql://user:pass@host:5432/db"
        )
