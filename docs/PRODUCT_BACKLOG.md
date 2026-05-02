# ProjectIQ — Product Backlog

> **Purpose:** Track upcoming work for the POC and beyond. Items are grouped by theme, then ranked roughly in priority order. Move items between sections (Now / Next / Later / Done) as work progresses.
>
> **Status legend:** ⏸ not started · 🟡 in progress · ✅ done · 🧊 deferred
>
> **Last updated:** May 2026

---

## Now (current iteration)

| # | Item | Notes | Status |
|---|---|---|---|
| — | *(no active items — see Next for upcoming work)* | | |

---

## Next (high-impact, well-scoped)

### Persistence & ops

| Item | Notes |
|---|---|
| Restart resilience test | `docker compose down && up`; confirm admin user, tasks, notifications survive. |
| Daily Postgres backup | `pg_dump` → host folder (or B2/S3). Cron via `launchd` on the Mac. |
| Logout endpoint + UI | `/api/auth/logout` + avatar dropdown with **Sign out**. |
| Move JWT from `localStorage` to **httpOnly cookie** + refresh tokens | Prereq before any non-POC deployment. |

### Calendar — make it a real calendar

| Item | Notes |
|---|---|
| Replace event list with `react-big-calendar` (or `@fullcalendar/react`) | Month / week / day views showing tasks by due date. |
| Color-code tasks by status/project | Use a deterministic palette per project or status. |

### Calendar page improvements

| Item | Notes |
|---|---|
| **Replace Upcoming Events with My Tasks view** | Replace the Upcoming Events panel on the Calendar page with a personal task list. The current user should only see tasks assigned to them regardless of which project is selected. Should support the same status filter pills (pending / planned / in progress / done) and show project badge, due date, and estimated hours per row. Admins and leaders should also only see their own tasks in this panel (use the Tasks page for a full view). |

### Tasks improvements

| Item | Notes |
|---|---|
| **Task status filter pills on Tasks page** | Add All / Pending / Planned / In Progress / Done filter pills above the task list. Match the Notifications page UX exactly: same `rounded-full` pill style, `bg-brand-600 text-white` for active, ghost border for inactive, client-side filter via `useMemo`. No backend changes needed — filter against the already-fetched task list. |
| Assign task to another user | UI for `shared_with`; consider switching to a join table later. |
| Due dates + reminder notification job | Reuse the lifecycle notification model. |

### AI agents — useful, not just plumbed

| Item | Notes |
|---|---|
| Wire **Dashboard Quick Actions** to real flows that mutate the DB | Scheduler suggests assignments → user accepts → shifts created. Quick Actions panel should only be visible to **admin and leader** roles — hide entirely for members. |
| **Chat panel** ("Ask the AI") backed by `/api/agents/run` | Persistent thread per user. |
| **Token streaming** (SSE) | Users see tokens as they generate; better UX with Gemma's pace. |

### Bots become real

| Item | Notes |
|---|---|
| Set Telegram + Discord bot tokens in `.env`; verify both come online | One-time secret setup. |
| Implement `/mytasks`, `/done <task>`, `/assignments` commands | Hits FastAPI as the linked user. Requires a user-link flow first. |
| User linking flow | `/link <one-time-code>` from bot → stores `telegram_id` / `discord_id` on user. |
| Push notifications via bot when a task is assigned | Trigger from `routers/tasks.py` create/assign. |

### Voice MVP

| Item | Notes |
|---|---|
| Add `voice/` to `docker-compose.yml` | Whisper `base` model is enough. |
| Endpoint: `POST /api/voice/transcribe` (audio → text → `/api/agents/run` → response) | Single round-trip for demos. |
| Demo flow: record on phone → see assignment created | "Assign John to the auth task at 50%." |

---

## Later (production hardening / scope expansion)

