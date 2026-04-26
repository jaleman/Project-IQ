# ProjectIQ — Product Backlog

> **Purpose:** Track upcoming work for the POC and beyond. Items are grouped by theme, then ranked roughly in priority order. Move items between sections (Now / Next / Later / Done) as work progresses.
>
> **Status legend:** ⏸ not started · 🟡 in progress · ✅ done · 🧊 deferred
>
> **Last updated:** April 2026

---

## Now (current iteration)

| # | Item | Notes | Status |
|---|---|---|---|
| 1 | **Cloudflare Tunnel** — set `CLOUDFLARE_TUNNEL_TOKEN` in `.env` and bring the stack up with `docker compose --profile tunnel up -d`. Verify the public hostname loads the dashboard. | Container is wired in `docker-compose.yml` behind the `tunnel` profile. Routing in Cloudflare dashboard → `http://caddy:80`. | 🟡 |
| 2 | **Cleanup** — remove `crewai` from `backend/requirements.txt` (no longer used after switch to direct LLM calls); delete any stale `*.py.new` files. | Slims the image significantly. | ⏸ |
| 3 | **Avatar uses real initial** — pull `name` from `/api/auth/me` and replace the hard-coded `U` in `TopBar`. | Trivial UI fix. | ⏸ |

---

## Next (high-impact, well-scoped)

### Persistence & ops

| Item | Notes |
|---|---|
| Replace `create_all` + `ALTER IF NOT EXISTS` with **Alembic** migrations | Skeleton already exists in `backend/alembic/`. |
| Restart resilience test | `docker compose down && up`; confirm admin user, tasks, notifications survive. |
| Daily Postgres backup | `pg_dump` → host folder (or B2/S3). Cron via `launchd` on the Mac. |
| Logout endpoint + UI | `/api/auth/logout` + avatar dropdown with **Sign out**. |
| Move JWT from `localStorage` to **httpOnly cookie** + refresh tokens | Prereq before any non-POC deployment. |

### Calendar — make it a real calendar

| Item | Notes |
|---|---|
| Replace list-of-shifts with `react-big-calendar` (or `@fullcalendar/react`) | Month / week / day views. |
| Drag-to-create a shift | Opens a prefilled modal (user picker, start/end). |
| Drag-to-reschedule existing shift | PATCH `/api/shifts/{id}`. |
| Color-code shifts by user/role | Use a deterministic palette per `user_id`. |

### Shifts polish

| Item | Notes |
|---|---|
| Shift create/edit modal in UI (currently only via Swagger) | Reuse the modal pattern from Tasks. |
| Swap-request workflow end-to-end | Member requests → leader approves → notification fires for both parties. |
| Conflict detection | Server-side overlap check on create/update; warning chip in UI. |

### Tasks improvements

| Item | Notes |
|---|---|
| **Edit task** modal (title, notes, private flag) | Currently we only cycle status / delete. |
| Assign task to another user | UI for `shared_with`; consider switching to a join table later. |
| Due dates + reminder notification job | Reuse the lifecycle notification model. |

### AI agents — useful, not just plumbed

| Item | Notes |
|---|---|
| Wire **Dashboard Quick Actions** to real flows that mutate the DB | Scheduler suggests assignments → user accepts → shifts created. |
| **Chat panel** ("Ask the AI") backed by `/api/agents/run` | Persistent thread per user. |
| **Token streaming** (SSE) | Users see tokens as they generate; better UX with Gemma's pace. |

### Bots become real

| Item | Notes |
|---|---|
| Set Telegram + Discord bot tokens in `.env`; verify both come online | One-time secret setup. |
| Implement `/myshifts`, `/swap`, `/done <task>` commands | Hits FastAPI as the linked user. Requires a user-link flow first. |
| User linking flow | `/link <one-time-code>` from bot → stores `telegram_id` / `discord_id` on user. |
| Push notifications via bot when a shift is assigned | Trigger from `routers/shifts.py` create/assign. |

### Voice MVP

| Item | Notes |
|---|---|
| Add `voice/` to `docker-compose.yml` | Whisper `base` model is enough. |
| Endpoint: `POST /api/voice/transcribe` (audio → text → `/api/agents/run` → response) | Single round-trip for demos. |
| Demo flow: record on phone → see shift created | "Schedule John Saturday 9-1." |

---

## Later (production hardening / scope expansion)

| Theme | Items |
|---|---|
| **Auth** | First-user bootstrap UX (skip `/register` after one admin exists); password reset; SSO via Cloudflare Access. |
| **RBAC** | Centralize the role checks (currently scattered); add an audit log of every change. |
| **Observability** | Sentry / Glitchtip; lightweight `/metrics`; `/api/admin/logs` viewer. |
| **Tests** | Pytest suite (auth, tasks lifecycle, notification transitions, archive). Playwright smoke test (login → create task → cycle → see notification → archive). |
| **Mobile PWA** | Manifest, icons, install prompt, offline cache for read views. |
| **Analytics** | Coverage heatmap; per-user "tasks completed this week". |
| **Migration to VPS** | Linux host + Ollama in Docker w/ GPU passthrough (or Ollama Cloud). |
| **Internationalization** | i18n scaffold; date/time formatting per user locale. |

---

## Tech debt / known issues

| Item | Notes |
|---|---|
| `crewai` still in `requirements.txt` | Remove. |
| `User.availability` and `Task.shared_with` are free-form strings | Promote to structured types. |
| Frontend pages assume `data.data.data` shape | A response interceptor that auto-unwraps `{data,error,status}` would clean this up everywhere. |
| `services/` folder is empty | When business logic in routers grows, extract here. |
| No CI yet | Add a GitHub Actions workflow once we move off solo dev. |
| Sidebar has no auth gate | Visiting `/dashboard` without a token should redirect to `/login`. |
| Dev hot-reload reloads on every backend file edit | Acceptable; just keep an eye on agent files thrashing during edits. |

---

## Recently Done ✅

| Item | When |
|---|---|
| `cloudflared` service added to `docker-compose.yml` (behind `tunnel` profile) + `.env` placeholder + docs updated | Apr 2026 |
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
