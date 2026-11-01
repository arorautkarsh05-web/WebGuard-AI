from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.core.config import settings
from backend.app.core.database import Base, engine, SessionLocal
from backend.app.models.models import User, Organization
from backend.app.core.security import get_password_hash
from backend.app.api.v1 import (
    auth,
    websites,
    monitoring,
    competitors,
    incidents,
    dashboard,
    tinyfish
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        user = db.query(User).first()
        if not user:
            org = Organization(name="Acme Enterprise", plan="enterprise")
            db.add(org)
            db.commit()
            db.refresh(org)

            admin_user = User(
                organization_id=org.id,
                email="admin@webguard.ai",
                hashed_password=get_password_hash("WebGuardPass2026!"),
                full_name="Security Admin",
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print("[WebGuard AI] Default administrator account provisioned: admin@webguard.ai")
    finally:
        db.close()

    print(f"[WebGuard AI] Database initialized successfully.")
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(websites.router, prefix=f"{settings.API_V1_STR}/websites", tags=["Websites"])
app.include_router(monitoring.router, prefix=f"{settings.API_V1_STR}/monitoring", tags=["Monitoring Tasks"])
app.include_router(competitors.router, prefix=f"{settings.API_V1_STR}/competitors", tags=["Competitor Intelligence"])
app.include_router(incidents.router, prefix=f"{settings.API_V1_STR}/incidents", tags=["Incidents"])
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}/dashboard", tags=["Dashboard"])
app.include_router(tinyfish.router, prefix=f"{settings.API_V1_STR}/tinyfish", tags=["TinyFish Integration"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
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
