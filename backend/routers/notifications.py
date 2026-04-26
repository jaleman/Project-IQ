from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.notification import Notification
from models.user import User
from routers.deps import get_current_user
from routers.utils import ok
from schemas.notification import NotificationOut

router = APIRouter()


@router.get("/")
async def list_notifications(
    archived: bool = Query(False, description="If true, return archived notifications"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.archived.is_(archived),
        )
        .order_by(Notification.created_at.desc())
    )
    return ok([NotificationOut.model_validate(n) for n in result.scalars().all()])


@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.read = True
        await db.commit()
    return ok({"message": "Marked as read"})


@router.patch("/{notification_id}/archive")
async def archive_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.archived = True
        notif.read = True
        await db.commit()
    return ok({"message": "Archived"})


@router.patch("/{notification_id}/unarchive")
async def unarchive_notification(
    notification_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.archived = False
        await db.commit()
    return ok({"message": "Unarchived"})
