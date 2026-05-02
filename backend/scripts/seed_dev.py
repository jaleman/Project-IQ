"""
Seed script for local development.

Creates one admin user, one member user, one project, and a handful of tasks
with assignments so a fresh local database has something to look at.

Usage (run once after alembic upgrade head):
    docker compose exec backend python scripts/seed_dev.py
"""

import asyncio
import sys
import os

# Allow running from the backend/ root
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from config import settings
from models.user import User, UserRole
from models.project import Project, ProjectStatus
from models.task import Task, TaskStatus
from models.assignment import Assignment, AssignmentStatus
from routers.deps import hash_password

engine = create_async_engine(settings.database_url)
Session = async_sessionmaker(engine, expire_on_commit=False)


async def seed():
    async with Session() as db:
        # ── Guard: skip if data already exists ──────────────────────────────
        existing = await db.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("Database already has users — skipping seed.")
            return

        now = datetime.now(timezone.utc)

        # ── Users ────────────────────────────────────────────────────────────
        admin = User(
            name="Joe (Admin)",
            email="joe@example.com",
            hashed_password=hash_password("password123"),
            role=UserRole.admin,
        )
        member = User(
            name="Dev Two",
            email="dev2@example.com",
            hashed_password=hash_password("password123"),
            role=UserRole.member,
        )
        db.add_all([admin, member])
        await db.flush()  # get IDs before creating related rows

        # ── Project ──────────────────────────────────────────────────────────
        project = Project(
            name="ProjectIQ v1",
            description="Core platform build",
            status=ProjectStatus.active,
            created_by=admin.id,
        )
        db.add(project)
        await db.flush()

        # ── Tasks ────────────────────────────────────────────────────────────
        tasks = [
            Task(
                user_id=admin.id,
                project_id=project.id,
                title="Set up CI/CD pipeline",
                notes="GitHub Actions workflows for staging and production.",
                status=TaskStatus.in_progress,
                start_date=now - timedelta(days=3),
                due_date=now + timedelta(days=4),
                estimated_hours=8,
            ),
            Task(
                user_id=member.id,
                project_id=project.id,
                title="Write unit tests for task router",
                notes="Cover CRUD endpoints and status transitions.",
                status=TaskStatus.planned,
                start_date=now,
                due_date=now + timedelta(days=7),
                estimated_hours=5,
            ),
            Task(
                user_id=admin.id,
                project_id=project.id,
                title="Add dark mode",
                notes="Theme toggle already wired — finish Tailwind variants.",
                status=TaskStatus.done,
                start_date=now - timedelta(days=7),
                due_date=now - timedelta(days=1),
                estimated_hours=3,
            ),
            Task(
                user_id=member.id,
                project_id=project.id,
                title="Review Alembic migration",
                status=TaskStatus.pending,
                start_date=now,
                due_date=now + timedelta(days=2),
                estimated_hours=1,
            ),
        ]
        db.add_all(tasks)
        await db.flush()

        # ── Assignments ──────────────────────────────────────────────────────
        assignments = [
            Assignment(
                user_id=admin.id,
                task_id=tasks[0].id,
                start_date=now - timedelta(days=3),
                end_date=now + timedelta(days=4),
                allocation_pct=50,
                status=AssignmentStatus.active,
            ),
            Assignment(
                user_id=member.id,
                task_id=tasks[1].id,
                start_date=now,
                end_date=now + timedelta(days=7),
                allocation_pct=100,
                status=AssignmentStatus.planned,
            ),
        ]
        db.add_all(assignments)

        await db.commit()

        print("Seed complete.")
        print("  Admin:  joe@example.com   / password123")
        print("  Member: dev2@example.com  / password123")
        print(f"  Project: {project.name} (id={project.id})")
        print(f"  Tasks created: {len(tasks)}")


if __name__ == "__main__":
    asyncio.run(seed())
