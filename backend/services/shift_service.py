from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.shift import Shift


class ShiftService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_shifts_for_user(self, user_id: int) -> List[Shift]:
        result = await self.db.execute(select(Shift).where(Shift.user_id == user_id))
        return list(result.scalars().all())

    async def get_shifts_in_range(self, start: datetime, end: datetime) -> List[Shift]:
        result = await self.db.execute(
            select(Shift).where(Shift.start_time >= start, Shift.end_time <= end)
        )
        return list(result.scalars().all())

    async def find_coverage_gaps(self, event_id: int, required_staff: int) -> dict:
        result = await self.db.execute(
            select(Shift).where(Shift.event_id == event_id, Shift.status == "scheduled")
        )
        assigned = result.scalars().all()
        assigned_count = len(assigned)
        gap = max(0, required_staff - assigned_count)
        return {
            "event_id": event_id,
            "required": required_staff,
            "assigned": assigned_count,
            "gap": gap,
            "has_gap": gap > 0,
        }
