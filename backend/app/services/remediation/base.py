from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field

# Action Lifecycle States
STATE_PROPOSED = "proposed"
STATE_PENDING_APPROVAL = "pending_approval"
STATE_APPROVED = "approved"
STATE_EXECUTING = "executing"
STATE_EXECUTED = "executed"
STATE_VERIFYING = "verifying"
STATE_VERIFIED_RESOLVED = "verified_resolved"

STATE_REJECTED = "rejected"
STATE_FAILED = "failed"
STATE_TIMED_OUT = "timed_out"
STATE_VERIFICATION_FAILED = "verification_failed"
STATE_CANCELLED = "cancelled"
STATE_UNCONFIGURED = "integration_unconfigured"

class RemediationStatus:
    PROPOSED = STATE_PROPOSED
    PENDING_APPROVAL = STATE_PENDING_APPROVAL
    APPROVED = STATE_APPROVED
    EXECUTING = STATE_EXECUTING
    EXECUTED = STATE_EXECUTED
    VERIFYING = STATE_VERIFYING
    VERIFIED_RESOLVED = STATE_VERIFIED_RESOLVED
    REJECTED = STATE_REJECTED
    FAILED = STATE_FAILED
    TIMED_OUT = STATE_TIMED_OUT
    VERIFICATION_FAILED = STATE_VERIFICATION_FAILED
    CANCELLED = STATE_CANCELLED
    INTEGRATION_UNCONFIGURED = STATE_UNCONFIGURED

class RemediationResult(BaseModel):
    success: bool
    status: str  # executed | failed | integration_unconfigured | timed_out
    adapter_name: str
    details: Dict[str, Any] = Field(default_factory=dict)
    message: str = ""
    error_message: Optional[str] = None
    executed_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    duration_ms: float = 0.0

    def __init__(self, **data):
        super().__init__(**data)
        if not self.error_message and not self.success:
            self.error_message = self.message

class BaseRemediationAdapter(ABC):
    @property
    @abstractmethod
    def adapter_name(self) -> str:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass

    @abstractmethod
    async def execute(
        self,
        parameters: Dict[str, Any],
        idempotency_key: Optional[str] = None
    ) -> RemediationResult:
        pass
