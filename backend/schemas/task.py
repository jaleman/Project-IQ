from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from models.task import TaskStatus


class TaskBase(BaseModel):
    title: str
    notes: Optional[str] = None
    is_private: bool = False
    shared_with: Optional[str] = None
    project_id: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[TaskStatus] = None
    is_private: Optional[bool] = None
    shared_with: Optional[str] = None
    project_id: Optional[int] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    estimated_hours: Optional[int] = None


class TaskOut(TaskBase):
    id: int
    user_id: Optional[int] = None
    status: TaskStatus
    created_at: datetime

    model_config = {"from_attributes": True}
