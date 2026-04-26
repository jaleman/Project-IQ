from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ShiftBase(BaseModel):
    user_id: int
    event_id: Optional[int] = None
    start_time: datetime
    end_time: datetime


class ShiftCreate(ShiftBase):
    pass


class ShiftUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None


class SwapRequest(BaseModel):
    requested_by: int


class ShiftOut(ShiftBase):
    id: int
    status: str
    swap_requested_by: Optional[int] = None

    model_config = {"from_attributes": True}
