import os
import sys
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.core.config import settings

db_url = settings.DATABASE_URL
engine = None

if db_url.startswith("sqlite"):
    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False}
    )
else:
    # Production PostgreSQL with robust connection pooling
    try:
        engine = create_engine(
            db_url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            pool_recycle=300,
            connect_args={"connect_timeout": 3}
        )
        # Test connection
        with engine.connect() as conn:
            pass
    except Exception as e:
        if settings.ENVIRONMENT == "production":
            # Never silently switch in production!
            print(f"[CRITICAL ERROR] Failed to connect to production database: {db_url}", file=sys.stderr)
            raise RuntimeError(f"FATAL: Production database connection failed: {e}")
        else:
            # Informative local development fallback
            fallback_url = "sqlite:///./webguard.db"
            print(f"[Database Notice] Could not connect to PostgreSQL ({e}). Using local SQLite for development: {fallback_url}")
            engine = create_engine(fallback_url, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
