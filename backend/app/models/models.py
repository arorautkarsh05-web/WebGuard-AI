import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Text,
    JSON,
    Index
)
from sqlalchemy.orm import relationship
from backend.app.core.database import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    plan = Column(String(50), default="pro", nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    websites = relationship("Website", back_populates="organization", cascade="all, delete-orphan")
    monitoring_tasks = relationship("MonitoringTask", back_populates="organization", cascade="all, delete-orphan")
    competitors = relationship("Competitor", back_populates="organization", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="organization", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="organization", cascade="all, delete-orphan")
    tinyfish_executions = relationship("TinyFishExecution", back_populates="organization", cascade="all, delete-orphan")

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    role = Column(String(50), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="users")

class Website(Base):
    __tablename__ = "websites"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False, index=True)
    health_status = Column(String(50), default="unknown", nullable=False)  # healthy, degraded, down, unknown
    last_response_time_ms = Column(Float, nullable=True)
    last_status_code = Column(Integer, nullable=True)
    last_checked_at = Column(DateTime(timezone=True), nullable=True)
    check_frequency_minutes = Column(Integer, default=5, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    settings = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="websites")
    monitoring_tasks = relationship("MonitoringTask", back_populates="website", cascade="all, delete-orphan")
    monitoring_results = relationship("MonitoringResult", back_populates="website", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="website", cascade="all, delete-orphan")

class MonitoringTask(Base):
    __tablename__ = "monitoring_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    task_type = Column(String(50), nullable=False)  # health_check, change_detection, functional_test, competitor_scan
    target_url = Column(String(1024), nullable=False)
    schedule_cron = Column(String(100), default="*/5 * * * *")
    status = Column(String(50), default="active", nullable=False)  # active, paused, running, failed
    config = Column(JSON, default=dict)
    last_run_at = Column(DateTime(timezone=True), nullable=True)
    next_run_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="monitoring_tasks")
    website = relationship("Website", back_populates="monitoring_tasks")
    results = relationship("MonitoringResult", back_populates="task", cascade="all, delete-orphan")

class MonitoringResult(Base):
    __tablename__ = "monitoring_results"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    task_id = Column(String(36), ForeignKey("monitoring_tasks.id", ondelete="CASCADE"), nullable=False, index=True)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="CASCADE"), nullable=True, index=True)
    status = Column(String(50), nullable=False)  # success, failed, degraded
    response_time_ms = Column(Float, nullable=True)
    http_status_code = Column(Integer, nullable=True)
    data = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    task = relationship("MonitoringTask", back_populates="results")
    website = relationship("Website", back_populates="monitoring_results")

class Competitor(Base):
    __tablename__ = "competitors"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), nullable=False)
    website_url = Column(String(1024), nullable=False)
    description = Column(Text, nullable=True)
    last_monitored_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="competitors")
    products = relationship("Product", back_populates="competitor", cascade="all, delete-orphan")

class Product(Base):
    __tablename__ = "products"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    competitor_id = Column(String(36), ForeignKey("competitors.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    url = Column(String(1024), nullable=False)
    current_price = Column(Float, nullable=True)
    currency = Column(String(10), default="USD", nullable=False)
    availability_status = Column(String(50), default="in_stock", nullable=False)  # in_stock, out_of_stock, unknown
    metadata_json = Column(JSON, default=dict)
    last_scraped_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    competitor = relationship("Competitor", back_populates="products")
    price_history = relationship("PriceHistory", back_populates="product", cascade="all, delete-orphan")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    product_id = Column(String(36), ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    price = Column(Float, nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    availability = Column(Boolean, default=True, nullable=False)
    promotional_details = Column(Text, nullable=True)
    captured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    product = relationship("Product", back_populates="price_history")

class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    website_id = Column(String(36), ForeignKey("websites.id", ondelete="SET NULL"), nullable=True, index=True)
    task_id = Column(String(36), ForeignKey("monitoring_tasks.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), nullable=False)  # Critical, High, Medium, Low, Informational
    status = Column(String(50), default="Open", nullable=False)  # Open, Investigating, Resolved, False_Positive
    root_cause_summary = Column(Text, nullable=True)
    evidence = Column(JSON, default=dict)
    recommended_actions = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    organization = relationship("Organization", back_populates="incidents")
    website = relationship("Website", back_populates="incidents")
    notifications = relationship("Notification", back_populates="incident", cascade="all, delete-orphan")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    incident_id = Column(String(36), ForeignKey("incidents.id", ondelete="CASCADE"), nullable=True, index=True)
    channel = Column(String(50), default="in_app", nullable=False)  # email, webhook, in_app
    recipient = Column(String(255), nullable=False)
    status = Column(String(50), default="sent", nullable=False)  # sent, failed, pending
    content = Column(Text, nullable=False)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="notifications")
    incident = relationship("Incident", back_populates="notifications")

class TinyFishExecution(Base):
    __tablename__ = "tinyfish_executions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    service_type = Column(String(50), nullable=False)  # search, fetch, agent, monitor
    endpoint = Column(String(512), nullable=False)
    request_params = Column(JSON, default=dict)
    response_status = Column(Integer, nullable=True)
    execution_time_ms = Column(Float, nullable=True)
    status = Column(String(50), nullable=False)  # success, failed
    response_summary = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)

    organization = relationship("Organization", back_populates="tinyfish_executions")

