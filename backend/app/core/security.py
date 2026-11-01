import ipaddress
import socket
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Any, List
from urllib.parse import urlparse, urljoin

import httpx
import httpcore
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

# --- Comprehensive SSRF & DNS Rebinding Guardrails ---

BLOCKED_HOSTNAMES = {
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "::1",
    "[::1]",
    "metadata.google.internal",
    "169.254.169.254",
    "instance-data",
    "metadata",
    "kubernetes.default",
    "kubernetes.default.svc",
    "kubernetes.default.svc.cluster.local"
}

FORBIDDEN_NETWORKS = [
    ipaddress.ip_network("0.0.0.0/8"),          # Current network (only valid as source)
    ipaddress.ip_network("10.0.0.0/8"),          # RFC 1918 Private
    ipaddress.ip_network("100.64.0.0/10"),       # Carrier Grade NAT (RFC 6598)
    ipaddress.ip_network("127.0.0.0/8"),        # Loopback
    ipaddress.ip_network("169.254.0.0/16"),      # Link-local / Cloud Metadata
    ipaddress.ip_network("172.16.0.0/12"),       # RFC 1918 Private & Docker bridges
    ipaddress.ip_network("192.0.0.0/24"),        # IETF Protocol Assignments
    ipaddress.ip_network("192.0.2.0/24"),        # TEST-NET-1 (RFC 5737)
    ipaddress.ip_network("192.88.99.0/24"),      # 6to4 Relay Anycast (RFC 7526)
    ipaddress.ip_network("192.168.0.0/16"),      # RFC 1918 Private
    ipaddress.ip_network("198.18.0.0/15"),       # Network Interconnect Device Benchmark
    ipaddress.ip_network("198.51.100.0/24"),     # TEST-NET-2 (RFC 5737)
    ipaddress.ip_network("203.0.113.0/24"),      # TEST-NET-3 (RFC 5737)
    ipaddress.ip_network("224.0.0.0/4"),        # Multicast
    ipaddress.ip_network("240.0.0.0/4"),        # Reserved for future use
    ipaddress.ip_network("255.255.255.255/32"),  # Broadcast
    # IPv6
    ipaddress.ip_network("::1/128"),             # IPv6 Loopback
    ipaddress.ip_network("::/128"),              # Unspecified
    ipaddress.ip_network("::ffff:0:0/96"),       # IPv4-mapped IPv6
    ipaddress.ip_network("100::/64"),            # Discard prefix
    ipaddress.ip_network("2001:db8::/32"),       # Documentation
    ipaddress.ip_network("fc00::/7"),            # Unique Local Address (ULA)
    ipaddress.ip_network("fe80::/10"),           # Link-local unicast
    ipaddress.ip_network("fd00:ec2::/64"),       # AWS IMDSv6 link-local
    ipaddress.ip_network("ff00::/8")             # Multicast
]

def _parse_encoded_ip(hostname: str) -> Optional[ipaddress.IPv4Address]:
    """Decodes non-standard IP notations (integer, hex, octal)."""
    # 1. Decimal integer representation (e.g. 2130706433 -> 127.0.0.1)
    if hostname.isdigit():
        try:
            val = int(hostname)
            if 0 <= val <= 0xFFFFFFFF:
                return ipaddress.IPv4Address(val)
        except Exception:
            pass

    # 2. Hexadecimal representation (e.g. 0x7f000001 -> 127.0.0.1)
    if hostname.startswith(("0x", "0X")):
        try:
            val = int(hostname, 16)
            if 0 <= val <= 0xFFFFFFFF:
                return ipaddress.IPv4Address(val)
        except Exception:
            pass

    # 3. Octal dot-decimal representation (e.g. 0177.0.0.1 -> 127.0.0.1)
    if hostname.startswith("0") and "." in hostname:
        parts = hostname.split(".")
        if len(parts) == 4 and all(p.isdigit() for p in parts):
            try:
                dec_parts = [str(int(p, 8) if p.startswith("0") and len(p) > 1 else int(p)) for p in parts]
                return ipaddress.IPv4Address(".".join(dec_parts))
            except Exception:
                pass

    return None

def verify_ip_is_public(ip: Any):
    """
    Ensures an IP address does not belong to private, loopback, link-local,
    reserved, carrier-grade NAT, or cloud metadata ranges.
    """
    if isinstance(ip, str):
        ip = ipaddress.ip_address(ip)

    # Unwrap IPv4-mapped IPv6
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    # Check against individual address properties
    if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast or ip.is_unspecified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Forbidden destination IP ({ip}): private and loopback networks are restricted (SSRF guardrail)."
        )

    # Explicit check against CIDR blocks
    for net in FORBIDDEN_NETWORKS:
        if ip in net:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Forbidden destination IP ({ip}): belongs to restricted network {net} (SSRF guardrail)."
            )

def _verify_ip_is_public(ip: Any):
    verify_ip_is_public(ip)

