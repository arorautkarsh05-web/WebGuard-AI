import time
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.models.models import (
    Incident,
    Website,
    MonitoringResult,
    Competitor,
    Product,
    PriceHistory,
    TinyFishExecution,
    AIAction
)
from backend.app.services.llm_service import llm_service
from backend.app.services.tinyfish_service import tinyfish_service

class UnifiedIntelligenceEngine:
    """
    Unified Intelligence Engine correlating signals across:
    - Website Health Monitoring (realtime latency, error codes, HTTP probe history)
    - Semantic Change Detection (DOM releases, structural updates)
    - Competitor Intelligence (pricing cuts, promotional campaigns, market shifts)
    - TinyFish Agent (UI interaction telemetry, synthetic user execution)
    - Historical Incidents (recurrence patterns, MTTR)
    
    Generates evidence-driven investigations partitioned into:
    - CONFIRMED FACTS: Direct evidence from HTTP responses, DOM diffs, agent execution.
    - OBSERVATIONS: Measured latency, status code distributions, DOM change size.
    - HYPOTHESES: Inferred root causes with stated rationale and verification steps.
    - UNKNOWN: What cannot be determined from available telemetry.
    
    Confidence Score Formula (Calibrated & Non-Arbitrary):
    Score = clamp(
        base (0.10)
        + telemetry_failure_weight (+0.25 if HTTP 5xx or connection fault detected)
        + semantic_dom_change_weight (+0.20 if DOM structural change within 24h)
        + browser_agent_weight (+0.25 if synthetic agent reproduced failure)
        + historical_recurrence_weight (+0.15 if matching prior incident signature)
        + signal_diversity_bonus (+0.10 if >= 3 distinct sources agree, +0.05 if 2 sources agree)
        - contradictory_telemetry_penalty (-0.30 if subsequent probes return 200 OK)
        - contradictory_browser_penalty (-0.20 if browser agent observed normal page),
        0.05,
        0.98
    )
    If Score < 0.40: Reports 'Insufficient evidence to establish root cause. Further investigation required.'
    """

    def calculate_confidence_score(
        self,
        telemetry_failures: List[Any],
        telemetry_successes: List[Any],
        recent_changes: List[Any],
        agent_observed_failure: bool,
        agent_observed_success: bool,
        prior_incidents: List[Any]
    ) -> Dict[str, Any]:
        """
        Calculates a calibrated, non-arbitrary confidence score backed by signal diversity,
        temporal relevance, browser agent reproduction, and contradictory signal penalty.
        """
        base = 0.10
        telemetry_weight = 0.25 if len(telemetry_failures) > 0 else 0.0
        dom_weight = 0.20 if len(recent_changes) > 0 else 0.0
        browser_weight = 0.25 if agent_observed_failure else 0.0
        history_weight = 0.15 if len(prior_incidents) > 0 else 0.0

        # Measure positive agreeing sources
        positive_sources = 0
        if telemetry_weight > 0: positive_sources += 1
        if dom_weight > 0: positive_sources += 1
        if browser_weight > 0: positive_sources += 1
        if history_weight > 0: positive_sources += 1

        diversity_bonus = 0.10 if positive_sources >= 3 else (0.05 if positive_sources >= 2 else 0.0)

        # Contradictory evidence penalties
        contradiction_penalty = 0.0
        # If there are failures but recent probes are predominantly healthy 200 OK (intermittent flap)
        if len(telemetry_failures) > 0 and len(telemetry_successes) > len(telemetry_failures):
            contradiction_penalty += 0.30
        # If synthetic browser agent loaded the page cleanly with 0 errors
        if agent_observed_success and not agent_observed_failure:
            contradiction_penalty += 0.20

        raw_score = base + telemetry_weight + dom_weight + browser_weight + history_weight + diversity_bonus - contradiction_penalty
        calibrated_score = round(max(0.05, min(0.98, raw_score)), 2)

        return {
            "score": calibrated_score,
            "formula": "clamp(base(0.10) + telemetry(0.25) + dom(0.20) + browser(0.25) + history(0.15) + diversity_bonus(0.05-0.10) - contradiction_penalty(0.20-0.30), 0.05, 0.98)",
            "components": {
                "base": base,
                "telemetry_signal": telemetry_weight,
                "dom_change_signal": dom_weight,
                "browser_agent_signal": browser_weight,
                "historical_recurrence_signal": history_weight,
                "signal_diversity_bonus": diversity_bonus,
                "contradictory_penalty": contradiction_penalty
            },
            "agreeing_sources_count": positive_sources,
            "is_sufficient": calibrated_score >= 0.40
        }

    async def correlate_incident_intelligence(
        self,
        incident: Incident,
        db: Session
    ) -> Dict[str, Any]:
        target_website = None
        if incident.website_id:
            target_website = db.query(Website).filter(Website.id == incident.website_id).first()

        target_url = (incident.evidence or {}).get("url") or (target_website.url if target_website else "https://example.com")
        evidence_signals: List[Dict[str, Any]] = []
        historical_context: Dict[str, Any] = {}
        now_iso = datetime.now(timezone.utc).isoformat()

        # 1. Health Monitoring Telemetry
        recent_probes = []
        if target_website:
            recent_probes = (
                db.query(MonitoringResult)
                .filter(MonitoringResult.website_id == target_website.id)
                .order_by(MonitoringResult.created_at.desc())
                .limit(10)
                .all()
            )
        
        telemetry_failures = [p for p in recent_probes if (p.http_status_code and p.http_status_code >= 400) or p.status == "failure"]
        telemetry_successes = [p for p in recent_probes if (p.http_status_code and 200 <= p.http_status_code < 400) and p.status != "failure"]
        avg_latency = (
            sum(p.response_time_ms for p in recent_probes if p.response_time_ms) / len(recent_probes)
            if recent_probes else 0
        )
        
        evidence_signals.append({
            "source": "health_monitor",
            "probes_evaluated": len(recent_probes),
            "failed_probes": len(telemetry_failures),
            "successful_probes": len(telemetry_successes),
            "latest_http_status": recent_probes[0].http_status_code if recent_probes else None,
            "average_latency_ms": round(avg_latency, 1),
            "error_messages": [p.error_message for p in telemetry_failures[:3] if p.error_message]
        })

        # 2. Correlate Semantic Page Changes (DOM diffs, release markers)
        one_day_ago = datetime.now(timezone.utc) - timedelta(days=1)
        recent_changes = []
        if target_website:
            recent_changes = (
                db.query(Incident)
                .filter(
                    Incident.website_id == target_website.id,
                    Incident.title.like("Page Change:%"),
                    Incident.created_at >= one_day_ago
                )
                .order_by(Incident.created_at.desc())
                .limit(5)
                .all()
            )

        if recent_changes:
            evidence_signals.append({
                "source": "semantic_change_detector",
                "correlated_changes_count": len(recent_changes),
                "latest_change_title": recent_changes[0].title,
                "latest_change_time": recent_changes[0].created_at.isoformat(),
                "temporal_correlation_detected": True
            })
        else:
            evidence_signals.append({
                "source": "semantic_change_detector",
                "temporal_correlation_detected": False,
                "note": "No DOM or deployment modifications detected in prior 24 hours."
            })

        # 3. Correlate Competitor Pricing & Market Pressure
        competitors = (
            db.query(Competitor)
            .filter(Competitor.organization_id == incident.organization_id)
            .all()
        )
        recent_price_drops = []
        for comp in competitors:
            for cp in comp.products:
                history = (
                    db.query(PriceHistory)
                    .filter(PriceHistory.product_id == cp.id)
                    .order_by(PriceHistory.captured_at.desc())
                    .limit(2)
                    .all()
                )
                if len(history) >= 2:
                    curr_price = history[0].price
                    prev_price = history[1].price
                    if curr_price and prev_price and curr_price < prev_price:
                        pct = ((prev_price - curr_price) / prev_price) * 100
                        recent_price_drops.append({
                            "competitor": comp.name,
                            "product": cp.name,
                            "drop_pct": round(pct, 1),
                            "current_price": curr_price,
                            "detected_at": history[0].captured_at.isoformat()
                        })

        historical_context["market_pressure"] = {
            "monitored_competitors": len(competitors),
            "recent_price_drops": recent_price_drops
        }

        # 4. TinyFish Agent Synthetic Browser Inspection
        agent_telemetry = None
        agent_observed_failure = False
        agent_observed_success = False

        if target_url and tinyfish_service.api_key:
            try:
                agent_res = await tinyfish_service.run_agent(
                    url=target_url,
                    goal=f"Investigate incident on {target_url}. Check if the core page loads and report visible errors or broken elements.",
                    db=db,
                    organization_id=incident.organization_id
                )
                if agent_res.get("success"):
                    agent_telemetry = {
                        "status": agent_res.get("status"),
                        "steps": agent_res.get("steps", []),
                        "result_summary": agent_res.get("result"),
                        "streaming_url": agent_res.get("streaming_url"),
                        "latency_ms": agent_res.get("latency_ms")
                    }
                    evidence_signals.append({
                        "source": "tinyfish_browser_agent",
                        "telemetry": agent_telemetry
                    })
                    summary_text = (agent_res.get("result") or "").lower()
                    if "error" in summary_text or "fail" in summary_text or "outage" in summary_text or "500" in summary_text or "502" in summary_text:
                        agent_observed_failure = True
                    else:
                        agent_observed_success = True
            except Exception as e:
                evidence_signals.append({
                    "source": "tinyfish_browser_agent",
                    "error": str(e)[:120]
                })

        # 5. Historical Incident Recurrence
        prior_incidents = (
            db.query(Incident)
            .filter(
                Incident.organization_id == incident.organization_id,
                Incident.id != incident.id,
                Incident.title == incident.title
            )
            .order_by(Incident.created_at.desc())
            .limit(5)
            .all()
        )
        historical_context["prior_occurrences_count"] = len(prior_incidents)

        # Calculate Calibrated Confidence Score
        confidence_meta = self.calculate_confidence_score(
            telemetry_failures=telemetry_failures,
            telemetry_successes=telemetry_successes,
            recent_changes=recent_changes,
            agent_observed_failure=agent_observed_failure,
            agent_observed_success=agent_observed_success,
            prior_incidents=prior_incidents
        )
        final_confidence = confidence_meta["score"]

        # 6. Check LLM availability
        incident_context = {
            "id": incident.id,
            "title": incident.title,
            "severity": incident.severity,
            "target_url": target_url,
            "evidence": incident.evidence or {}
        }

        llm_report = await llm_service.generate_investigation(
            incident_context=incident_context,
            evidence_signals=evidence_signals,
            historical_context=historical_context
        )

        # 7. Construct Evidence-Driven Findings Partitioned into 4 Strict Categories
        confirmed_facts: List[Dict[str, Any]] = []
        observations: List[Dict[str, Any]] = []
        hypotheses: List[Dict[str, Any]] = []
        unknown_factors: List[Dict[str, Any]] = []

        # Populate Confirmed Facts (Empirical proof from telemetry or browser)
        if telemetry_failures:
            first_fail = telemetry_failures[0]
            confirmed_facts.append({
                "finding": f"Target endpoint returned HTTP {first_fail.http_status_code or 'Failure'} error during automated probe.",
                "supporting_evidence": f"Status: {first_fail.http_status_code}, Latency: {first_fail.response_time_ms}ms, Error: {first_fail.error_message or 'None'}",
                "evidence_source": "health_monitor",
                "timestamp": first_fail.created_at.isoformat() if first_fail.created_at else now_iso,
                "confidence": 0.99,
                "alternative_explanation": "Transient edge proxy drop or intermittent upstream keep-alive reset.",
                "recommended_next_investigation": "Inspect upstream application error logs and gateway error rates."
            })
        if agent_observed_failure and agent_telemetry:
            confirmed_facts.append({
                "finding": "TinyFish browser agent detected visible rendering failure in Chromium automation sandbox.",
                "supporting_evidence": f"Execution summary: {agent_telemetry.get('result_summary')[:140]}",
                "evidence_source": "tinyfish_browser_agent",
                "timestamp": now_iso,
                "confidence": 0.95,
                "alternative_explanation": "Client-side bundle script loading timeout due to network throttling.",
                "recommended_next_investigation": "Review browser console log artifacts in TinyFish execution traces."
            })

        # Populate Observations (Neutral telemetry measurements)
        if recent_probes:
            observations.append({
                "finding": f"Recent probe response latency averaged {avg_latency:.1f}ms across {len(recent_probes)} probes.",
                "supporting_evidence": f"{len(telemetry_failures)} failed probes, {len(telemetry_successes)} successful probes in recent window.",
                "evidence_source": "health_monitor",
                "timestamp": now_iso,
                "confidence": 0.95,
                "alternative_explanation": "Regional routing variation across multi-AZ deployment.",
                "recommended_next_investigation": "Benchmark latency across distributed worker regions."
            })
        if recent_changes:
            latest_c = recent_changes[0]
            observations.append({
                "finding": f"Semantic DOM change '{latest_c.title}' detected within 24 hours prior to incident.",
                "supporting_evidence": f"Recorded at {latest_c.created_at.isoformat()}",
                "evidence_source": "semantic_change_detector",
                "timestamp": latest_c.created_at.isoformat(),
                "confidence": 0.90,
                "alternative_explanation": "Routine cosmetic or marketing copy change unrelated to core backend endpoints.",
                "recommended_next_investigation": "Compare DOM element tree diff for removed critical container IDs."
            })

        # Populate Hypotheses (Inferred root causes with rationale)
        if final_confidence >= 0.40:
            if recent_changes and telemetry_failures:
                hypotheses.append({
                    "finding": "Deployment regression: recent DOM/code release introduced endpoint incompatibility or broke runtime dependencies.",
                    "supporting_evidence": f"Temporal alignment: change occurred at {recent_changes[0].created_at.isoformat()} prior to probe failure.",
                    "evidence_source": "cross_module_correlation",
                    "timestamp": now_iso,
                    "confidence": final_confidence,
                    "alternative_explanation": "Unrelated infrastructure outage coincidentally occurred after release.",
                    "recommended_next_investigation": "Verify Git commit SHA associated with release and run CI rollback canary."
                })
            elif telemetry_failures:
                hypotheses.append({
                    "finding": "Upstream infrastructure saturation or edge reverse-proxy connection failure.",
                    "supporting_evidence": f"HTTP status codes {set(p.http_status_code for p in telemetry_failures if p.http_status_code)} observed.",
                    "evidence_source": "health_monitor",
                    "timestamp": now_iso,
                    "confidence": final_confidence,
                    "alternative_explanation": "Third-party dependency or external API outage blocking request lifecycle.",
                    "recommended_next_investigation": "Examine reverse proxy access logs and server resource utilization."
                })
        else:
            # Insufficient evidence
            hypotheses.append({
                "finding": "Insufficient evidence to establish root cause. Further investigation required.",
                "supporting_evidence": f"Calibrated confidence score is {final_confidence} (threshold: 0.40). Positive telemetry signals: {len(telemetry_failures)}, Contradictory signals: {len(telemetry_successes)}.",
                "evidence_source": "confidence_calibrator",
                "timestamp": now_iso,
                "confidence": final_confidence,
                "alternative_explanation": "Intermittent network blip or non-reproducible client-side glitch.",
                "recommended_next_investigation": "Run 3 successive synthetic browser probes, inspect ingress gateway access logs, and query DNS resolution from multiple POPs."
            })

        # Populate Unknown Factors (Telemetry gaps that cannot be determined)
        unknown_factors.append({
            "finding": "Internal database connection pool state and slow query log.",
            "supporting_evidence": "Database telemetry is outside synthetic probe observability scope without APM integration.",
            "evidence_source": "telemetry_gap_audit",
            "timestamp": now_iso,
            "confidence": 1.0,
            "alternative_explanation": "Database may be operating normally despite edge proxy failures.",
            "recommended_next_investigation": "Query APM metrics or DB connection pool saturation telemetry directly."
        })
        if not agent_telemetry:
            unknown_factors.append({
                "finding": "Full client-side DOM JavaScript console error stack trace.",
                "supporting_evidence": "Synthetic browser agent did not execute or report console exceptions for this event.",
                "evidence_source": "browser_agent_audit",
                "timestamp": now_iso,
                "confidence": 1.0,
                "alternative_explanation": "JavaScript bundle might have executed without uncaught exceptions.",
                "recommended_next_investigation": "Trigger immediate TinyFish synthetic agent browser run on target endpoint."
            })

        # Business Impact Analysis
        business_risk = "LOW"
        churn_risk = "Minimal user friction if resolved within SLA bounds."
        if incident.severity.upper() in ("CRITICAL", "HIGH"):
            business_risk = "HIGH"
            churn_risk = "Elevated risk of transaction abandonment during active downtime."
        
        if recent_price_drops:
            churn_risk += f" NOTE: Simultaneous competitor discounting detected ({recent_price_drops[0]['competitor']} lowered prices by {recent_price_drops[0]['drop_pct']}%)."

        # Build Synthesis Report
        root_cause_headline = (
            hypotheses[0]["finding"] if hypotheses else "Root cause analysis completed."
        )

        report: Dict[str, Any] = {
            "analysis_method": (
                f"llm-synthesis ({llm_service.get_active_provider()}:{llm_service.model})"
                if llm_report
                else "deterministic-correlation-engine (LLM unconfigured or offline)"
            ),
            "incident_title": incident.title,
            "severity": incident.severity.lower(),
            "root_cause_summary": root_cause_headline,
            "confidence": final_confidence,
            "confidence_breakdown": confidence_meta,
            "confidence_rationale": (
                f"Confidence score of {final_confidence} calculated from telemetry failures (+{confidence_meta['components']['telemetry_signal']}), "
                f"DOM changes (+{confidence_meta['components']['dom_change_signal']}), browser agent (+{confidence_meta['components']['browser_agent_signal']}), "
                f"signal diversity (+{confidence_meta['components']['signal_diversity_bonus']}), less contradiction penalty (-{confidence_meta['components']['contradictory_penalty']})."
            ),
            # Strict 4-Category Findings Partition
            "confirmed_facts": confirmed_facts,
            "observations": observations,
            "hypotheses": hypotheses,
            "unknown": unknown_factors,
            # Backwards compatibility fields
            "confirmed_failures": [f["finding"] for f in confirmed_facts] or ["No permanent fatal failure recorded."],
            "possible_causes": [h["finding"] for h in hypotheses],
            "recommended_actions": [
                f"Execute automated synthetic verification probe against {target_url}",
                "Purge CDN cache or trigger rollback to previous healthy build revision",
                "Dispatch incident brief with attached telemetry to operations team"
            ],
            "business_impact": {
                "risk_level": business_risk,
                "user_churn_risk": churn_risk,
                "revenue_impact_estimate": "High risk of transaction loss" if business_risk == "HIGH" else "Nominal",
                "sla_breach_probability": "High" if len(telemetry_failures) >= 3 else "Low"
            },
            "requires_human_approval": True,
            "evidence_signals": evidence_signals,
            "supporting_evidence": evidence_signals,
            "investigated_at": now_iso
        }

        # If LLM generated a report, merge high-level narrative while preserving strict evidence partitioning
        if llm_report and isinstance(llm_report, dict):
            if "recommended_actions" in llm_report:
                report["recommended_actions"] = llm_report["recommended_actions"]
            if "business_impact" in llm_report and isinstance(llm_report["business_impact"], dict):
                report["business_impact"].update(llm_report["business_impact"])

        return report

intelligence_engine = UnifiedIntelligenceEngine()
