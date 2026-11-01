import pytest
from datetime import datetime, timezone
from backend.app.services.intelligence_engine import intelligence_engine

def test_confidence_calibration_clear_failure():
    """Tests high confidence score when telemetry failure, DOM change, and recurrence correlate."""
    class MockProbe:
        def __init__(self, status_code, status="failure"):
            self.http_status_code = status_code
            self.status = status

    class MockIncident:
        def __init__(self, title):
            self.title = title

    telemetry_failures = [MockProbe(502), MockProbe(504)]
    telemetry_successes = []
    recent_changes = [MockIncident("Page Change: Checkout Button Removed")]
    prior_incidents = [MockIncident("Target Unreachable")]

    score_meta = intelligence_engine.calculate_confidence_score(
        telemetry_failures=telemetry_failures,
        telemetry_successes=telemetry_successes,
        recent_changes=recent_changes,
        agent_observed_failure=True,
        agent_observed_success=False,
        prior_incidents=prior_incidents
    )

    assert score_meta["is_sufficient"] is True
    # Base(0.10) + telemetry(0.25) + dom(0.20) + browser(0.25) + history(0.15) + diversity_bonus(0.10) = 1.05 -> clamped to 0.98
    assert score_meta["score"] >= 0.90
    assert score_meta["components"]["contradictory_penalty"] == 0.0

def test_confidence_calibration_insufficient_evidence():
    """Tests that weak or conflicting signals produce < 0.40 and trigger insufficient evidence state."""
    class MockProbe:
        def __init__(self, status_code, status="success"):
            self.http_status_code = status_code
            self.status = status

    # Only 1 ambiguous failure surrounded by 5 successful probes
    telemetry_failures = [MockProbe(500, "failure")]
    telemetry_successes = [MockProbe(200), MockProbe(200), MockProbe(200), MockProbe(200)]
    recent_changes = []
    prior_incidents = []

    score_meta = intelligence_engine.calculate_confidence_score(
        telemetry_failures=telemetry_failures,
        telemetry_successes=telemetry_successes,
        recent_changes=recent_changes,
        agent_observed_failure=False,
        agent_observed_success=True,  # Browser succeeded!
        prior_incidents=prior_incidents
    )

    # Base(0.10) + telemetry(0.25) - contradiction_telemetry(0.30) - contradiction_browser(0.20) = -0.15 -> clamped to 0.05
    assert score_meta["score"] < 0.40
    assert score_meta["is_sufficient"] is False
    assert score_meta["components"]["contradictory_penalty"] > 0.0

