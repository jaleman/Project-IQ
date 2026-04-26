from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.shift import Shift
from models.user import User, UserRole
from routers.deps import get_current_user
from routers.utils import ok
from schemas.shift import ShiftCreate, ShiftOut, ShiftUpdate, SwapRequest

router = APIRouter()


@router.get("/")
async def list_shifts(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role in (UserRole.admin, UserRole.leader):
        result = await db.execute(select(Shift))
    else:
        result = await db.execute(select(Shift).where(Shift.user_id == current_user.id))
    return ok([ShiftOut.model_validate(s) for s in result.scalars().all()])


@router.post("/")
async def create_shift(
    payload: ShiftCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    shift = Shift(**payload.model_dump())
    db.add(shift)
    await db.commit()
    await db.refresh(shift)
    return ok(ShiftOut.model_validate(shift), status=201)


@router.get("/{shift_id}")
async def get_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if current_user.role == UserRole.member and shift.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    return ok(ShiftOut.model_validate(shift))


@router.patch("/{shift_id}")
async def update_shift(
    shift_id: int,
    payload: ShiftUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(shift, field, value)
    await db.commit()
    await db.refresh(shift)
    return ok(ShiftOut.model_validate(shift))


@router.post("/{shift_id}/swap-request")
async def request_swap(
    shift_id: int,
    payload: SwapRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    shift.status = "swap_requested"
    shift.swap_requested_by = payload.requested_by
    await db.commit()
    await db.refresh(shift)
    return ok(ShiftOut.model_validate(shift))


@router.post("/{shift_id}/approve-swap")
async def approve_swap(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == UserRole.member:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift or shift.status != "swap_requested":
        raise HTTPException(status_code=400, detail="No pending swap request")
    shift.user_id = shift.swap_requested_by
    shift.swap_requested_by = None
    shift.status = "scheduled"
    await db.commit()
    await db.refresh(shift)
    return ok(ShiftOut.model_validate(shift))


@router.delete("/{shift_id}")
async def delete_shift(
    shift_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    result = await db.execute(select(Shift).where(Shift.id == shift_id))
    shift = result.scalar_one_or_none()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    await db.delete(shift)
    await db.commit()
    return ok({"message": "Shift deleted"})
