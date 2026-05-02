# ProjectIQ

## Local Development Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/jaleman/Project-IQ.git
   cd Project-IQ
   ```

2. **Copy the env template and fill in values**
   ```bash
   cp .env.example .env
   # Edit .env — ask Joe for the real secret values
   ```

3. **Start the stack**
   ```bash
   docker compose up -d
   ```

4. **Apply database migrations**
   ```bash
   docker compose exec backend alembic upgrade head
   ```

5. **Seed sample data** *(first time only)*
   ```bash
   docker compose exec backend python scripts/seed_dev.py
   # Admin:  joe@example.com  / password123
   # Member: dev2@example.com / password123
   ```

6. **Open the app**
   - Frontend: http://localhost:3000
   - API docs: http://localhost:8000/docs *(only available when DEBUG=true)*

> **Mac Mini users (Joe):** Create a `docker-compose.override.yml` in the project root to remap
> dev ports so they don't collide with the production stack. See `docs/TEAM_WORKFLOW_GUIDE.md`
> Phase 3 for the exact file contents. This file is gitignored — do not commit it.

---
