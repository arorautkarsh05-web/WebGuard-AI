import pytest
from backend.app.services.remediation.base import RemediationStatus, RemediationResult
from backend.app.services.remediation.cdn_adapter import cdn_adapter
from backend.app.services.remediation.k8s_adapter import k8s_adapter
from backend.app.services.remediation.cicd_adapter import cicd_adapter
from backend.app.services.remediation.verification import RemediationVerifier

@pytest.mark.asyncio
async def test_cloudflare_adapter_unconfigured():
    """Ensures CDN adapter returns honest integration_unconfigured without fake success claims."""
    result = await cdn_adapter.execute(parameters={"purge_all": True, "domain": "example.com"})
    assert result.status == RemediationStatus.INTEGRATION_UNCONFIGURED
    assert result.success is False
    assert "CLOUDFLARE_API_TOKEN" in result.message

@pytest.mark.asyncio
async def test_kubernetes_adapter_safety_boundaries():
    """Ensures K8s adapter blocks unauthorized deployments."""
    # Disallowed deployment name
    res = await k8s_adapter.execute(parameters={
        "action_sub_type": "scale",
        "service_name": "unauthorized-daemonset",
        "replica_delta": 2
    })
    assert res.status == RemediationStatus.FAILED
    assert "SECURITY VIOLATION" in res.message

    # Permitted deployment with cluster unconfigured
    res_unconfigured = await k8s_adapter.execute(parameters={
        "action_sub_type": "scale",
        "service_name": "webguard-backend",
        "replica_delta": 2
    })
    assert res_unconfigured.status == RemediationStatus.INTEGRATION_UNCONFIGURED
    assert "Kubernetes cluster integration is unconfigured" in res_unconfigured.message

@pytest.mark.asyncio
async def test_cicd_adapter_hmac_and_ssrf_safety():
    """Ensures CI/CD rollback webhook blocks SSRF targets and generates authentic HMAC signatures."""
    # SSRF blocking: attempting to send webhook to internal metadata
    res_ssrf = await cicd_adapter.execute(parameters={
        "webhook_url": "http://169.254.169.254/deploy",
        "target_version": "v1.4.0"
    })
    assert res_ssrf.status == RemediationStatus.FAILED
    assert "SSRF" in res_ssrf.message or "Blocked" in res_ssrf.message

    # Test HMAC payload signing
    payload_bytes = b'{"repo": "org/webguard", "action": "rollback"}'
    sig = cicd_adapter._compute_hmac_signature(payload_bytes, "test-webhook-secret-xyz")
    assert sig.startswith("sha256=")
    assert len(sig) == 71  # "sha256=" (7) + 64 hex chars

@pytest.mark.asyncio
async def test_remediation_verifier():
    """Tests comparative metric evaluation pre- vs post-remediation."""
    verifier = RemediationVerifier()

    verified, summary, details = await verifier.verify_remediation(
        target_url="https://example.com",
        pre_status_code=502,
        pre_latency_ms=3500.0,
        verify_browser=False
    )
    # example.com returns 200 OK
    assert verified is True
    assert "Resolved" in summary
    assert details["pre_status_code"] == 502
    assert details["post_status_code"] == 200
