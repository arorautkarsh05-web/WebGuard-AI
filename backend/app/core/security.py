import ipaddress
import socket
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any
from urllib.parse import urlparse

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login", auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def create_access_token(subject: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

# --- SSRF Protection (Mandatory PRD Requirement) ---
BLOCKED_HOSTNAMES = {"localhost", "127.0.0.1", "0.0.0.0", "metadata.google.internal"}

def validate_target_url(url: str) -> str:
    """
    Validates URL to protect against SSRF:
    - Must be http or https
    - Hostname cannot resolve to loopback, private RFC1918, link-local, or cloud metadata IPs
    """
    if not url:
        raise HTTPException(status_code=400, detail="Target URL is required")
        
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL scheme. Only HTTP and HTTPS protocols are permitted."
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid target URL: missing hostname")

    if hostname.lower() in BLOCKED_HOSTNAMES:
        raise HTTPException(
            status_code=400,
            detail="Forbidden URL target: access to localhost or internal services is restricted (SSRF protection)."
        )

    try:
        # Resolve hostname to IP to verify it's not private/loopback/cloud metadata
        resolved_ips = socket.getaddrinfo(hostname, None)
        for entry in resolved_ips:
            ip_str = entry[4][0]
            ip_obj = ipaddress.ip_address(ip_str)
            if (
                ip_obj.is_private
                or ip_obj.is_loopback
                or ip_obj.is_link_local
                or ip_obj.is_reserved
                or ip_obj.is_multicast
            ):
                raise HTTPException(
                    status_code=400,
                    detail=f"Forbidden target IP {ip_str}: internal and private IP ranges are blocked."
                )
    except socket.gaierror:
        if "." not in hostname:
            raise HTTPException(status_code=400, detail=f"Unresolvable hostname: {hostname}")

    return url