| Theme | Items |
|---|---|
| **Auth** | Server-side JWT revocation (Redis blacklist) so `POST /api/auth/logout` actually invalidates the token instead of being a no-op (currently logout is client-side only — token remains valid until its 60-min expiry). Password reset; SSO via Cloudflare Access. |
| **RBAC** | Centralize the role checks (currently scattered); add an audit log of every change. |
| **Observability** | Sentry / Glitchtip; lightweight `/metrics`; `/api/admin/logs` viewer. |
| **Tests** | Pytest suite (auth, tasks lifecycle, notification transitions, archive). Playwright smoke test (login → create task → cycle → see notification → archive). |
| **Mobile PWA** | Manifest, icons, install prompt, offline cache for read views. |
| **Analytics** | Coverage heatmap; per-user "tasks completed this week". |
| **Migration to VPS** | Linux host + Ollama in Docker w/ GPU passthrough (or Ollama Cloud). |
| **Internationalization** | i18n scaffold; date/time formatting per user locale. |

---

## Done (shipped)

| Item | Notes |
|---|---|
| Replace `create_all` + `ALTER IF NOT EXISTS` with **Alembic** migrations | Initial migration `a9e6e26c7ef9` applied to production and staging. `lifespan` no longer runs DDL. |
| Dev seed script (`backend/scripts/seed_dev.py`) | Creates admin + member user, 1 project, 4 tasks. Run once after `alembic upgrade head`. |
| GitHub Actions CI/CD — staging deploy | `deploy-staging.yml` on self-hosted runner; auto-deploys on push to `staging`. |
| GitHub Actions CI/CD — production deploy | `deploy-prod.yml` on self-hosted runner; requires manual approval in `production` environment. |
| Staging environment (`staging.whatiskali.dev`) | Separate Docker Compose project on Mac Mini; Neon Postgres cloud DB; seed data live. |
| Branch protection on `main` + `staging` | Dismiss stale reviews; 0 required approvals (solo dev — raise to 1 when second dev joins full-time). |
| Feedback inbox Copilot prompt | `/feedback-inbox` — hits production API, workspace-relative creds path, works on any machine. |

---

## Tech debt / known issues

| Item | Notes |
|---|---|
| `crewai` still in `requirements.txt` | Remove. |
| `User.availability` and `Task.shared_with` are free-form strings | Promote to structured types. |
| Frontend pages assume `data.data.data` shape | A response interceptor that auto-unwraps `{data,error,status}` would clean this up everywhere. |
| `services/` folder is empty | When business logic in routers grows, extract here. |
| No CI yet | Add a GitHub Actions workflow once we move off solo dev. |
| Dev hot-reload reloads on every backend file edit | Acceptable; just keep an eye on agent files thrashing during edits. |

---

## Recently Done ✅

