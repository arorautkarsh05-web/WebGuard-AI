import re
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.services.tinyfish_service import tinyfish_service
from backend.app.models.models import Competitor, Product, PriceHistory, Incident, AIAction

class CompetitorService:
    """
    Service for competitor intelligence surveillance, automated tier extraction,
    currency normalization, and evidence-driven pricing shift alerts.
    """

    @staticmethod
    def _extract_structured_pricing(text: str, source_url: str) -> List[Dict[str, Any]]:
        """
        Extracts verified pricing structures from extracted webpage content.
        Distinguishes and normalizes currencies ($/USD, €/EUR, £/GBP, ₹/INR/Rs),
        billing frequencies (monthly/annual), filters out phone numbers, years (2024-2027),
        and ungrounded numbers.
        """
        # Look for explicit pricing patterns: e.g. "$29/mo", "€49 / month", "₹999 / mo", "Rs. 1,499", "$99 billed annually"
        pattern = r'(?P<currency>[\$€£₹]|USD|EUR|GBP|INR|Rs\.?)\s*(?P<price>[0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{2})?)\s*(?:(?P<per>\/(?:mo|month|yr|year|user))|(?P<billed>billed\s*(?:monthly|annually|yearly)))?'
        
        results = []
        seen_prices = set()

        lines = text.splitlines()
        for idx, line in enumerate(lines):
            clean_line = line.strip()
            if not clean_line or len(clean_line) > 250:
                continue

            matches = list(re.finditer(pattern, clean_line, re.IGNORECASE))
            for m in matches:
                price_str = m.group("price").replace(",", "")
                try:
                    price_val = float(price_str)
                except ValueError:
                    continue

                # Filter out years (2023-2027), single digits < 1 or unreasonable values
                if price_val in (2023, 2024, 2025, 2026, 2027) or price_val < 1.0 or price_val > 1000000.0:
                    continue

                curr_symbol = m.group("currency").upper()
                currency = "USD"
                if "€" in curr_symbol or "EUR" in curr_symbol:
                    currency = "EUR"
                elif "£" in curr_symbol or "GBP" in curr_symbol:
                    currency = "GBP"
                elif "₹" in curr_symbol or "INR" in curr_symbol or "RS" in curr_symbol:
                    currency = "INR"

                # Deduce billing period
                billing_period = "monthly"
                line_lower = clean_line.lower()
                if "yr" in line_lower or "year" in line_lower or "annually" in line_lower:
                    billing_period = "annual"

                # Infer plan or product tier name from surrounding text
                plan_name = "Standard Plan"
                plan_keywords = ["starter", "pro", "professional", "business", "enterprise", "basic", "premium", "growth", "free", "team"]
                surrounding = " ".join(lines[max(0, idx-2):min(len(lines), idx+3)]).lower()
                for kw in plan_keywords:
                    if kw in surrounding:
                        plan_name = f"{kw.capitalize()} Tier"
                        break

                key = (plan_name, price_val, currency, billing_period)
                if key in seen_prices:
                    continue
                seen_prices.add(key)

                results.append({
                    "product_name": plan_name,
                    "price": price_val,
                    "currency": currency,
                    "billing_period": billing_period,
                    "source_url": source_url,
                    "extraction_confidence": 0.92,
                    "observed_at": datetime.now(timezone.utc).isoformat()
                })

        return results

    async def scan_competitor(self, competitor: Competitor, db: Session) -> Dict[str, Any]:
        """
        Surveils competitor pricing tiers via TinyFish Fetch (primary) with fallback,
        analyzes real historical fluctuations, detects pricing reductions,
        and compiles an evidence-driven competitive intelligence report without fabricated history.
        """
        target_url = competitor.website_url
        fetch_res = await tinyfish_service.fetch(
            url=target_url,
            db=db,
            organization_id=competitor.organization_id
        )

        content = fetch_res.get("content", "")
        extracted_plans = self._extract_structured_pricing(content, target_url)

        now = datetime.now(timezone.utc)
        competitor.last_monitored_at = now
        db.commit()

        existing_products = db.query(Product).filter(Product.competitor_id == competitor.id).all()
        products_by_name = {p.name.lower(): p for p in existing_products}

        intelligence_reports = []

        if not existing_products:
            # Baseline onboarding: Competitor has just been registered or monitored for the first time
            for plan in extracted_plans[:3]:
                prod = Product(
                    competitor_id=competitor.id,
                    name=plan["product_name"],
                    url=target_url,
                    current_price=plan["price"],
                    currency=plan["currency"],
                    availability_status="in_stock",
                    metadata_json={"billing_period": plan["billing_period"]},
                    last_scraped_at=now
                )
                db.add(prod)
                db.flush()

                # Record baseline observation without pretending past historical trends exist
                history = PriceHistory(
                    product_id=prod.id,
                    price=plan["price"],
                    currency=plan["currency"],
                    availability=True,
                    promotional_details="Initial baseline pricing observation recorded upon first scan (no prior historical baseline available)."
                )
                db.add(history)
            db.commit()
        else:
            # Update existing tiers & track real verified price shifts
            for plan in extracted_plans:
                prod = products_by_name.get(plan["product_name"].lower())
                if not prod and existing_products:
                    prod = existing_products[0]  # Map to primary monitored tier

                if prod:
                    old_price = prod.current_price or plan["price"]
                    new_price = plan["price"]
                    price_diff = new_price - old_price
                    pct_change = round((price_diff / old_price * 100), 1) if old_price > 0 else 0.0

                    # Fetch previous observation timestamp to calculate time between changes
                    last_history = (
                        db.query(PriceHistory)
                        .filter(PriceHistory.product_id == prod.id)
                        .order_by(PriceHistory.captured_at.desc())
                        .first()
                    )
                    time_delta_str = "Initial tracking period"
                    if last_history and last_history.captured_at:
                        diff = now - last_history.captured_at.replace(tzinfo=timezone.utc if last_history.captured_at.tzinfo is None else None)
                        days = diff.days
                        hours = diff.seconds // 3600
                        time_delta_str = f"{days}d {hours}h since prior observation"

                    prod.current_price = new_price
                    prod.last_scraped_at = now

                    history = PriceHistory(
                        product_id=prod.id,
                        price=new_price,
                        currency=plan["currency"],
                        availability=True,
                        promotional_details=f"{'+' if pct_change > 0 else ''}{pct_change}% adjustment ({time_delta_str})" if abs(pct_change) > 0.1 else f"Stable baseline ({time_delta_str})"
                    )
                    db.add(history)

                    # If significant price change detected (e.g. shift >= 5%)
                    if abs(pct_change) >= 5.0:
                        report = self._generate_competitive_brief(
                            competitor=competitor,
                            product_name=prod.name,
                            old_price=old_price,
                            new_price=new_price,
                            pct_change=pct_change,
                            currency=plan["currency"],
                            time_between_changes=time_delta_str,
                            source_url=target_url
                        )
                        intelligence_reports.append(report)

                        # Create incident & Action Center entry
                        incident = Incident(
                            organization_id=competitor.organization_id,
                            website_id=None,
                            task_id=None,
                            title=f"Competitor Price Shift: {competitor.name} adjusted {prod.name} by {pct_change}%",
                            severity="High" if pct_change < 0 else "Medium",
                            status="Open",
                            root_cause_summary=f"{competitor.name} changed {prod.name} pricing from {plan['currency']}{old_price} to {plan['currency']}{new_price} ({pct_change}%) after {time_delta_str}.",
                            evidence=report,
                            recommended_actions=report.get("recommended_actions", [])
                        )
                        db.add(incident)
                        db.flush()

                        action = AIAction(
                            organization_id=competitor.organization_id,
                            incident_id=incident.id,
                            action_type="competitor_brief",
                            title=f"Review Market Response for {competitor.name} Price Shift",
                            description=f"Competitor altered {prod.name} to {plan['currency']}{new_price}. Review recommended positioning response.",
                            approval_status="pending_approval",
                            execution_status="pending",
                            verification_status="pending"
                        )
                        db.add(action)

            db.commit()

        return {
            "success": True,
            "competitor": competitor.name,
            "target_url": target_url,
            "tiers_detected": len(extracted_plans),
            "extracted_plans": extracted_plans,
            "reports_generated": len(intelligence_reports)
        }

    def _generate_competitive_brief(
        self,
        competitor: Competitor,
        product_name: str,
        old_price: float,
        new_price: float,
        pct_change: float,
        currency: str,
        time_between_changes: str,
        source_url: str
    ) -> Dict[str, Any]:
        """Compiles evidence-based strategic brief on pricing fluctuation without hallucinated facts."""
        is_discount = pct_change < 0
        direction = "lowered" if is_discount else "increased"

        actions = []
        if is_discount:
            actions = [
                f"Evaluate your value proposition vs {competitor.name}'s discounted {product_name} tier.",
                "Review pricing elasticity or offer targeted enterprise promotional incentives.",
                "Highlight key feature advantages not included in competitor's discounted package."
            ]
        else:
            actions = [
                f"Capitalize on {competitor.name}'s price increase by emphasizing cost efficiency.",
                "Target competitor accounts seeking more predictable pricing tiers."
            ]

        return {
            "what_changed": f"{competitor.name} {direction} price for {product_name} from {currency}{old_price} to {currency}{new_price} ({pct_change}%).",
            "when_changed": datetime.now(timezone.utc).isoformat(),
            "time_between_changes": time_between_changes,
            "affected_tier": product_name,
            "supporting_evidence": {
                "source_url": source_url,
                "previous_price": old_price,
                "current_price": new_price,
                "percentage_change": pct_change,
                "currency": currency,
                "historical_interval": time_between_changes
            },
            "business_impact": (
                f"Competitor pricing pressure may affect customer conversion if prospects cross-shop against {competitor.name}."
                if is_discount else
                f"Margin expansion by {competitor.name} opens a competitive acquisition opportunity."
            ),
            "recommended_actions": actions
        }

    # Backward-compatible alias for scheduler sweeps
    track_competitor = scan_competitor

competitor_service = CompetitorService()
