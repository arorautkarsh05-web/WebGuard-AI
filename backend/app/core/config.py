import os
from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import model_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "WebGuard AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"  # development | production | testing
    
    # Security
    SECRET_KEY: str = "webguard-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    DEFAULT_ADMIN_EMAIL: Optional[str] = "admin@webguard.ai"
    DEFAULT_ADMIN_PASSWORD: Optional[str] = None  # In production, must be explicitly set or accounts created via register
    
    # TinyFish API
    TINYFISH_API_KEY: str = ""
    TINYFISH_SEARCH_URL: str = "https://api.search.tinyfish.ai"
    TINYFISH_FETCH_URL: str = "https://api.fetch.tinyfish.ai"
    TINYFISH_AGENT_URL: str = "https://agent.tinyfish.ai"
    
    # LLM Intelligence Engine
    LLM_PROVIDER: str = "auto"  # auto | openai | anthropic | gemini | custom | none
    OPENAI_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    LLM_MODEL: str = "gpt-4o"
    LLM_CUSTOM_API_BASE: Optional[str] = None
    
    # Infrastructure Remediation Adapters
    CLOUDFLARE_API_TOKEN: Optional[str] = None
    CLOUDFLARE_ZONE_ID: Optional[str] = None
    KUBERNETES_ENABLED: bool = False
    KUBERNETES_NAMESPACE: str = "webguard-prod"
    CICD_ROLLBACK_WEBHOOK_URL: Optional[str] = None
    CICD_WEBHOOK_SECRET: Optional[str] = None
    
    # Database
    DATABASE_URL: str = "sqlite:///./webguard.db"
    
    # Redis & Background Tasks
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"
    ENABLE_BACKGROUND_SCHEDULER: bool = True
    SCHEDULER_INTERVAL_SECONDS: int = 30
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT == "production":
            weak_keys = [
                "webguard-super-secret-key-change-in-production-2026",
                "secret",
                "changeme",
                "admin",
                "password"
            ]
            if not self.SECRET_KEY or self.SECRET_KEY in weak_keys or len(self.SECRET_KEY) < 32:
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION ERROR: "
                    "In production environment, SECRET_KEY must be set to a cryptographically secure value "
                    "with at least 32 characters loaded from an environment variable."
                )
            if self.DATABASE_URL.startswith("sqlite"):
                raise ValueError(
                    "CRITICAL DATABASE CONFIGURATION ERROR: "
                    "Production requires a production-grade database (PostgreSQL). SQLite is not allowed in production."
                )
        return self

    class Config:
        env_file = "backend/.env"
        extra = "ignore"

settings = Settings()
