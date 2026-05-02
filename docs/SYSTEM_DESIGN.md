# ProjectIQ — System Design Overview

> **Status:** Proof of Concept — live at https://www.whatiskali.dev (Cloudflare Tunnel)
> **Last Updated:** May 2026
> **Stack:** Next.js · FastAPI · LangGraph · Ollama (Gemma 4) · PostgreSQL 16 · Redis 7 · Caddy · Docker Compose · Cloudflare Tunnel

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Technology Stack](#3-technology-stack)
4. [System Components](#4-system-components)
5. [Agentic System Design](#5-agentic-system-design)
6. [Data Models](#6-data-models)
7. [API Design](#7-api-design)
8. [Authentication & Permissions](#8-authentication--permissions)
9. [Bot Integrations](#9-bot-integrations)
10. [Voice Support](#10-voice-support)
11. [Infrastructure & Hosting](#11-infrastructure--hosting)
12. [Roadmap](#12-roadmap)
13. [Developer Tooling — GitHub Copilot Customizations](#13-developer-tooling--github-copilot-customizations)

> Concrete next-step features and known gaps live in [PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md). This document describes what is built today.

---

## 1. Project Overview

ProjectIQ is an AI-assisted employee scheduling and task-management app for small teams. It combines a Next.js web UI, a FastAPI backend, and a local LLM (Gemma 4 via Ollama) to let managers and members handle shifts, tasks, and notifications through a browser, mobile PWA, or chat bots.

### Goals

- Automate repetitive scheduling decisions using a **local** LLM (privacy + zero per-token cost)
- Give team members a single dashboard for shifts, tasks, and alerts
- Allow managers to interact with the system in natural language (chat / bot / voice)
- Self-hosted: data stays on the operator's machine

### Implemented Today

| Area | Status |
|---|---|
| Auth (JWT, bootstrap-only register, change-password) | ✅ |
| Users, Events, Tasks, Projects, Assignments CRUD (Shift model removed) | ✅ |
| Assignment model: allocation_pct, status, overallocation detection | ✅ |
| Lifecycle Notifications (per-task status tracking, archive) | ✅ |
| AI agents (Scheduler, Notifier, Task Manager, Availability) | ✅ direct LLM responses |
| Web dashboard, Calendar+Projects, Team, Tasks, Notifications pages | ✅ |
| Dark mode (Tailwind `class` strategy, `ThemeProvider`, sun/moon toggle, Settings modal) | ✅ |
| Caddy reverse proxy + Docker Compose orchestration | ✅ |
| Cloudflare Tunnel | ✅ live at https://www.whatiskali.dev |
| Alembic migrations (initial schema, asyncpg SSL fix for Neon) | ✅ |
| Dev seed script (`backend/scripts/seed_dev.py`) | ✅ |
| GitHub Actions CI/CD (self-hosted runner, `deploy-staging.yml`, `deploy-prod.yml`) | ✅ |
| Staging environment (`staging.whatiskali.dev`, Neon Postgres cloud DB) | ✅ |
| Branch protection on `main` + `staging` (0 required approvals, stale review dismissal) | ✅ |
| RBAC enforcement on sensitive UI actions (Add/Delete Member, Add Project) | ✅ |
| TopBar avatar dropdown (Sign Out, Change Password) | ✅ |
| FastAPI Swagger/ReDoc gated behind `DEBUG=true` | ✅ |
| Telegram + Discord bot containers | ✅ scaffolded, idle without tokens |
| Voice service (Whisper) | ⏸ folder exists, not in `docker-compose.yml` |

---

## 2. Architecture Overview

```
Internet User
    │ HTTPS
    ▼
Cloudflare Edge  ──  Universal SSL  ──  DDoS / WAF
    │ Cloudflare Tunnel (outbound only)
    ▼
Mac Mini M4
  ├── cloudflared            (docker compose --profile tunnel)
  │       │ proxies to caddy:80
  │       ▼
  ├── docker compose
  │     ├── caddy        :80   reverse proxy
  │     ├── frontend     :3000 Next.js 20 dev server
  │     ├── backend      :8000 FastAPI uvicorn --reload
  │     ├── postgres     :5432
  │     ├── redis        :6379
  │     ├── telegram-bot       idle without token
  │     └── discord-bot        idle without token
  └── native macOS
        └── Ollama        :11434  Gemma 4 on Metal GPU
```

### Internal routing

```
caddy:80
  /api/*  →  backend:8000
  *       →  frontend:3000
```

### Request Flow

1. Client hits Caddy on port 80 (or `localhost:3000` / `localhost:8000` directly in dev).
2. Caddy routes `/api/*` to FastAPI, everything else to Next.js.
3. FastAPI authenticates the JWT, runs business logic, and persists to Postgres.
4. For AI calls, FastAPI delegates to the LangGraph router (`agents/graph.py`), which dispatches to one of four agent functions.
5. Each agent calls Ollama via `agents/llm.py` (an `AsyncOpenAI` client pointed at `host.docker.internal:11434/v1`).
6. Gemma 4 returns a JSON-shaped response, which the agent wraps and returns.
7. The frontend (TanStack React Query) receives the response and updates the UI.

---

## 3. Technology Stack

### Frontend

| Technology | Purpose | Version |
|---|---|---|
| Next.js (App Router) | React framework | 20 |
| React | UI library | 18 |
| TypeScript | Type safety | 5 |
| Tailwind CSS | Utility-first styling | 3 |
| TanStack React Query | Data fetching / cache | 5 |
| Axios | HTTP client | 1.x |
| lucide-react | Icon set | latest |
| date-fns | Date formatting | 3 |

### Backend

| Technology | Purpose | Version |
|---|---|---|
| FastAPI | REST API framework | 0.110+ |
| Python | Backend language | 3.11 |
| SQLAlchemy (async) | ORM | 2.x |
| asyncpg | Postgres driver | latest |
| Pydantic | Schemas & validation | 2.x |
| Alembic | Schema migrations | latest |
| passlib + bcrypt 4.0.1 | Password hashing | pinned |
| python-jose | JWT | latest |
| structlog | Structured logging | latest |

### AI

| Technology | Purpose |
|---|---|
| Ollama | Local LLM runtime (native macOS, Metal GPU) |
| Gemma 4 | LLM (`gemma4:latest`, 8B Q4_K_M) |
| LangGraph | Intent → agent routing |
| OpenAI Python SDK | Async client targeting Ollama's `/v1` endpoint |

> CrewAI was originally part of the stack but was removed. Gemma 4 underperforms inside CrewAI's ReAct loop, so each agent now calls the LLM directly with a tailored system prompt.

### Infrastructure

| Technology | Purpose |
|---|---|
| Docker Compose | Local orchestration |
| Caddy 2 | Reverse proxy on port 80 |
| PostgreSQL 16 | Primary data store |
| Redis 7 | Cache / pub-sub (provisioned, light usage today) |

---

## 4. System Components

### 4.1 Frontend (`frontend/`)

```
frontend/
├── app/
│   ├── layout.tsx                  # Root layout + React Query provider
│   ├── page.tsx                    # Landing — Sign In only (Get Started removed)
│   ├── login/page.tsx              # OAuth2-style login form
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + TopBar shell
│   │   ├── dashboard/page.tsx      # Stat cards + AI quick actions
│   │   ├── calendar/page.tsx       # Projects accordion (role-scoped) + derived status pills + filter pills + New Task per project
│   │   ├── team/page.tsx           # Team member list (Add/Delete admin-gated)
│   │   ├── tasks/page.tsx          # Task list; status filter pills (All/In Progress/Planned/Pending/Done); sorted by status; create/edit modal (project, dates, hours); status dropdown; Assign Resource modal; assignee chips with remove
│   │   └── notifications/page.tsx  # Filters · per-id mark read · archive
├── components/
│   ├── Sidebar.tsx
│   ├── TopBar.tsx                  # Avatar dropdown: Sign Out + Change Password + Settings (theme)
│   ├── ThemeProvider.tsx           # Dark-mode context: theme, toggleTheme, setTheme; persists in localStorage
│   ├── Providers.tsx               # Wraps app: ThemeProvider + QueryClientProvider
│   └── StatCard.tsx                # Stat card with dark-aware icon badge tints
├── lib/
│   ├── api.ts                      # Axios + grouped resource APIs: tasksApi, projectsApi, assignmentsApi, usersApi, authApi, notificationsApi
│   └── types.ts                    # Task, Project, ProjectDetail, Assignment, AssignmentStatus, extended TaskStatus (planned added)
└── ...config files
```

Conventions:
- Most pages use **TanStack React Query** (`useQuery` / `useMutation`).
- Axios attaches JWT from `localStorage["projectiq_token"]` on every request.
- Dark mode is controlled by the `dark` class on `<html>`. Preference stored in `localStorage["projectiq_theme"]` and initialised from `prefers-color-scheme` on first visit.
- Most API responses are unwrapped via `data?.data?.data` (envelope is `{data,error,status}`).
- RBAC: pages check `user.role` from `authApi.me()` to conditionally render admin actions.

### 4.2 Backend (`backend/`)

```
backend/
├── main.py                # FastAPI app, lifespan, CORS, idempotent ALTERs
├── config.py              # Pydantic Settings
├── database.py            # Async engine + session
├── routers/
│   ├── auth.py            # register (bootstrap-only), login, me, change-password, logout
│   ├── users.py
│   ├── events.py
│   ├── assignments.py     # CRUD + GET /user/{id}/overallocation
│   ├── tasks.py           # CRUD + lifecycle notification side-effects
│   ├── notifications.py   # list (active|archived) · markRead · archive · unarchive
│   ├── projects.py        # CRUD; detail endpoint joins tasks + user names
│   ├── agents.py          # POST /api/agents/run → LangGraph
│   ├── deps.py            # get_current_user
│   └── utils.py           # ok() / err() envelope helpers
├── agents/
│   ├── graph.py           # LangGraph router by action
│   ├── llm.py             # AsyncOpenAI client → Ollama /v1 + chat() helper
│   ├── scheduler_agent.py
│   ├── notifier_agent.py
│   ├── task_agent.py
│   └── availability_agent.py
├── models/                # SQLAlchemy models (User, Event, Task, Notification, Project, Assignment)
├── schemas/               # Pydantic request/response schemas
├── services/              # (placeholder for future business-logic extractions)
├── alembic/               # Migration skeleton (currently using create_all + ALTER IF NOT EXISTS)
└── requirements.txt
```

### 4.3 Database

PostgreSQL 16 (Docker, named volume `pgdata`) for production/local. Neon Postgres 17 (cloud) for staging.

Schema is managed entirely by **Alembic**. `Base.metadata.create_all` and the `ALTER IF NOT EXISTS` bootstrap block were removed from `lifespan` in Phase 2. Migrations live in `backend/alembic/versions/`.

On first clone (after `docker compose up -d`):

```bash
docker compose exec backend alembic upgrade head
```

The staging and production deploy workflows run `alembic upgrade head` automatically before restarting containers.

**asyncpg + Neon SSL note:** `asyncpg` does not accept `sslmode=require` as a URL query parameter. `database.py` and `alembic/env.py` strip the parameter and pass `ssl=ssl.create_default_context()` via `connect_args` instead.

### 4.4 Bots (`bots/`)

```
bots/
├── telegram/bot.py        # python-telegram-bot, idle if no token
└── discord/bot.py         # discord.py, idle if no token
```

Both containers run a guard loop that sleeps if the platform token is unset, so `docker compose up` works without real bot credentials.

### 4.5 Voice (`voice/`)

Folder scaffolded with Whisper code, **not yet added to `docker-compose.yml`**. See backlog item *Voice MVP*.

---

## 5. Agentic System Design

### 5.1 Routing — `backend/agents/graph.py`

A LangGraph state machine routes incoming actions to the right agent function:

| Action keywords | Agent |
|---|---|
| `assign_resource`, `allocate_engineer`, `optimize_assignments` | Scheduler |
| `send_notification`, `alert_team` | Notifier |
| `create_task`, `update_task`, `complete_task` | Task Manager |
| `detect_overallocation`, `check_coverage`, `flag_conflict` | Availability |

### 5.2 LLM Adapter — `backend/agents/llm.py`

```python
client = AsyncOpenAI(
    base_url=f"{settings.ollama_base_url}/v1",
    api_key="ollama",
)

async def chat(system: str, user: str) -> str:
    resp = await client.chat.completions.create(
        model=settings.ollama_model,           # gemma4:latest
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
    )
    return resp.choices[0].message.content
```

### 5.3 Why direct LLM, not CrewAI

CrewAI's default ReAct prompt format consistently produced empty `Final Answer:` blocks with the 8B Q4_K_M Gemma quantization. Replacing the ReAct loop with a single tailored system prompt + JSON-shaped output instruction gave reliable 700+ character responses with the same model and same Ollama install.

### 5.4 Endpoint

```
POST /api/agents/run
{
  "action": "schedule_shift",
  "payload": { "request": "Schedule John Saturday Morning", "event_id": 1 }
}
```

Response:

```
{
  "data": { "agent": "scheduler", "response": "<JSON string from Gemma>", "user_id": 1 },
  "error": null,
  "status": 200
}
```

### 5.5 Ollama Configuration (Mac Mini M4)

```bash
ollama pull gemma4
export OLLAMA_HOST=0.0.0.0
export OLLAMA_MAX_LOADED_MODELS=1
export OLLAMA_KEEP_ALIVE=24h
```

Observed performance on the M4 (16 GB):
- ~25–40 tokens/sec inference (Metal GPU)
- ~9.6 GB resident while loaded
- 1–4 concurrent requests practical

---

## 6. Data Models

> Notes:
> - All IDs are **integers** (PK serial), not UUIDs.
> - `availability` and `shared_with` are stored as plain strings today (free-form text / comma-separated user IDs). Both are candidates for stronger typing later.

### User (`models/user.py`)

```python
class User(Base):
    id: int (pk)
    name: str
    email: str (unique, indexed)
    password_hash: str
    role: enum(admin, leader, member)
    availability: str | None       # free-form text for now
    telegram_id: str | None
    discord_id: str | None
    is_active: bool = True
    created_at: datetime
    # relationships
    tasks  -> Task
    assignments -> Assignment.user_id
    notifications -> Notification
```

### Event (`models/event.py`)

```python
class Event(Base):
    id: int (pk)
    title: str
    description: str | None
    date: date                       # single-day events for the POC
    required_staff: int = 1
    created_by: int (fk users)
    created_at: datetime
```

### Assignment (`models/assignment.py`)

```python
class AssignmentStatus(str, enum.Enum):
    planned | active | on_hold | completed

class Assignment(Base):
    id: int (pk)
    user_id: int (fk users, on delete cascade)
    task_id: int (fk tasks, on delete cascade)
    start_date: datetime
    end_date: datetime | None
    allocation_pct: int = 100         # 1-100; sum >100 across active = overallocated
    status: AssignmentStatus = planned
    created_at: datetime
```

> `Shift` model was removed and replaced by `Assignment`.

### Project (`models/project.py`)

```python
class Project(Base):
    id: int (pk)
    name: str
    description: str | None
    status: enum(active, on_hold, completed) = active
    created_by: int (fk users)
    created_at: datetime
    # relationship
    tasks -> Task.project
```

### Task (`models/task.py`)

```python
class Task(Base):
    id: int (pk)
    user_id: int (fk users)          # owner
    project_id: int | None (fk projects, on delete set null)
    title: str
    notes: str | None
    status: enum(planned, pending, in_progress, done) = pending
    is_private: bool = False
    shared_with: str | None          # comma-separated user IDs
    start_date: datetime | None
    due_date: datetime | None
    estimated_hours: int | None
    created_at: datetime
    # relationships
    assignments -> Assignment.task_id
```

### Notification (`models/notification.py`)

```python
class Notification(Base):
    id: int (pk)
    user_id: int (fk users)          # recipient
    type: str                        # task_lifecycle | task_completed (legacy) | …
    message: str
    read: bool = False
    archived: bool = False
    task_id: int | None (fk tasks, on delete cascade)
    task_status: str | None          # pending | in_progress | done — drives the pill
    created_at: datetime
```

#### Lifecycle Logic (implemented in `routers/tasks.py`)

| Trigger | Notification effect |
|---|---|
| Task **created** | One `task_lifecycle` row inserted per admin/leader, `task_status=pending`, unread |
| Task **status changes** (not done → done, or any forward move) | The active (non-`done`) lifecycle row for each leader is **updated in place**: new status, new message, `read=false` |
| Task **reopened** (was `done`, now not) | A **new** lifecycle row is inserted — the previous "completed" row is left untouched as history |

This means each task has at most one *active* notification per leader at a time, and the recipient sees the same card update through the task's life — instead of getting flooded with one message per pill click.

---

## 7. API Design

Most endpoints return a consistent envelope:

```json
{ "data": <payload>, "error": null, "status": 200 }
```

The single exception is **`POST /api/auth/login`**, which returns the OAuth2-standard shape so Swagger's `Authorize` button works:

```json
{ "access_token": "<jwt>", "token_type": "bearer" }
```

### Auth — `/api/auth`

| Method | Path | Notes |
|---|---|---|
| GET | `/bootstrap-status` | Public. Returns `{needs_bootstrap: true/false}`. |
| POST | `/register` | Public **only when zero users exist**. First account forced to `admin`. |
| POST | `/login` | Form-encoded (OAuth2PasswordRequestForm). Unwrapped OAuth2 response. |
| GET | `/me` | Requires JWT. |
| POST | `/change-password` | Requires JWT + current password. Min 8-char new password. |
| POST | `/logout` | No-op (JWT is stateless); client discards token. |

### Users — `/api/users`
Standard list/create/get/update/delete. Role changes via PATCH.

### Events — `/api/events`
List, create, get, update, delete. `date` is a single day.

### Tasks — `/api/tasks`
List, create, get, patch (status/title/notes), delete. Patch triggers lifecycle notification side effects (see §6).

### Notifications — `/api/notifications`

| Method | Path | Notes |
|---|---|---|
| GET | `/?archived=false` | Active by default. Pass `archived=true` for archive view. |
| PATCH | `/{id}/read` | Frontend disables this until the linked task is `done`. |
| PATCH | `/{id}/archive` | Sets archived + read. |
| PATCH | `/{id}/unarchive` | Restores. |

(There is intentionally **no** `mark-all-read`.)

### Projects — `/api/projects`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | List all projects (members: only projects they have a task in). |
| POST | `/` | admin/leader | Create project. |
| GET | `/{id}` | any | Project detail with tasks + assigned user names. |
| PATCH | `/{id}` | admin/leader | Update name/description/status. |
| DELETE | `/{id}` | admin only | Delete project. |

### Assignments — `/api/assignments`

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/` | any | List assignments (members: own only). |
| POST | `/` | admin/leader | Create assignment. |
| GET | `/{id}` | any | Get assignment. |
| PATCH | `/{id}` | admin/leader | Update assignment. |
| DELETE | `/{id}` | admin/leader | Delete assignment. |
| GET | `/user/{user_id}/overallocation` | any | Returns total allocation %, overallocated flag, and active assignment list. |

### Agents — `/api/agents`

| Method | Path | Notes |
|---|---|---|
| POST | `/run` | `{ action, payload }`. Returns `{ agent, response, user_id }` envelope. |

### Health

`GET /health` → `200 OK`.

---

## 8. Authentication & Permissions

- JWT (HS256, `JWT_SECRET_KEY` from `.env`).
- 60-minute expiry.
- Token stored in **`localStorage["projectiq_token"]`** — to be migrated to httpOnly cookie before any non-POC deployment.
- Axios attaches `Authorization: Bearer <token>` to every request.
- FastAPI `/docs`, `/redoc`, `/openapi.json` only served when `DEBUG=true`.
- `/api/auth/register` is a bootstrap-only endpoint — disabled once the first user exists.

### Roles

| Role | Capabilities |
|---|---|
| **admin** | Full access; can change roles, manage all data. |
| **leader** | Sees all team tasks, receives lifecycle notifications, approves swaps. |
| **member** | Manages own tasks, sees own assignments, sees only projects they have a task in. |

RBAC is partially enforced (e.g. `_can_view` in `tasks.py`). Hardening tracked in the backlog.

---

## 9. Bot Integrations

The Telegram and Discord containers are **scaffolded but idle** — they start, see no token, and sleep. Adding real tokens to `.env` (`TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`) wakes them up. Command implementations are pending — see backlog.

Planned core command set (consistent across platforms):

```
/schedule          Show my upcoming shifts
/tasks             Show my open tasks
/done <task>       Mark a task complete
/coverage          Show team coverage
/swap <shift>      Request a swap
/ask <question>    Natural-language AI query
```

---

## 10. Voice Support

`voice/` directory contains Whisper code for local speech-to-text. It is **not yet added to `docker-compose.yml`** — bringing it online is a backlog item. The intended pipeline:

```
Audio → Whisper (local) → text → /api/agents/run → response
```

Whisper `base` model is sufficient for a POC and runs comfortably on the M4.

---

## 11. Infrastructure & Hosting

### 11.1 Local POC — what's running

The whole stack runs via `docker compose up -d` on the Mac Mini M4 (16 GB), with one exception: **Ollama runs natively on macOS**, not in Docker, so it can use the Metal GPU.

```
Remote user
    │ HTTPS → www.whatiskali.dev
    ▼
Cloudflare Edge  (Universal SSL, DDoS protection)
    │ Cloudflare Tunnel (outbound-only, no open inbound ports)
    ▼
Mac Mini M4
  ├── cloudflared      (docker compose --profile tunnel)
  ├── docker compose
  │     ├── caddy        :80   reverse proxy
  │     ├── frontend     :3000 Next.js 20 dev server
  │     ├── backend      :8000 FastAPI uvicorn --reload
  │     ├── postgres     :5432
  │     ├── redis        :6379
  │     ├── telegram-bot      idle without token
  │     └── discord-bot       idle without token
  └── native macOS
        └── Ollama       :11434  Gemma 4 on Metal GPU
```

### 11.2 Caddyfile

Uses a shared snippet `(app)` applied to both the named host (`www.whatiskali.dev`, `whatiskali.dev`) and the fallback `:80` block:

```caddy
(app) {
    handle /api/* {
        reverse_proxy backend:8000
    }
    handle {
        reverse_proxy frontend:3000
    }
    encode gzip
    log { output stdout format json }
}

http://www.whatiskali.dev { import app }
http://whatiskali.dev     { import app }
:80                        { import app }
```

### 11.3 Frontend volume mount (lessons learned)

The frontend service uses these volumes so source edits hot-reload while preserving the container's installed dependencies and build cache:

```yaml
volumes:
  - ./frontend:/app
  - /app/node_modules
  - /app/.next
```

### 11.4 Environment variables (`.env`)

```bash
# Database
DATABASE_URL=postgresql+asyncpg://projectiq:projectiq@postgres:5432/projectiq
REDIS_URL=redis://redis:6379

# Auth
JWT_SECRET_KEY=<generated>
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Ollama
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=gemma4:latest

# Bots (leave empty to keep the worker idle)
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=

# App
APP_ENV=development
DEBUG=true                         # enables /docs, /redoc, /openapi.json
NEXT_PUBLIC_API_URL=https://www.whatiskali.dev

# Cloudflare Tunnel (only needed with --profile tunnel)
CLOUDFLARE_TUNNEL_TOKEN=<jwt from Zero Trust dashboard>
```

### 11.5 Startup sequence

```bash
# 1. Make sure Ollama (macOS) is running
ollama list

# 2. Bring up the stack
docker compose up -d

# 3. Verify
docker compose ps
curl http://localhost:8000/health
open http://localhost:3000
```

### 11.6 Hardware budget (Mac Mini M4 16 GB)

| Service | RAM |
|---|---|
| macOS | ~3 GB |
| Ollama + Gemma 4 | ~10 GB |
| Docker Desktop VM | ~1 GB |
| Postgres + Redis + FastAPI + Next.js + bots + Caddy | ~1.5 GB |
| Headroom | ~0.5 GB |

### 11.7 Cloudflare Tunnel

The `cloudflared` container is wired into `docker-compose.yml` behind a Compose **profile** so it stays out of the default `up` command until you opt in. To bring the tunnel up:

1. In the Cloudflare Zero Trust dashboard: **Networks → Tunnels → Create a tunnel → Cloudflared**.
2. Copy the generated token into `.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
3. Add a Public Hostname for your tunnel routing your domain to the **service** `http://caddy:80`.
4. Start the tunnel container along with the rest of the stack:

```bash
docker compose --profile tunnel up -d
# or persist the choice:
export COMPOSE_PROFILES=tunnel
docker compose up -d
```

The tunnel runs outbound-only — no inbound ports are opened on the Mac. Optionally put a Cloudflare Zero Trust Access policy in front of the hostname to require email-OTP / SSO before users see the ProjectIQ login page.

### 11.8 Migration path

Same Compose stack runs on a Linux VPS unchanged; differences:

1. Move Ollama into Docker with GPU passthrough (or use Ollama Cloud).
2. Repoint `cloudflared` at the VPS.
3. Add scheduled `pg_dump` to S3 / B2.

---

## 11.9 CI/CD and Staging Environment

### Branch strategy

```
<dev-branch>  →  PR  →  staging  →  PR  →  main
```

- All development happens on personal dev branches (e.g. `jaleman-dev`, `mshatit-dev`).
- PRs to `staging` auto-deploy to `staging.whatiskali.dev` via GitHub Actions.
- PRs to `main` require manual approval in the GitHub Actions `production` environment before deploying to `whatiskali.dev`.

### GitHub Actions workflows

| Workflow | Trigger | Runner | Environment |
|---|---|---|---|
| `deploy-staging.yml` | push to `staging` | `self-hosted` (Mac Mini) | `staging` |
| `deploy-prod.yml` | push to `main` | `self-hosted` (Mac Mini) | `production` (required approval) |

Both workflows: `git reset --hard origin/<branch>` → `alembic upgrade head` → `docker compose up -d --build`.

### Staging stack

- Runs at `/Users/labanlaro/Projects/project-iq-staging` on the Mac Mini.
- `COMPOSE_PROJECT_NAME=projectiq-staging` keeps containers separate from production.
- Database: **Neon Postgres 17** (cloud) — configured via `DATABASE_URL` override in `docker-compose.override.yml` (gitignored in the staging folder).
- Frontend: host port 3002 · Backend: host port 8002.
- Caddy (production container) routes `staging.whatiskali.dev` → `host.docker.internal:8002/3002`.
- Seed data: `joe@example.com` / `password123`.

### Branch protection

Both `main` and `staging` have branch protection enabled (dismiss stale reviews, 0 required approvals while team is solo — bump to 1 when second developer is active full-time).

## 12. Roadmap

The previous embedded checklist has been moved to **[PRODUCT_BACKLOG.md](./PRODUCT_BACKLOG.md)**. That file is the source of truth for upcoming work and should be updated as items move through the funnel.

---

*ProjectIQ is a proof of concept. Architecture decisions favor simplicity and iteration speed over production-grade scalability.*

---

## 13. Developer Tooling — GitHub Copilot Customizations

ProjectIQ uses VS Code + GitHub Copilot Agent mode with a set of customization files under `.github/` to encode project-specific workflows and standards directly into the AI assistant.

### 13.1 File Locations

```
.github/
  prompts/
    feedback-inbox.prompt.md   # Interactive feedback inbox workflow
  instructions/                # (future) file-pattern-scoped coding standards
  agents/                      # (future) specialized subagents
  hooks/                       # (future) lifecycle shell commands
```

### 13.2 Prompts (`.prompt.md`)

Reusable task templates invoked on-demand in Copilot Chat by typing `/prompt-name`.

| Prompt | Trigger | Purpose |
|---|---|---|
| `feedback-inbox` | `/feedback-inbox` | Log in, fetch the feedback inbox, display all entries with reply status, send developer replies interactively — all without leaving VS Code. |

**How it works:**
1. Reads `.projectiq-creds` (email + password, two lines, `chmod 600`) from the workspace root — path resolved via `git rev-parse --show-toplevel`, works on any machine.
2. POSTs to `POST /api/auth/login` on **https://whatiskali.dev** (production) on every run to get a fresh JWT.
3. Fetches `GET /api/feedback/` and formats entries as a readable list.
4. Asks which entry to act on: **reply** or **done** toggle.

**Credentials file format** (`.projectiq-creds`, gitignored):
```
your@email.com
yourpassword
```

Create it with:
```bash
printf 'your@email.com\nyourpassword\n' > .projectiq-creds && chmod 600 .projectiq-creds
```

### 13.3 Credentials & Security

| File | Purpose | Gitignored |
|---|---|---|
| `.projectiq-creds` | Email + password for prompt auto-login | ✅ |
| `.projectiq-token` | Legacy manual JWT store (replaced by creds) | ✅ |

Both files are listed in `.gitignore`. The credentials file is created with `chmod 600` so only the owner can read it.

### 13.4 Adding New Prompts

Place new prompt files at `.github/prompts/<name>.prompt.md`. Minimum frontmatter:

```yaml
---
description: "What this prompt does — shown in the /command picker"
name: "Human Readable Name"
agent: "agent"
tools: ["runInTerminal", "readFile"]
---
```

Use VS Code's actual tool IDs (`runInTerminal`, `readFile`) — not snake_case variants — or the prompt will load with no tools.
