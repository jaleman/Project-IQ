import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, enum.Enum):
    admin = "admin"
    leader = "leader"
    member = "member"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.member)
    availability: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="user", lazy="selectin"
    )
    tasks: Mapped[list["Task"]] = relationship("Task", back_populates="user", lazy="selectin")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="user", lazy="selectin"
    )
