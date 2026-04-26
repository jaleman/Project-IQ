from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from models.assignment import AssignmentStatus


class AssignmentBase(BaseModel):
    user_id: int
    task_id: int
    start_date: datetime
    end_date: Optional[datetime] = None
    allocation_pct: int = Field(default=100, ge=1, le=100)


class AssignmentCreate(AssignmentBase):
    status: AssignmentStatus = AssignmentStatus.planned


class AssignmentUpdate(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    allocation_pct: Optional[int] = Field(default=None, ge=1, le=100)
    status: Optional[AssignmentStatus] = None


class AssignmentOut(AssignmentBase):
    id: int
    status: AssignmentStatus
    created_at: datetime

    model_config = {"from_attributes": True}
