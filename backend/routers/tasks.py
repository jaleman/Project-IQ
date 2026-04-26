from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.task import Task, TaskStatus
from models.user import User, UserRole
from models.notification import Notification
from routers.deps import get_current_user
from routers.utils import ok
from schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter()


def _can_view(task: Task, user: User) -> bool:
    if user.role in (UserRole.admin, UserRole.leader):
        return True
    if task.user_id == user.id:
        return True
    if task.is_private:
        return False
    if task.shared_with and str(user.id) in task.shared_with.split(","):
        return True
    return False


@router.get("/")
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task))
    tasks = [t for t in result.scalars().all() if _can_view(t, current_user)]
    return ok([TaskOut.model_validate(t) for t in tasks])


@router.post("/")
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(**payload.model_dump(), user_id=current_user.id)
    db.add(task)
    await db.commit()
    await db.refresh(task)

    # Open a new lifecycle notification for each admin/leader
    leaders_result = await db.execute(
        select(User).where(User.role.in_([UserRole.admin, UserRole.leader]))
    )
    for leader in leaders_result.scalars().all():
        db.add(Notification(
            user_id=leader.id,
            type="task_lifecycle",
            task_id=task.id,
            task_status=task.status.value,
            message=f"Task '{task.title}' opened ({task.status.value}).",
        ))
    await db.commit()
    return ok(TaskOut.model_validate(task), status=201)


@router.get("/{task_id}")
async def get_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or not _can_view(task, current_user):
        raise HTTPException(status_code=404, detail="Task not found")
    return ok(TaskOut.model_validate(task))


@router.patch("/{task_id}")
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task or not _can_view(task, current_user):
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_id != current_user.id and current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Cannot modify another member's task")

    prev_status = task.status
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(task, field, value)

    # Lifecycle notifications: one active notification per leader/admin per task lifecycle.
    # - Reopen (was done, now not done) => start NEW lifecycle (new notifications, unread).
    # - Otherwise on status change => update active (non-done) notifications in place + mark unread.
    if payload.status is not None and payload.status != prev_status:
        leaders_result = await db.execute(
            select(User).where(User.role.in_([UserRole.admin, UserRole.leader]))
        )
        leaders = leaders_result.scalars().all()

        if prev_status == TaskStatus.done and payload.status != TaskStatus.done:
            # Reopen: spawn a fresh lifecycle notification per leader
            for leader in leaders:
                db.add(Notification(
                    user_id=leader.id,
                    type="task_lifecycle",
                    task_id=task.id,
                    task_status=payload.status.value,
                    message=f"Task '{task.title}' reopened ({payload.status.value}).",
                ))
        else:
            # Update existing active lifecycle notifications for this task
            active_result = await db.execute(
                select(Notification).where(
                    Notification.task_id == task.id,
                    Notification.type == "task_lifecycle",
                    Notification.task_status != TaskStatus.done.value,
                )
            )
            active_notifs = list(active_result.scalars().all())
            covered_user_ids = {n.user_id for n in active_notifs}

            verb = "completed" if payload.status == TaskStatus.done else f"now {payload.status.value}"
            for n in active_notifs:
                n.task_status = payload.status.value
                n.message = f"Task '{task.title}' {verb}."
                n.read = False  # bring it back to unread on each state change

            # Backfill: leaders who don't have an active notif yet (e.g. promoted later)
            for leader in leaders:
                if leader.id not in covered_user_ids:
                    db.add(Notification(
                        user_id=leader.id,
                        type="task_lifecycle",
                        task_id=task.id,
                        task_status=payload.status.value,
                        message=f"Task '{task.title}' {verb}.",
                    ))

    await db.commit()
    await db.refresh(task)
    return ok(TaskOut.model_validate(task))


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.user_id != current_user.id and current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    await db.delete(task)
    await db.commit()
    return ok({"message": "Task deleted"})
