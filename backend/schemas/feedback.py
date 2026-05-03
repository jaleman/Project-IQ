from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from models.feedback import FeedbackType


class FeedbackCreate(BaseModel):
    type: FeedbackType
    notes: str


class FeedbackReply(BaseModel):
    reply: str


class FeedbackOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    type: FeedbackType
    notes: str
    reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    done: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}
