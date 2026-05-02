import structlog
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import engine, Base
from routers import auth, users, events, tasks, assignments, agents, notifications, projects, feedback

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ProjectIQ backend started", model=settings.ollama_model)
    yield
    await engine.dispose()
    logger.info("ProjectIQ backend stopped")


app = FastAPI(
    title="ProjectIQ API",
    version="0.1.0",
    description="AI-powered engineering resource management platform",
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
app.include_router(assignments, prefix="/api/assignments", tags=["assignments"])
app.include_router(agents, prefix="/api/agents", tags=["agents"])
app.include_router(notifications, prefix="/api/notifications", tags=["notifications"])
app.include_router(projects, prefix="/api/projects", tags=["projects"])
app.include_router(feedback, prefix="/api/feedback", tags=["feedback"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": settings.app_name}
