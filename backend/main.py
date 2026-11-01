from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Organization
from backend.app.core.security import get_password_hash
from backend.app.services.scheduler import scheduler
from backend.app.api.v1 import (
    auth,
    websites,
    monitoring,
    competitors,
    incidents,
    dashboard,
    tinyfish,
    actions,
    regression
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Security hardening: Only provision demo admin in development/testing mode
        if settings.ENVIRONMENT != "production":
            user = db.query(User).first()
            if not user:
                org = Organization(name="Acme Enterprise", plan="enterprise")
                db.add(org)
                db.commit()
                db.refresh(org)

                admin_pw = settings.DEFAULT_ADMIN_PASSWORD or "WebGuardPass2026!"
                admin_user = User(
                    organization_id=org.id,
                    email=settings.DEFAULT_ADMIN_EMAIL or "admin@webguard.ai",
                    hashed_password=get_password_hash(admin_pw),
                    full_name="Security Admin",
                    role="admin",
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print(f"[WebGuard AI] Development admin provisioned: {admin_user.email}")
    finally:
        db.close()

    # Start autonomous background monitoring scheduler
    scheduler.start()
    print(f"[WebGuard AI] Environment: {settings.ENVIRONMENT} | API v{settings.VERSION} ready.")

    yield

    # Clean shutdown of background worker
    await scheduler.stop()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Configure Production-Ready CORS with trusted origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if settings.ENVIRONMENT == "production" else ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(websites.router, prefix=f"{settings.API_V1_STR}/websites", tags=["Websites"])
app.include_router(monitoring.router, prefix=f"{settings.API_V1_STR}/monitoring", tags=["Monitoring Tasks"])
app.include_router(competitors.router, prefix=f"{settings.API_V1_STR}/competitors", tags=["Competitor Intelligence"])
app.include_router(incidents.router, prefix=f"{settings.API_V1_STR}/incidents", tags=["Incidents"])
app.include_router(actions.router, prefix=f"{settings.API_V1_STR}/actions", tags=["AI Action Center"])
app.include_router(regression.router, prefix=f"{settings.API_V1_STR}/regression", tags=["Autonomous Regression Testing"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(tinyfish.router, prefix=f"{settings.API_V1_STR}/tinyfish", tags=["TinyFish Integration"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "tinyfish_configured": bool(settings.TINYFISH_API_KEY and len(settings.TINYFISH_API_KEY) > 10)
    }

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API v{settings.VERSION}",
        "docs": f"{settings.API_V1_STR}/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
