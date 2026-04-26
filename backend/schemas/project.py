from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from models.project import ProjectStatus
from models.task import TaskStatus


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: ProjectStatus = ProjectStatus.active


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None


class ProjectTaskOut(BaseModel):
    id: int
    title: str
    notes: Optional[str]
    status: TaskStatus
    user_id: int
    user_name: str

    model_config = {"from_attributes": True}


class ProjectOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    status: ProjectStatus
    created_by: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectDetail(ProjectOut):
    tasks: List[ProjectTaskOut]
