from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.feedback import Feedback
from models.user import User, UserRole
from routers.deps import get_current_user
from routers.utils import ok
from schemas.feedback import FeedbackCreate, FeedbackOut, FeedbackReply

router = APIRouter()


def _to_out(f: Feedback, user_name: str) -> FeedbackOut:
    return FeedbackOut(
        id=f.id,
        user_id=f.user_id,
        user_name=user_name,
        type=f.type,
        notes=f.notes,
        reply=f.reply,
        replied_at=f.replied_at,
        created_at=f.created_at,
    )


@router.post("/")
async def submit_feedback(
    payload: FeedbackCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = Feedback(**payload.model_dump(), user_id=current_user.id)
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return ok(_to_out(item, current_user.name))


@router.get("/")
async def list_feedback(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.leader):
        result = await db.execute(
            select(Feedback).where(Feedback.user_id == current_user.id).order_by(Feedback.created_at.desc())
        )
    else:
        result = await db.execute(select(Feedback).order_by(Feedback.created_at.desc()))
    items = result.scalars().all()

    user_ids = list({f.user_id for f in items})
    users_result = await db.execute(select(User).where(User.id.in_(user_ids)))
    user_map: dict[int, str] = {u.id: u.name for u in users_result.scalars().all()}

    return ok([_to_out(f, user_map.get(f.user_id, "Unknown")) for f in items])


@router.patch("/{feedback_id}/reply")
async def reply_to_feedback(
    feedback_id: int,
    payload: FeedbackReply,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.admin, UserRole.leader):
        raise HTTPException(status_code=403, detail="Not authorised")

    result = await db.execute(select(Feedback).where(Feedback.id == feedback_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Feedback not found")

    new_text = payload.reply.strip()
    if not new_text:
        item.reply = None
        item.replied_at = None
    else:
        item.reply = new_text
        item.replied_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)

    user_result = await db.execute(select(User).where(User.id == item.user_id))
    user = user_result.scalar_one_or_none()
    return ok(_to_out(item, user.name if user else "Unknown"))
