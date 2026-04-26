from .auth import router as auth
from .users import router as users
from .events import router as events
from .tasks import router as tasks
from .shifts import router as shifts
from .agents import router as agents
from .notifications import router as notifications

__all__ = ["auth", "users", "events", "tasks", "shifts", "agents", "notifications"]
