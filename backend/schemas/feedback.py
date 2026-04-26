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
    user_id: int
    user_name: str
    type: FeedbackType
    notes: str
    reply: Optional[str] = None
    replied_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
