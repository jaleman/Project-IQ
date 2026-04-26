from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    message: str
    read: bool
    archived: bool
    task_id: Optional[int] = None
    task_status: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
