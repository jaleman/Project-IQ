from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.assignment import Assignment
from models.user import User, UserRole
from routers.deps import get_current_user
from routers.utils import ok
from schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentUpdate
from services.assignment_service import AssignmentService

router = APIRouter()


@router.get("/")
async def list_assignments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.admin, UserRole.leader):
        result = await db.execute(select(Assignment))
    else:
        result = await db.execute(
            select(Assignment).where(Assignment.user_id == current_user.id)
        )
    return ok([AssignmentOut.model_validate(a) for a in result.scalars().all()])


@router.post("/", status_code=201)
async def create_assignment(
    payload: AssignmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    assignment = Assignment(**payload.model_dump())
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return ok(AssignmentOut.model_validate(assignment), status=201)


@router.get("/user/{user_id}/overallocation")
async def check_overallocation(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    service = AssignmentService(db)
    result = await service.detect_overallocation(user_id)
    return ok(result)


@router.get("/{assignment_id}")
async def get_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    if current_user.role == UserRole.member and assignment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return ok(AssignmentOut.model_validate(assignment))


@router.patch("/{assignment_id}")
async def update_assignment(
    assignment_id: int,
    payload: AssignmentUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(assignment, field, value)
    await db.commit()
    await db.refresh(assignment)
    return ok(AssignmentOut.model_validate(assignment))


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found")
    await db.delete(assignment)
    await db.commit()
    return ok({"message": "Assignment deleted"})
