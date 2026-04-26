import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class AssignmentStatus(str, enum.Enum):
    planned = "planned"
    active = "active"
    on_hold = "on_hold"
    completed = "completed"


class Assignment(Base):
    __tablename__ = "assignments"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    end_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    allocation_pct: Mapped[int] = mapped_column(Integer, default=100)
    status: Mapped[AssignmentStatus] = mapped_column(
        Enum(AssignmentStatus), default=AssignmentStatus.planned
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    user: Mapped["User"] = relationship("User", back_populates="assignments")
    task: Mapped["Task"] = relationship("Task", back_populates="assignments")