| Item | When |
|---|---|
| **Fix: dark mode flash on refresh (FOUC)** — Blocking inline `<script>` in `<head>` applies `dark` class before first paint; `suppressHydrationWarning` on `<html>` prevents React mismatch. | Apr 2026 |
| **Feedback: Mark done / Reopen toggle** — `done` boolean column on `Feedback`; `PATCH /api/feedback/{id}/done` endpoint; Done badge + dimmed card + toggle button on frontend; prompt updated. | Apr 2026 |
| **Feedback: reply UX fixes** — Reply now replaces existing text (not appends); blank reply clears the field; Save button always enabled; textarea pre-filled with existing reply. | Apr 2026 |
| **Fix: cascade delete assignments on task delete** — Added `cascade='all, delete-orphan'` to `Task.assignments` and `ondelete='CASCADE'` to `Assignment.task_id` FK. | Apr 2026 |
| **Auth gate on dashboard** — `AuthGuard` component wraps the dashboard layout; redirects unauthenticated users to `/login`. | Apr 2026 |
| **Shift → Assignment refactor** — Dropped `Shift` model entirely; added `Assignment` (user_id, task_id, start_date, end_date, allocation_pct, status: planned\|active\|on_hold\|completed). `AssignmentService.detect_overallocation()` added. All shift references removed from agents, bots, voice service, frontend. | Apr 2026 |
| **Task scheduling fields** — Added `start_date`, `due_date`, `estimated_hours` to `Task` model and schema. | Apr 2026 |
| **Task modal improvements** — Project dropdown, start/due date pickers, estimated hours field, edit pre-fill. | Apr 2026 |
| **Assign Resource UI** — `AssignModal` on Tasks page: engineer picker, allocation %, start/end dates, status selector. Assigned resources shown as colour-coded chips under each task row with inline remove (×). | Apr 2026 |
| **Task status: `planned` added** — New purple pill state; status dropdown replaces cycling button (any-state picker). | Apr 2026 |
| **Projects: New Task from Calendar** — Checkbox icon + "New Task" button on each project row opens a task modal pre-populated with the project. | Apr 2026 |
| **Projects: derived status pill** — Project status pill now derived from task states (pending/active/done) instead of a stored enum. | Apr 2026 |
| **Projects: filter pills** — All / pending / active / done filter pills above the project list. | Apr 2026 |
| **Projects: role-scoped list** — Members only see projects they have a task assigned to; admins/leaders see all. | Apr 2026 |
| **Edit task** modal (title, notes, project, dates, hours, private flag) — Full edit support added. | Apr 2026 |
| **Cleanup** — removed `crewai` from `backend/requirements.txt`; switched all agents to direct Ollama calls. | Apr 2026 |
| **Avatar real initial** — `TopBar` derives initial from `user.name` via `/api/auth/me`. | Apr 2026 |
| **Dark mode** — Tailwind `darkMode: "class"` strategy; `ThemeProvider` context (localStorage persistence + `prefers-color-scheme` fallback); sun/moon toggle in TopBar; Settings modal with Light/Dark selector; full `dark:` coverage across all pages, modals, inputs, badges, and stat cards ([PR #1](https://github.com/jaleman/Project-IQ/pull/1)) | Apr 2026 |
| `cloudflared` service added to `docker-compose.yml` (behind `tunnel` profile) + `.env` placeholder + docs updated | Apr 2026 |
| Cloudflare Tunnel live at https://www.whatiskali.dev (universal SSL, Caddy ingress) | Apr 2026 |
| `POST /api/auth/register` locked to first-user bootstrap (forces admin); `GET /api/auth/bootstrap-status` added | Apr 2026 |
| TopBar avatar dropdown with **Sign out** (clears JWT + React Query cache, redirects to `/login`) | Apr 2026 |
| Landing page **Get Started** button removed — only **Sign In** remains | Apr 2026 |
| FastAPI `/docs`, `/redoc`, `/openapi.json` gated behind `DEBUG=true` | Apr 2026 |
| Lifecycle notifications: per-task active card that updates in place; reopen creates new lifecycle | Apr 2026 |
| Filters (All / Pending / In Progress / Completed) on Notifications page | Apr 2026 |
| Per-id **Mark read** (gated to `done` tasks) — replaced "Mark all read" | Apr 2026 |
| Archive / unarchive notifications + dedicated archived view | Apr 2026 |
| Single-form modal for **New Task** (title, notes, private checkbox) | Apr 2026 |
| Task ↔ notification status pill sync | Apr 2026 |
| Removed inert notification bell from `TopBar` (kept commented for revival) | Apr 2026 |
| Frontend `./frontend:/app` volume mount + anonymous `node_modules` / `.next` | Apr 2026 |
| Login response unwrap fix (frontend) | Apr 2026 |
| Switched all 4 AI agents from CrewAI ReAct to direct Ollama via OpenAI-compatible API | Apr 2026 |
| `User.shifts` ambiguous-FK fix (explicit `foreign_keys`) | Apr 2026 |
| `bcrypt==4.0.1` pin (passlib compatibility) | Apr 2026 |
| Initial scaffold: Next.js + FastAPI + Postgres + Redis + Caddy + bots + Compose | Apr 2026 |

---

## How to use this file

- New work: add to **Now** or **Next**, with a short note on scope.
- When you start something, change ⏸ → 🟡 and (optionally) link a branch/PR.
- When done, move the row to **Recently Done ✅** with the month it shipped.
- If something gets parked, mark 🧊 and leave it in **Later**.
