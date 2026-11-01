from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# --- Auth & User ---
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    confirm_password: Optional[str] = None
    full_name: Optional[str] = None
    organization_name: Optional[str] = "My Organization"

class UserOut(BaseModel):
    id: str
    organization_id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut

class TokenData(BaseModel):
    user_id: Optional[str] = None

# --- Organization ---
class OrganizationOut(BaseModel):
    id: str
    name: str
    plan: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Website ---
class WebsiteCreate(BaseModel):
    name: str
    url: str
    check_frequency_minutes: Optional[int] = 5
    settings: Optional[Dict[str, Any]] = None

class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    check_frequency_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    settings: Optional[Dict[str, Any]] = None

class WebsiteOut(BaseModel):
    id: str
    organization_id: str
    name: str
    url: str
    health_status: str
    last_response_time_ms: Optional[float] = None
    last_status_code: Optional[int] = None
    last_checked_at: Optional[datetime] = None
    check_frequency_minutes: int
    is_active: bool
    settings: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Monitoring Task ---
class MonitoringTaskCreate(BaseModel):
    website_id: Optional[str] = None
    name: str
    task_type: str  # health_check, change_detection, functional_test, competitor_scan
    target_url: str
    schedule_cron: Optional[str] = "*/5 * * * *"
    config: Optional[Dict[str, Any]] = None

class MonitoringTaskOut(BaseModel):
    id: str
    organization_id: str
    website_id: Optional[str] = None
    name: str
    task_type: str
    target_url: str
    schedule_cron: Optional[str] = None
    status: str
    config: Optional[Dict[str, Any]] = None
    last_run_at: Optional[datetime] = None
    next_run_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class MonitoringResultOut(BaseModel):
    id: str
    task_id: str
    website_id: Optional[str] = None
    status: str
    response_time_ms: Optional[float] = None
    http_status_code: Optional[int] = None
    data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Competitor & Products ---
class CompetitorCreate(BaseModel):
    name: str
    website_url: str
    domain: Optional[str] = None
    description: Optional[str] = None

class ProductCreate(BaseModel):
    name: str
    url: str
    current_price: Optional[float] = None
    currency: Optional[str] = "USD"
    availability_status: Optional[str] = "in_stock"
    metadata_json: Optional[Dict[str, Any]] = None

class PriceHistoryOut(BaseModel):
    id: str
    product_id: str
    price: float
    currency: str
    availability: bool
    promotional_details: Optional[str] = None
    captured_at: datetime

    class Config:
        from_attributes = True

class ProductOut(BaseModel):
    id: str
    competitor_id: str
    name: str
    url: str
    current_price: Optional[float] = None
    currency: str
    availability_status: str
    metadata_json: Optional[Dict[str, Any]] = None
    last_scraped_at: Optional[datetime] = None
    created_at: datetime
    price_history: Optional[List[PriceHistoryOut]] = None

    class Config:
        from_attributes = True

class CompetitorOut(BaseModel):
    id: str
    organization_id: str
    name: str
    domain: str
    website_url: str
    description: Optional[str] = None
    last_monitored_at: Optional[datetime] = None
    created_at: datetime
    products: Optional[List[ProductOut]] = None

    class Config:
        from_attributes = True

# --- Incidents ---
class IncidentStatusUpdate(BaseModel):
    status: str  # Open, Investigating, Resolved, False_Positive

class IncidentOut(BaseModel):
    id: str
    organization_id: str
    website_id: Optional[str] = None
    task_id: Optional[str] = None
    title: str
    severity: str
    status: str
    root_cause_summary: Optional[str] = None
    evidence: Optional[Dict[str, Any]] = None
    recommended_actions: Optional[List[str]] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# --- TinyFish Executions ---
class TinyFishExecutionOut(BaseModel):
    id: str
    organization_id: str
    service_type: str
    endpoint: str
    request_params: Optional[Dict[str, Any]] = None
    response_status: Optional[int] = None
    execution_time_ms: Optional[float] = None
    status: str
    response_summary: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Dashboard ---
class DashboardOverview(BaseModel):
    total_websites: int
    healthy_websites: int
    degraded_websites: int
    down_websites: int
    active_monitoring_tasks: int
    competitors_monitored: int
    total_changes_detected: int
    critical_incidents: int
    open_incidents: int
    uptime_percentage: float
    average_response_time_ms: float

class DashboardActivityItem(BaseModel):
    id: str
    type: str  # health, incident, change, test, competitor
    title: str
    description: str
    severity: Optional[str] = None
    timestamp: datetime

