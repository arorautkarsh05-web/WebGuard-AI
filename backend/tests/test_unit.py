import pytest
from backend.app.services.change_detector import change_detector
from backend.app.services.competitor_service import competitor_service
from backend.app.services.action_registry import (
    ALLOWLISTED_ACTIONS,
    ActionExecutor,
    VerificationProbeParams,
    ScaleReplicasParams
)

def test_action_registry_allowlist():
    assert "HTTP_VERIFICATION_PROBE" in ALLOWLISTED_ACTIONS
    assert "GENERATE_INCIDENT_BRIEF" in ALLOWLISTED_ACTIONS
    assert "FLUSH_CDN_EDGE_CACHE" in ALLOWLISTED_ACTIONS
    assert "SCALE_WORKER_POOL" in ALLOWLISTED_ACTIONS
    assert "ROLLBACK_LAST_DEPLOYMENT" in ALLOWLISTED_ACTIONS

    # Disallowed action rejection
    with pytest.raises(ValueError, match="not in the allowlisted action registry"):
        ActionExecutor.validate_action_params("EXECUTE_RAW_BASH", {"command": "rm -rf /"})

def test_action_params_validation():
    # Valid params
    params = ActionExecutor.validate_action_params(
        "HTTP_VERIFICATION_PROBE",
        {"target_url": "https://example.com", "expected_status_code": 200}
    )
    assert isinstance(params, VerificationProbeParams)
    assert params.target_url == "https://example.com"

    # Invalid params (status code outside HTTP range)
    with pytest.raises(Exception):
        ActionExecutor.validate_action_params(
            "HTTP_VERIFICATION_PROBE",
            {"target_url": "https://example.com", "expected_status_code": 999}
        )

def test_action_role_authorization():
    # User can approve LOW risk verification probe
    assert ActionExecutor.check_user_authorization("HTTP_VERIFICATION_PROBE", "user") is True
    # User cannot approve HIGH risk infrastructure scaling
    assert ActionExecutor.check_user_authorization("SCALE_WORKER_POOL", "user") is False
    # Admin can approve HIGH risk scaling
    assert ActionExecutor.check_user_authorization("SCALE_WORKER_POOL", "admin") is True

def test_semantic_change_classification():
    # Critical payment/checkout changes
    res_crit = change_detector._classify_change(
        diff_text="Payment failed: stripe checkout error occurred",
        prev_content="Standard checkout form",
        current_content="Payment failed: stripe checkout error occurred"
    )
    assert res_crit["classification"] == "Critical"
    assert res_crit["create_incident"] is True

    # High commercial change
    res_high = change_detector._classify_change(
        diff_text="New price is $199.99 per month",
        prev_content="Old pricing",
        current_content="New price is $199.99 per month"
    )
    assert res_high["classification"] == "High"

def test_competitor_price_extraction():
    sample_text = """
    Enterprise Growth Plan
    $199.99 / month billed monthly
    """
    res = competitor_service._extract_structured_pricing(sample_text, "https://competitor.com/pricing")
    assert len(res) > 0
    assert res[0]["price"] == 199.99
    assert res[0]["currency"] == "USD"
    assert res[0]["billing_period"] == "monthly"
