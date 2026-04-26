import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from config import settings
from database import engine, Base
from routers import auth, users, events, tasks, shifts, agents, notifications, projects, feedback

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables (Alembic handles migrations in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Lightweight idempotent migrations for dev (Postgres)
        await conn.execute(text(
            "ALTER TABLE notifications "
            "ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE"
        ))
        await conn.execute(text(
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS task_status VARCHAR(20)"
        ))
        await conn.execute(text(
            "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        # Projects
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS projects (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                description TEXT,
                status VARCHAR(20) NOT NULL DEFAULT 'active',
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text(
            "ALTER TABLE tasks "
            "ADD COLUMN IF NOT EXISTS project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL"
        ))
        # Feedback
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS feedback (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id),
                type VARCHAR(30) NOT NULL,
                notes TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text(
            "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS reply TEXT"
        ))
        await conn.execute(text(
            "ALTER TABLE feedback ADD COLUMN IF NOT EXISTS replied_at TIMESTAMPTZ"
        ))
    logger.info("ProjectIQ backend started", model=settings.ollama_model)
    yield
    await engine.dispose()
    logger.info("ProjectIQ backend stopped")


app = FastAPI(
    title="ProjectIQ API",
    version="0.1.0",
    description="AI-powered employee scheduling platform",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    openapi_url="/openapi.json" if settings.debug else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth, prefix="/api/auth", tags=["auth"])
app.include_router(users, prefix="/api/users", tags=["users"])
app.include_router(events, prefix="/api/events", tags=["events"])
app.include_router(tasks, prefix="/api/tasks", tags=["tasks"])
app.include_router(shifts, prefix="/api/shifts", tags=["shifts"])
app.include_router(agents, prefix="/api/agents", tags=["agents"])
app.include_router(notifications, prefix="/api/notifications", tags=["notifications"])
app.include_router(projects, prefix="/api/projects", tags=["projects"])
app.include_router(feedback, prefix="/api/feedback", tags=["feedback"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
