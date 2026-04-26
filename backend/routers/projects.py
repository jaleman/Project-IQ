from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.project import Project
from models.task import Task
from models.user import User, UserRole
from routers.deps import get_current_user
from routers.utils import ok
from schemas.project import ProjectCreate, ProjectDetail, ProjectOut, ProjectTaskOut, ProjectUpdate

router = APIRouter()


def _require_admin_or_leader(user: User):
    if user.role not in (UserRole.admin, UserRole.leader):
        raise HTTPException(status_code=403, detail="Admin or leader access required")


@router.get("/")
async def list_projects(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.admin, UserRole.leader):
        result = await db.execute(select(Project))
        projects = result.scalars().all()
    else:
        # Members see only projects they have at least one task assigned to
        result = await db.execute(
            select(Project)
            .join(Task, Task.project_id == Project.id)
            .where(Task.user_id == current_user.id)
            .distinct()
        )
        projects = result.scalars().all()
    return ok([ProjectOut.model_validate(p) for p in projects])


@router.post("/")
async def create_project(
    payload: ProjectCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_leader(current_user)
    project = Project(**payload.model_dump(), created_by=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ok(ProjectOut.model_validate(project), status=201)


@router.get("/{project_id}")
async def get_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch tasks with assigned user names
    tasks_result = await db.execute(
        select(Task, User.name).join(User, Task.user_id == User.id).where(Task.project_id == project_id)
    )
    task_rows = tasks_result.all()
    tasks_out = [
        ProjectTaskOut(
            id=task.id,
            title=task.title,
            notes=task.notes,
            status=task.status,
            user_id=task.user_id,
            user_name=user_name,
        )
        for task, user_name in task_rows
    ]

    detail = ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        created_by=project.created_by,
        created_at=project.created_at,
        tasks=tasks_out,
    )
    return ok(detail)


@router.patch("/{project_id}")
async def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_admin_or_leader(current_user)
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return ok(ProjectOut.model_validate(project))


@router.delete("/{project_id}")
async def delete_project(
    project_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    await db.delete(project)
    await db.commit()
    return ok({"message": "Project deleted"})
