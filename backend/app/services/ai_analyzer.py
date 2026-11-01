from typing import Dict, Any, List

class AIIncidentAnalyzer:
    @staticmethod
    def analyze_incident(
        incident_type: str,
        observations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Synthesizes an intelligent incident report.
        Strictly distinguishes confirmed observations from potential explanations.
        """
        confirmed_observations: List[str] = []
        potential_explanations: List[str] = []
        recommended_actions: List[str] = []
        severity = "Medium"
        title = "Automated Incident Assessment"

        if incident_type == "downtime":
            status_code = observations.get("status_code")
            latency = observations.get("latency_ms", 0)
            target = observations.get("url", "Endpoint")

            if status_code:
                confirmed_observations.append(f"HTTP request to {target} returned status code {status_code}.")
            else:
                confirmed_observations.append(f"Connection to {target} timed out or failed to establish.")
            confirmed_observations.append(f"Observed roundtrip latency was {round(latency, 2)}ms.")

            if status_code and status_code >= 500:
                severity = "Critical"
                title = f"Critical Service Outage on {target}"
                potential_explanations.extend([
                    "Upstream web application server crashed or ran out of memory.",
                    "Database connection pool exhausted preventing request fulfillment.",
                    "Recent unhandled code exception deployed to production."
                ])
                recommended_actions.extend([
                    "Verify application server container/process health status.",
                    "Review centralized logging for unhandled exceptions.",
                    "Roll back recent production deployment if issue correlated with release time."
                ])
            else:
                severity = "High"
                title = f"Service Degradation / Unavailability on {target}"
                potential_explanations.extend([
                    "Firewall or DDoS protection rule blocking monitoring agent IP range.",
                    "DNS resolution failure or expired SSL/TLS certificate.",
                    "Edge CDN routing configuration error."
                ])
                recommended_actions.extend([
                    "Inspect edge firewall and CDN routing policies.",
                    "Verify SSL certificate expiration date and chain.",
                    "Test endpoint reachability across alternative regional networks."
                ])

        elif incident_type == "functional_test_failure":
            workflow = observations.get("workflow", "User Workflow")
            failed_step = observations.get("failed_step", "Execution step")
            error_details = observations.get("error", "Action failed")

            confirmed_observations.append(f"Functional browser test '{workflow}' failed at step: {failed_step}.")
            confirmed_observations.append(f"Automated agent reported error: '{error_details}'.")

            severity = "High"
            title = f"Workflow Failure: {workflow} Failed During Synthetic Execution"
            potential_explanations.extend([
                "DOM selector or element ID changed during recent frontend deployment.",
                "JavaScript error blocked submission form or button click event.",
                "Third-party payment gateway or analytics script failing to load."
            ])
            recommended_actions.extend([
                "Inspect client-side browser console errors on the target flow.",
                "Verify whether input element IDs or CSS classes were altered.",
                "Run manual smoke test on the checkout or signup funnel."
            ])

        elif incident_type == "unexpected_change":
            change_type = observations.get("change_type", "Content change")
            diff_lines = observations.get("diff_snippet", "")

            confirmed_observations.append(f"Automated comparison detected {change_type}.")
            if diff_lines:
                confirmed_observations.append(f"Sample diff detected: {diff_lines[:150]}...")

            if "pricing" in change_type.lower():
                severity = "High"
                title = "Critical Pricing or Subscription Tier Modification Detected"
                potential_explanations.extend([
                    "Marketing or commercial team launched updated pricing packages.",
                    "A/B testing software presented an alternate pricing experiment.",
                    "Unauthorized content modification or CMS publication mistake."
                ])
                recommended_actions.extend([
                    "Cross-reference changes with internal commercial roadmap.",
                    "Check if dynamic A/B test is serving divergent tiers to visitors."
                ])
            else:
                severity = "Low"
                title = "Routine Webpage Content Modification"
                potential_explanations.extend([
                    "Content editor published routine copy or asset updates."
                ])
                recommended_actions.extend([
                    "Review diff against CMS audit logs to ensure intentionality."
                ])

        elif incident_type == "competitor_alert":
            competitor = observations.get("competitor", "Competitor")
            change_pct = observations.get("change_percentage", 0)

            confirmed_observations.append(f"Competitor {competitor} adjusted prices by {change_pct}%.")
            severity = "High" if abs(change_pct) >= 15 else "Medium"
            title = f"Competitive Pricing Alert: {competitor} Adjusted Rates"
            potential_explanations.extend([
                "Competitor launched aggressive seasonal promotional campaign.",
                "Competitor restructured package inclusions or removed premium features."
            ])
            recommended_actions.extend([
                "Review value proposition and feature comparison matrices.",
                "Alert sales and product marketing teams."
            ])

        return {
            "title": title,
            "severity": severity,
            "confirmed_observations": confirmed_observations,
            "potential_explanations": potential_explanations,
            "recommended_actions": recommended_actions,
            "summary": " | ".join(confirmed_observations)
        }

ai_analyzer = AIIncidentAnalyzer()

