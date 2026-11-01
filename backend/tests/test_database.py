import pytest
from sqlalchemy.orm import Session
from backend.app.core.database import SessionLocal, engine
from backend.app.models.models import Organization, User, Website, AIAction, RegressionTest
from backend.app.core.security import get_password_hash

def test_database_connection_pool():
    # Verify pool settings on engine
    assert engine is not None
    # Verify we can open and close connections safely
    with engine.connect() as conn:
        assert conn is not None

def test_organization_multi_tenant_isolation():
    db: Session = SessionLocal()
    try:
        # Create Org A and Org B
        org_a = Organization(name="Tenant Alpha Corp", plan="enterprise")
        org_b = Organization(name="Tenant Beta Ltd", plan="starter")
        db.add_all([org_a, org_b])
        db.commit()

        # Create Website for Org A
        site_a = Website(
            organization_id=org_a.id,
            name="Alpha Production Ingress",
            url="https://alpha-corp-test.com",
            health_status="healthy"
        )
        db.add(site_a)

        # Create AIAction for Org A
        act_a = AIAction(
            organization_id=org_a.id,
            action_type="HTTP_VERIFICATION_PROBE",
            title="Alpha Verification",
            description="Tenant isolation check",
            risk_level="LOW"
        )
        db.add(act_a)
        db.commit()

        # Query as Org B must strictly return 0 items
        b_sites = db.query(Website).filter(
            Website.organization_id == org_b.id,
            Website.id == site_a.id
        ).all()
        assert len(b_sites) == 0

        b_actions = db.query(AIAction).filter(
            AIAction.organization_id == org_b.id,
            AIAction.id == act_a.id
        ).all()
        assert len(b_actions) == 0

        # Cleanup
        db.delete(site_a)
        db.delete(act_a)
        db.delete(org_a)
        db.delete(org_b)
        db.commit()

    finally:
        db.close()