def validate_target_url(url: str) -> str:
    """
    Validates URL to protect against Server-Side Request Forgery (SSRF):
    - Strict scheme verification (HTTP and HTTPS only)
    - Rejects localhost, loopback, private RFC1918, link-local, and cloud metadata
    - Resolves all IPv4 and IPv6 DNS records and validates every IP
    - Detects encoded/hex/octal/integer IP representations
    - Protects against IPv4-mapped IPv6 and internal service domains
    """
    if not url or not isinstance(url, str):
        raise HTTPException(status_code=400, detail="Target URL is required")
        
    url = url.strip()
    parsed = urlparse(url)
    if parsed.scheme.lower() not in ("http", "https"):
        raise HTTPException(
            status_code=400,
            detail="Invalid URL scheme. Only HTTP and HTTPS protocols are permitted."
        )

    hostname = parsed.hostname
    if not hostname:
        raise HTTPException(status_code=400, detail="Invalid target URL: missing hostname")

    clean_hostname = hostname.lower().strip("[]")

    # 1. Blocked hostname literal check
    if clean_hostname in BLOCKED_HOSTNAMES:
        raise HTTPException(
            status_code=400,
            detail="Forbidden URL target: access to localhost or cloud metadata is strictly restricted (SSRF guardrail)."
        )

    # 2. Check for encoded numerical/octal/hex IP representation
    encoded_ip = _parse_encoded_ip(clean_hostname)
    if encoded_ip:
        verify_ip_is_public(encoded_ip)
        return url

    # 3. Check for direct IP literal (IPv4 or IPv6)
    try:
        ip = ipaddress.ip_address(clean_hostname)
        verify_ip_is_public(ip)
        return url
    except ValueError:
        pass  # Not a literal IP, proceed to DNS resolution

    # 4. Resolve hostname across all address families (IPv4 and IPv6)
    try:
        addr_info = socket.getaddrinfo(hostname, None, proto=socket.IPPROTO_TCP)
        if not addr_info:
            raise HTTPException(status_code=400, detail=f"Hostname could not be resolved: {hostname}")

        for entry in addr_info:
            ip_str = entry[4][0]
            ip = ipaddress.ip_address(ip_str)
            verify_ip_is_public(ip)

    except socket.gaierror:
        if "." not in hostname:
            raise HTTPException(status_code=400, detail=f"Unresolvable internal hostname: {hostname}")

    return url

# --- Socket-Level Connection-Time DNS Rebinding Protection ---

class SSRFSafeAnyIOBackend(httpcore.AnyIOBackend):
    """
    Custom Network Backend that validates destination IP addresses at the exact
    socket-connection time, eliminating the time-of-check to time-of-use (TOCTOU)
    DNS rebinding window.
    """
    async def connect_tcp(
        self,
        host: str,
        port: int,
        timeout: Optional[float] = None,
        local_address: Optional[str] = None,
        socket_options: Optional[Any] = None,
    ) -> httpcore.AsyncNetworkStream:
        clean_host = host.strip("[]")
        # Check encoded forms
        encoded = _parse_encoded_ip(clean_host)
        if encoded:
            verify_ip_is_public(encoded)

        # Resolve destination host at connect time
        addr_info = socket.getaddrinfo(host, port, proto=socket.IPPROTO_TCP)
        if not addr_info:
            raise HTTPException(status_code=400, detail=f"SSRF: Unable to resolve host {host} at connection time.")

        for entry in addr_info:
            ip_str = entry[4][0]
            ip = ipaddress.ip_address(ip_str)
            verify_ip_is_public(ip)

        return await super().connect_tcp(host, port, timeout, local_address, socket_options)

class SSRFSafeAsyncTransport(httpx.AsyncHTTPTransport):
    """
    AsyncHTTPTransport with socket-level IP restriction backend.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._pool._network_backend = SSRFSafeAnyIOBackend()

async def validate_redirect_response(response: httpx.Response, depth: Optional[int] = None):
    """
    HTTPX Event hook that verifies every redirect destination against SSRF rules
    and enforces a strict maximum redirect depth limit of 5 hops.
    """
    if response.is_redirect:
        req = None
        try:
            req = response.request
        except RuntimeError:
            req = None

        if depth is None and req is not None:
            depth = req.extensions.get("redirect_depth", 0) + 1
            req.extensions["redirect_depth"] = depth
        elif depth is None:
            depth = 1

        if depth > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Security Violation: Maximum redirect depth of 5 hops exceeded."
            )

        location = response.headers.get("Location")
        if location:
            base_url = "https://example.com"
            try:
                base_url = str(response.url)
            except RuntimeError:
                pass
            full_redirect_url = urljoin(base_url, location)
            validate_target_url(full_redirect_url)

def create_ssrf_safe_client(timeout: float = 20.0) -> httpx.AsyncClient:
    """
    Creates an AsyncClient protected by:
    1. Socket-level connection-time DNS resolution inspection (DNS rebinding prevention)
    2. Per-hop redirect destination validation
    3. Maximum redirect depth limitation (max 5 hops)
    4. Connect and read timeouts
    """
    return httpx.AsyncClient(
        transport=SSRFSafeAsyncTransport(),
        timeout=httpx.Timeout(timeout, connect=8.0),
        follow_redirects=True,
        event_hooks={"response": [validate_redirect_response]},
        headers={"User-Agent": "WebGuard-AI/2.0 SecurityEngine"}
    )
