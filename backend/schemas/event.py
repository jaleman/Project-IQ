from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class EventBase(BaseModel):
    title: str
    date: datetime
    required_staff: int = 1


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: Optional[str] = None
    date: Optional[datetime] = None
    required_staff: Optional[int] = None


class EventOut(EventBase):
    id: int
    created_by: int

    model_config = {"from_attributes": True}
