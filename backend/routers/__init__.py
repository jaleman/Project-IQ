from .auth import router as auth
from .users import router as users
from .events import router as events
from .tasks import router as tasks
from .assignments import router as assignments
from .agents import router as agents
from .notifications import router as notifications
from .projects import router as projects
from .feedback import router as feedback

__all__ = ["auth", "users", "events", "tasks", "assignments", "agents", "notifications", "projects", "feedback"]
