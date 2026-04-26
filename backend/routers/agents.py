from fastapi import APIRouter, Depends
from pydantic import BaseModel

from models.user import User
from routers.deps import get_current_user
from routers.utils import ok
from agents.graph import run_agent_workflow

router = APIRouter()


class AgentRequest(BaseModel):
    action: str
    payload: dict = {}


@router.post("/run")
async def run_agent(
    request: AgentRequest,
    current_user: User = Depends(get_current_user),
):
    result = await run_agent_workflow(
        action=request.action,
        payload=request.payload,
        user_id=current_user.id,
    )
    return ok(result)
