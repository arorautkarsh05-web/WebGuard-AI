import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from backend.app.services.tinyfish_service import tinyfish_service
from backend.app.models.models import Competitor, Product, PriceHistory, Incident

class CompetitorService:
    @staticmethod
    def _extract_prices_from_text(text: str) -> List[float]:
        # Match currency symbols followed by decimal or integer numbers
        pattern = r'[\$€£]\s*([0-9]+(?:\.[0-9]{2})?)'
        matches = re.findall(pattern, text)
        prices = []
        for m in matches:
            try:
                val = float(m)
                if 1.0 <= val <= 100000.0:  # Sensible range for SaaS / product prices
                    prices.append(val)
            except ValueError:
                continue
        return prices

    async def scan_competitor(self, competitor: Competitor, db: Session) -> Dict[str, Any]:
        """
        Uses TinyFish Fetch and Search to inspect competitor website,
        extract pricing points, track price changes, and record historical benchmarks.
        """
        # Fetch homepage or pricing page
        target_url = competitor.website_url
        fetch_res = await tinyfish_service.fetch(
            url=target_url,
            db=db,
            organization_id=competitor.organization_id
        )

        content = fetch_res.get("content", "")
        detected_prices = self._extract_prices_from_text(content)

        # Check existing products for this competitor
        products = db.query(Product).filter(Product.competitor_id == competitor.id).all()
        scanned_products = []

        if not products and detected_prices:
            # Auto-create sample monitored tiers/products from discovered pricing
            unique_prices = sorted(list(set(detected_prices)))[:3]
            tier_names = ["Starter Plan", "Professional Plan", "Enterprise Tier"]
            for idx, price in enumerate(unique_prices):
                name = tier_names[idx] if idx < len(tier_names) else f"Monitored Product #{idx+1}"
                prod = Product(
                    competitor_id=competitor.id,
                    name=name,
                    url=target_url,
                    current_price=price,
                    currency="USD",
                    availability_status="in_stock",
                    metadata_json={"source": "auto_extracted"},
                    last_scraped_at=datetime.now(timezone.utc)
                )
                db.add(prod)
                db.flush()
                # Record price history
                history = PriceHistory(
                    product_id=prod.id,
                    price=price,
                    currency="USD",
                    availability=True,
                    promotional_details="Initial detected market benchmark"
                )
                db.add(history)
                products.append(prod)
        else:
            # Update existing products with latest price points
            for idx, prod in enumerate(products):
                if detected_prices and idx < len(detected_prices):
                    new_price = detected_prices[idx]
                    old_price = prod.current_price or new_price
                    price_diff = new_price - old_price
                    pct_change = (price_diff / old_price * 100) if old_price > 0 else 0

                    prod.current_price = new_price
                    prod.last_scraped_at = datetime.now(timezone.utc)

                    history = PriceHistory(
                        product_id=prod.id,
                        price=new_price,
                        currency=prod.currency,
                        availability=True,
                        promotional_details=f"Scan update: {round(pct_change, 1)}% adjustment" if abs(pct_change) > 0.1 else "Standard pricing"
                    )
                    db.add(history)

                    # If competitor discounted prices significantly (> 10%), raise an incident
                    if pct_change <= -10.0:
                        incident = Incident(
                            organization_id=competitor.organization_id,
                            website_id=None,
                            task_id=None,
                            title=f"Competitor Price Reduction: {competitor.name} lowered {prod.name} by {abs(round(pct_change))}%",
                            severity="High",
                            status="Open",
                            root_cause_summary=f"Competitor reduced price from ${old_price} to ${new_price}.",
                            evidence={
                                "competitor": competitor.name,
                                "product": prod.name,
                                "old_price": old_price,
                                "new_price": new_price,
                                "change_percentage": round(pct_change, 2)
                            },
                            recommended_actions=[
                                "Review your product positioning and competitive feature advantages",
                                "Assess whether a promotional counter-campaign is necessary",
                                "Monitor customer retention metrics"
                            ]
                        )
                        db.add(incident)

        competitor.last_monitored_at = datetime.now(timezone.utc)
        db.commit()

        return {
            "success": True,
            "competitor_id": competitor.id,
            "detected_price_count": len(detected_prices),
            "sample_prices": detected_prices[:5],
            "products_tracked": len(products)
        }

competitor_service = CompetitorService()

