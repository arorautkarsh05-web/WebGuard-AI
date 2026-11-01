import pytest
import asyncio
from backend.app.services.tinyfish_service import tinyfish_service

@pytest.mark.asyncio
async def test_live_tinyfish_search():
    if not tinyfish_service.api_key:
        pytest.skip("TINYFISH_API_KEY not configured for live tests")

    res = await tinyfish_service.search("FastAPI documentation")
    assert res.get("success") is True
    assert "results" in res
    assert len(res["results"]) > 0
    assert any("fastapi" in r.get("url", "").lower() for r in res["results"])

@pytest.mark.asyncio
async def test_live_tinyfish_fetch():
    if not tinyfish_service.api_key:
        pytest.skip("TINYFISH_API_KEY not configured for live tests")

    res = await tinyfish_service.fetch("https://example.com")
    assert res.get("success") is True
    assert res.get("fallback") is False  # Confirms native TinyFish Fetch cloud run!
    assert res.get("service_type") == "fetch"
    assert "Example Domain" in res.get("content", "") or "documentation examples" in res.get("content", "")

@pytest.mark.asyncio
async def test_tinyfish_safety_policy_blocks_financial_actions():
    # Attempting to run a payment/checkout goal must immediately raise ValueError
    with pytest.raises(ValueError, match="Action Prohibited by Safety Policy"):
        await tinyfish_service.run_agent(
            url="https://example.com",
            goal="Enter credit card number and pay checkout balance"
        )

    with pytest.raises(ValueError, match="Action Prohibited by Safety Policy"):
        await tinyfish_service.run_agent(
            url="https://example.com",
            goal="Click buy now and complete purchase"
        )

