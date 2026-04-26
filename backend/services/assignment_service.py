from datetime import datetime
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.assignment import Assignment, AssignmentStatus


class AssignmentService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_assignments_for_user(self, user_id: int) -> List[Assignment]:
        result = await self.db.execute(
            select(Assignment).where(Assignment.user_id == user_id)
        )
        return list(result.scalars().all())

    async def get_assignments_in_range(
        self, start: datetime, end: datetime
    ) -> List[Assignment]:
        result = await self.db.execute(
            select(Assignment).where(
                Assignment.start_date >= start,
                Assignment.start_date <= end,
            )
        )
        return list(result.scalars().all())

    async def detect_overallocation(self, user_id: int) -> dict:
        """
        Returns each date range where total allocation_pct for the user
        across active+planned assignments exceeds 100.
        """
        result = await self.db.execute(
            select(Assignment).where(
                Assignment.user_id == user_id,
                Assignment.status.in_(
                    [AssignmentStatus.planned, AssignmentStatus.active]
                ),
            )
        )
        assignments = result.scalars().all()
        total_pct = sum(a.allocation_pct for a in assignments)
        overallocated = total_pct > 100

        return {
            "user_id": user_id,
            "total_allocation_pct": total_pct,
            "overallocated": overallocated,
            "active_assignments": len(assignments),
            "assignments": [
                {
                    "id": a.id,
                    "task_id": a.task_id,
                    "allocation_pct": a.allocation_pct,
                    "status": a.status,
                    "start_date": a.start_date.isoformat(),
                    "end_date": a.end_date.isoformat() if a.end_date else None,
                }
                for a in assignments
            ],
        }
