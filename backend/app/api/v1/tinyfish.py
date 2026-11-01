from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.database import get_db
from backend.app.core.security import validate_target_url
from backend.app.models.models import TinyFishExecution, User
from backend.app.schemas.schemas import TinyFishExecutionOut
from backend.app.api.deps import get_current_user
from backend.app.services.tinyfish_service import tinyfish_service

router = APIRouter()

class SearchRequest(BaseModel):
    query: str
    location: Optional[str] = None

class FetchRequest(BaseModel):
    url: str
    format: Optional[str] = "markdown"

class AgentWorkflowRequest(BaseModel):
    url: str
    goal: str

@router.get("/status")
async def get_tinyfish_status():
    """
    Checks if TinyFish API key is loaded and verifies minimal ping to the Search API.
    """
    is_configured = bool(settings.TINYFISH_API_KEY and len(settings.TINYFISH_API_KEY) > 10)
    validation_status = "unconfigured"
    if is_configured:
        res = await tinyfish_service.search(query="status_check")
        validation_status = "connected" if res.get("success") else "error"
    
    return {
        "configured": is_configured,
        "status": validation_status,
        "search_url": settings.TINYFISH_SEARCH_URL,
        "fetch_url": settings.TINYFISH_FETCH_URL,
        "agent_url": settings.TINYFISH_AGENT_URL
    }

@router.post("/search")
async def search_web(
    req: SearchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not req.query.strip():
        raise HTTPException(status_code=400, detail="Search query cannot be empty.")
    
    res = await tinyfish_service.search(
        query=req.query,
        db=db,
        organization_id=current_user.organization_id,
        location=req.location
    )
    return res

@router.post("/fetch")
async def fetch_page_content(
    req: FetchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    valid_url = validate_target_url(req.url)
    res = await tinyfish_service.fetch(
        url=valid_url,
        db=db,
        organization_id=current_user.organization_id,
        extract_format=req.format or "markdown"
    )
    return res

@router.post("/agent")
async def run_agent_workflow(
    req: AgentWorkflowRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    valid_url = validate_target_url(req.url)
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty.")

    res = await tinyfish_service.run_agent(
        url=valid_url,
        goal=req.goal,
        db=db,
        organization_id=current_user.organization_id
    )
    return res

@router.get("/executions", response_model=List[TinyFishExecutionOut])
def get_executions(
    service_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(TinyFishExecution).filter(TinyFishExecution.organization_id == current_user.organization_id)
    if service_type:
        query = query.filter(TinyFishExecution.service_type == service_type)
    executions = query.order_by(TinyFishExecution.created_at.desc()).limit(50).all()
    return executions
