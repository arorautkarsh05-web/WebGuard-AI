from typing import List, Dict, Any
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.core.database import get_db
from backend.app.core.security import validate_target_url
from backend.app.models.models import Competitor, Product, PriceHistory, User
from backend.app.schemas.schemas import CompetitorCreate, CompetitorOut, ProductCreate, ProductOut
from backend.app.api.deps import get_current_user
from backend.app.services.competitor_service import competitor_service
from backend.app.services.tinyfish_service import tinyfish_service

router = APIRouter()

@router.post("", response_model=CompetitorOut)
async def create_competitor(
    comp_in: CompetitorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    valid_url = validate_target_url(comp_in.website_url)
    domain = comp_in.domain or urlparse(valid_url).netloc

    competitor = Competitor(
        organization_id=current_user.organization_id,
        name=comp_in.name,
        domain=domain,
        website_url=valid_url,
        description=comp_in.description
    )
    db.add(competitor)
    db.commit()
    db.refresh(competitor)

    # Trigger initial scan
    await competitor_service.scan_competitor(competitor, db)
    db.refresh(competitor)
    return competitor

@router.get("", response_model=List[CompetitorOut])
def get_competitors(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    competitors = (
        db.query(Competitor)
        .filter(Competitor.organization_id == current_user.organization_id)
        .order_by(Competitor.created_at.desc())
        .all()
    )
    return competitors

@router.post("/discover")
async def discover_competitors(
    query: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Leverages TinyFish Search API to discover competitor websites and market alternatives.
    """
    search_query = f"top competitors and alternatives for {query} pricing software"
    res = await tinyfish_service.search(
        query=search_query,
        db=db,
        organization_id=current_user.organization_id
    )
    return res

@router.post("/{competitor_id}/products", response_model=ProductOut)
def add_competitor_product(
    competitor_id: str,
    prod_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    competitor = (
        db.query(Competitor)
        .filter(Competitor.id == competitor_id, Competitor.organization_id == current_user.organization_id)
        .first()
    )
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found.")

    valid_url = validate_target_url(prod_in.url)

    product = Product(
        competitor_id=competitor.id,
        name=prod_in.name,
        url=valid_url,
        current_price=prod_in.current_price,
        currency=prod_in.currency or "USD",
        availability_status=prod_in.availability_status or "in_stock",
        metadata_json=prod_in.metadata_json or {}
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    if prod_in.current_price is not None:
        history = PriceHistory(
            product_id=product.id,
            price=prod_in.current_price,
            currency=product.currency,
            availability=True,
            promotional_details="Initial record"
        )
        db.add(history)
        db.commit()

    return product

@router.get("/{competitor_id}/products", response_model=List[ProductOut])
def get_competitor_products(
    competitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    competitor = (
        db.query(Competitor)
        .filter(Competitor.id == competitor_id, Competitor.organization_id == current_user.organization_id)
        .first()
    )
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found.")

    products = (
        db.query(Product)
        .filter(Product.competitor_id == competitor_id)
        .order_by(Product.created_at.desc())
        .all()
    )
    return products

@router.post("/{competitor_id}/scan")
async def trigger_competitor_scan(
    competitor_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    competitor = (
        db.query(Competitor)
        .filter(Competitor.id == competitor_id, Competitor.organization_id == current_user.organization_id)
        .first()
    )
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found.")

    scan_res = await competitor_service.scan_competitor(competitor, db)
    return scan_res

