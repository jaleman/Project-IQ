# ProjectIQ — Team Development Workflow Guide

> **Who this is for:** Joe and Dev 2.
> This document explains every new system we are introducing, why it exists, and exactly how to set it up step by step.

---

## Table of Contents

1. [The Core Problem](#1-the-core-problem)
2. [The Three Environments](#2-the-three-environments)
3. [System Explanations](#3-system-explanations)
   - [Alembic — Database Migrations](#31-alembic--database-migrations)
   - [Neon — Cloud Database for Staging](#32-neon--cloud-database-for-staging)
   - [GitHub Environments and Secrets](#33-github-environments-and-secrets)
   - [SSH Deploy Key](#34-ssh-deploy-key)
   - [GitHub Actions — Automated Deploy](#35-github-actions--automated-deploy)
   - [Branch Strategy](#36-branch-strategy)
4. [How It All Fits Together](#4-how-it-all-fits-together)
5. [Implementation Plan](#5-implementation-plan)
   - [Phase 1 — Secrets and Environment Separation](#phase-1--secrets-and-environment-separation)
   - [Phase 2 — Alembic Migrations](#phase-2--alembic-migrations)
   - [Phase 3 — Local Dev Workflow](#phase-3--local-dev-workflow)
   - [Phase 4 — Automated Production Deploy](#phase-4--automated-production-deploy)
   - [Phase 5 — Staging Environment](#phase-5--staging-environment)
   - [Phase 6 — Branch Protection](#phase-6--branch-protection)
6. [Quick Reference — Day-to-Day Commands](#6-quick-reference--day-to-day-commands)

---

## 1. The Core Problem

Right now the project has one environment — the Mac Mini — and it is being used for everything at once:
production, Joe development work, and the live database are all the same thing. Dev 2 has a completely
separate copy on his own machine with no shared data.

**What this causes:**

- Joe code experiments can break the live site
- Dev 2 database is out of sync with Joe (missing tables or columns he added)
- There is no safe way to test a feature before real users see it
- Deploying means manually SSH-ing into the Mac Mini and running commands by hand

The goal is to create clear separation: **local sandbox -> shared testing space -> locked production.**

---

## 2. The Three Environments

| Environment | URL | Database | Who deploys |
|---|---|---|---|
| **Local Dev** | http://localhost:3000 | Each developer own private Postgres | Developer runs it manually |
| **Staging** | https://staging.whatiskali.dev | Neon cloud database (shared) | GitHub auto-deploys on merge to develop |
| **Production** | https://whatiskali.dev | Postgres on the Mac Mini | GitHub auto-deploys on merge to main |

**The rule:** code travels left to right. Write it locally, review it on staging, ship it to production. Nothing skips a step.

---

## 3. System Explanations

### 3.1 Alembic — Database Migrations

**What it is:** A tool that tracks changes to your database schema (tables, columns, indexes) as a series
of numbered files — the same way Git tracks changes to code.

**The problem it solves:** Right now the app creates the database from scratch on startup using create_all.
This works when you are the only developer and the only server. It breaks the moment two people share a database:

- If Joe adds a new column, Dev 2 database does not have it
- If CI deploys to staging, staging database does not have it either
- You cannot safely add a column without potentially breaking running queries

**How it works:** Alembic writes small "migration" files. Each file says "add this column" or
"create this table". Every database — local, staging, production — runs the same migrations in the
same order and ends up identical.

**Analogy:** It is like a recipe that says "first do step 1, then step 2, then step 3". Everyone who
follows the recipe ends up with the same dish, regardless of what they started with.

**Commands you will actually use:**

    # After pulling new code, bring your local database up to date:
    docker compose exec backend alembic upgrade head

    # After changing a model (adding a column, etc.), generate a new migration:
    docker compose exec backend alembic revision --autogenerate -m "add due_date to tasks"

    # Check what version your database is currently at:
    docker compose exec backend alembic current

---

### 3.2 Neon — Cloud Database for Staging

**What it is:** A Postgres database that lives in the cloud at neon.tech — not on anyone computer.

**Why you need it:** Staging needs a database that both developers and GitHub Actions can reach from anywhere.
If staging database lived on Joe Mac Mini, Dev 2 could not connect to it from his laptop, and neither could
GitHub servers. Neon gives you a real Postgres database with a connection URL that works from anywhere.
The free tier is more than enough for staging.

**What it looks like:** After creating a project on neon.tech, you get a connection string like:

    postgresql+asyncpg://username:password@ep-something.neon.tech/projectiq?sslmode=require

That URL goes into GitHub as a secret, and the staging deploy uses it automatically.

**Analogy:** It is like Google Docs vs. a Word file on your desktop. The Word file only exists on your
machine. Google Docs is accessible from anywhere by anyone you share it with.

---

### 3.3 GitHub Environments and Secrets

**What it is:** GitHub built-in way to store sensitive values (passwords, API keys, tokens) for each
environment separately — so they never appear in code.

**The problem it solves:** Right now each developer maintains a .env file locally. When Joe changes
JWT_SECRET_KEY in production, Dev 2 does not know. There is no automated way to pass secrets to the deploy
process. GitHub Environments solve this. You create staging and production environments, each with their own
set of secrets. The deploy workflow picks them up automatically. Staging secrets cannot be used by the
production workflow and vice versa.

**Where to find it:** GitHub repo -> Settings -> Environments

**Secrets you will store per environment:**

| Secret name | What it is |
|---|---|
| SSH_HOST | IP address or hostname of the Mac Mini |
| SSH_USER | The Mac username GitHub will log in as |
| SSH_PRIVATE_KEY | The private half of the SSH deploy key (explained next) |
| DEPLOY_PATH | Full path to the project folder |
| DATABASE_URL | Postgres connection string |
| JWT_SECRET_KEY | Long random string for signing login tokens |
| CLOUDFLARE_TUNNEL_TOKEN | Cloudflare tunnel token |

---

### 3.4 SSH Deploy Key

**What it is:** A cryptographic key pair that lets GitHub servers log into your Mac Mini over SSH to
run the deploy script — without using your real username and password.

**How key pairs work:** A key pair has two halves:

- **Private key** — kept secret. Goes into GitHub Secrets. Never shared.
- **Public key** — safe to share. Goes into ~/.ssh/authorized_keys on the Mac Mini.

When GitHub Actions tries to connect, it presents the private key. The Mac Mini checks its list of
authorized public keys — they match — the connection is allowed. Anyone without the matching private key
is refused.

**Analogy:** It is like a key fob for a secure building. The building has a list of authorized fobs
(public keys). You give GitHub the matching fob (private key). When it is time to deploy, GitHub holds
up the fob, the door opens, the script runs, and the door closes again.

---

### 3.5 GitHub Actions — Automated Deploy

**What it is:** A built-in GitHub feature that automatically runs a script whenever something happens
in your repo — like code being merged into main.

**Why you need it:** Right now deploying means Joe SSH-es into the Mac Mini, runs git pull, restarts
Docker, and hopes nothing was missed. GitHub Actions replaces all of that. You write the steps once in
a YAML file. GitHub runs those exact steps automatically every time code merges. Neither developer has
to touch the server.

**Analogy:** It is like setting up auto-pay for a bill. Instead of remembering to log in and pay each
month, the payment just happens automatically at the right moment.

**What the deploy script does in plain English:**
1. SSH into the Mac Mini
2. Go to the project folder
3. Pull the latest code from GitHub
4. Run alembic upgrade head (apply any new database changes)
5. Run docker compose up -d --build (rebuild and restart the app)

---

### 3.6 Branch Strategy

**What it is:** A convention for how code travels from a developer keyboard to production.

**The three branches:**

    jaleman-dev  ─┐
                  ├─  Pull Request (reviewed by the other dev)
    user1-dev   ─┘        |
                          v
                      staging (develop)  <- auto-deploys to staging.whatiskali.dev
                          |
                          v  Pull Request (final review before going live)
                         main           <- production branch, auto-deploys to whatiskali.dev

Each developer has one persistent branch named after them. You work on it freely and open a PR
into `staging` when you want your changes tested on the shared server. You never need to create
a new branch unless you want to isolate a risky experiment.

**Pull Request (PR):** When you want to merge a branch, you open a PR on GitHub. It shows exactly what
changed, line by line. The other developer reviews and approves it. Once approved, you merge it.

**Branch protection:** GitHub can be configured to prevent anyone from pushing directly to main without
a PR. This means nothing reaches production without being reviewed first.

**Why this matters:** Without this, either developer could push broken code directly to main and break
the live site. With branch protection, broken code hits staging first where you can both catch it.

---

## 4. How It All Fits Together

Here is the complete picture of a feature going from idea to production:

    1.  Joe writes code on  jaleman-dev  (local machine, local DB)
    2.  Joe opens a Pull Request from jaleman-dev into staging
    3.  Dev 2 reviews the code on GitHub and approves
    4.  Joe merges the PR
    5.  GitHub Actions automatically deploys to staging.whatiskali.dev
          - SSHes into Mac Mini
          - git pull (staging folder)
          - alembic upgrade head (Neon staging DB)
          - docker compose up --build (staging containers)
    6.  Both developers open staging.whatiskali.dev and verify the feature works
    7.  Joe opens a Pull Request from staging into main
    8.  Dev 2 approves
    9.  Joe merges the PR
    10. GitHub Actions automatically deploys to whatiskali.dev
          - SSHes into Mac Mini
          - git pull (production folder)
          - alembic upgrade head (production DB)
          - docker compose up --build (production containers)
    11. Feature is live. Neither developer touched the server manually.


---

## 5. Implementation Plan

> **Order matters.** Each phase builds on the previous one.
> Phases 1 through 3 are code and config changes only — nothing is deployed differently yet.
> Phases 4 through 6 are live infrastructure changes.

---

### Phase 1 — Secrets and Environment Separation

**Goal:** Make sure no secrets are in the repo and both developers have a complete template to work from.

**Step 1 — Verify .env is gitignored**

    cat .gitignore | grep .env

You should see .env listed. Already done in this repo — no action needed.

**Step 2 — Verify .env is not tracked by Git**

    git ls-files .env

This should return nothing. If it returns .env, run:

    git rm --cached .env
    git commit -m "chore: stop tracking .env"

**Step 3 — Review .env.example**

The current .env.example is complete. Both developers copy it to .env and fill in real values.
Ask Joe for the secrets — never share them over Slack or email in plain text; use a password manager.

**Step 4 — Create GitHub Environments**

1. Go to: https://github.com/jaleman/Project-IQ/settings/environments
2. Click New environment, name it production, and save
3. Click New environment, name it staging, and save
4. Optionally on the production environment, enable Required reviewers to force
   a human approval before production deploys run

You will fill in the actual secrets during Phases 4 and 5.

---

### Phase 2 — Alembic Migrations

**Goal:** Replace create_all with Alembic so schema changes are tracked, versioned, and repeatable
across all environments.

> Do this before inviting Dev 2 to share any database. Without Alembic there is no safe way
> to synchronize schemas between machines.

**Step 1 — Verify alembic/env.py is wired correctly**

The file at backend/alembic/env.py already imports config.settings and sets sqlalchemy.url.
No changes needed here — it is already wired up.

**Step 2 — Generate the initial migration**

Run this from inside the backend/ folder:

    cd backend
    alembic revision --autogenerate -m "initial schema"

This creates a new file in backend/alembic/versions/. Open it and review — it should contain
op.create_table(...) calls for every model. If it looks empty, check that all models are
imported in alembic/env.py.

**Step 3 — Test the migration against a clean database**

    # Wipe the local database volumes (dev only — NEVER run -v against production):
    docker compose down -v

    # Start just Postgres:
    docker compose up -d postgres

    # Apply the migration:
    docker compose exec backend alembic upgrade head

    # Start the rest of the app and verify it works:
    docker compose up -d

**Step 4 — Remove create_all from backend/main.py**

Find and remove the lines calling Base.metadata.create_all(...) and any
ALTER TABLE ... IF NOT EXISTS statements from the lifespan function.
Alembic owns schema creation now.

**Step 5 — Commit**

    git add backend/alembic/versions/ backend/main.py
    git commit -m "feat: Alembic initial schema migration, remove create_all"

---

### Phase 3 — Local Dev Workflow

**Goal:** Any developer can clone the repo and have a running app with sample data in under 10 minutes.

**Step 1 — Create a seed script at backend/scripts/seed_dev.py**

This script creates one admin user, one project, a few tasks, and sample assignments so a fresh
local database has something to look at. Run it once after alembic upgrade head:

    docker compose exec backend python scripts/seed_dev.py

**Step 2 — Handle port collisions on the Mac Mini (Joe only)**

Because Joe runs both production and a local dev stack on the same Mac Mini, they would collide
on ports 3000 and 8000. Create a docker-compose.override.yml in the project root to remap the
dev ports. This file is gitignored and lives only on Joe machine.

    # docker-compose.override.yml  (gitignored — not committed)
    services:
      frontend:
        ports:
          - "3001:3000"
      backend:
        ports:
          - "8001:8000"

Add docker-compose.override.yml to .gitignore.
Dev 2 does not need this file — his machine has nothing else running on those ports.

**Step 3 — Update README.md with a Local Setup section**

Add the following to the top of README.md so any new developer can follow it:

    ## Local Development Setup

    1. Clone the repo
       git clone https://github.com/jaleman/Project-IQ.git
       cd Project-IQ

    2. Copy the env template and fill in values
       cp .env.example .env
       # Edit .env — ask Joe for the real secret values

    3. Start the stack
       docker compose up -d

    4. Apply database migrations
       docker compose exec backend alembic upgrade head

    5. Seed sample data (first time only)
       docker compose exec backend python scripts/seed_dev.py

    6. Open the app
       http://localhost:3000

---

### Phase 4 --- Automated Production Deploy

**Goal:** Merging to main automatically deploys to production. No manual SSH required.

**Step 1 --- Generate an SSH deploy key on the Mac Mini**

    ssh-keygen -t ed25519 -C github-actions-deploy -f ~/.ssh/github_deploy_key -N ""

This creates two files:
- ~/.ssh/github_deploy_key       (private key, never share this)
- ~/.ssh/github_deploy_key.pub   (public key, safe to copy)

**Step 2 --- Authorize the key on the Mac Mini**

    cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys
    chmod 600 ~/.ssh/authorized_keys

**Step 3 --- Add secrets to the production GitHub Environment**

Go to Settings -> Environments -> production -> Add secret for each:

| Secret | Value |
|---|---|
| SSH_HOST | Mac Mini IP address (run: ipconfig getifaddr en0) |
| SSH_USER | labanlaro |
| SSH_PRIVATE_KEY | Full contents of ~/.ssh/github_deploy_key |
| DEPLOY_PATH | /Users/labanlaro/Projects/project-iq |
| JWT_SECRET_KEY | Your production JWT secret (long random string) |
| CLOUDFLARE_TUNNEL_TOKEN | Your production Cloudflare tunnel token |

**Step 4 --- Create .github/workflows/deploy-prod.yml**

The ${{ secrets.NAME }} syntax is how GitHub Actions reads secrets at runtime.
You write the secret name and GitHub fills in the real value when the workflow runs.

    name: Deploy - Production

    on:
      push:
        branches: [main]

    jobs:
      deploy:
        runs-on: ubuntu-latest
        environment: production
        steps:
          - name: Deploy via SSH
            uses: appleboy/ssh-action@v1.0.3
            with:
              host: ${{ secrets.SSH_HOST }}
              username: ${{ secrets.SSH_USER }}
              key: ${{ secrets.SSH_PRIVATE_KEY }}
              script: |
                cd ${{ secrets.DEPLOY_PATH }}
                git pull origin main
                docker compose exec -T backend alembic upgrade head
                docker compose up -d --build

**Step 5 --- Test it**

Merge a trivial change to main and watch the Actions tab on GitHub.
The workflow should run and succeed automatically.

> Before enabling this, verify that main branch reflects what is currently running on the Mac Mini.
> If they are out of sync, the first automated deploy may restart with the wrong code.

---

### Phase 5 --- Staging Environment

**Goal:** staging.whatiskali.dev runs a separate copy of the app with its own cloud database,
and auto-deploys when code merges to develop.

**Step 1 --- Create a Neon account and project**

1. Go to neon.tech and sign up (free)
2. Create a new project, name it projectiq-staging
3. Copy the connection string and convert it to the async format for the backend:

    postgresql+asyncpg://user:pass@ep-something.neon.tech/projectiq?sslmode=require

**Step 2 --- Add secrets to the staging GitHub Environment**

Same keys as production, but with staging values:

| Secret | Value |
|---|---|
| SSH_HOST | Same Mac Mini IP |
| SSH_USER | labanlaro |
| SSH_PRIVATE_KEY | Same deploy key (or generate a new one) |
| DEPLOY_PATH | /Users/labanlaro/Projects/project-iq-staging |
| DATABASE_URL | The Neon connection string from Step 1 |
| JWT_SECRET_KEY | A different random string from production |

**Step 3 --- Set up the staging folder on the Mac Mini**

    git clone https://github.com/jaleman/Project-IQ.git /Users/labanlaro/Projects/project-iq-staging
    cd /Users/labanlaro/Projects/project-iq-staging
    git checkout develop
    cp .env.example .env
    # Edit .env: set DATABASE_URL to the Neon connection string

Create a docker-compose.override.yml in the staging folder so staging does not collide with production:

    # /Users/labanlaro/Projects/project-iq-staging/docker-compose.override.yml
    services:
      frontend:
        ports:
          - "3002:3000"
      backend:
        ports:
          - "8002:8000"

**Step 4 --- Add the staging subdomain to the Caddyfile**

Add this block to the Caddyfile on the Mac Mini (alongside the production block):

    staging.whatiskali.dev {
        import app
    }

Then in the Cloudflare Zero Trust dashboard, add a new Public Hostname:
- Subdomain: staging
- Domain: whatiskali.dev
- Service: http://caddy:80

**Step 5 --- Create .github/workflows/deploy-staging.yml**

    name: Deploy - Staging

    on:
      push:
        branches: [develop]

    jobs:
      deploy:
        runs-on: ubuntu-latest
        environment: staging
        steps:
          - name: Deploy via SSH
            uses: appleboy/ssh-action@v1.0.3
            with:
              host: ${{ secrets.SSH_HOST }}
              username: ${{ secrets.SSH_USER }}
              key: ${{ secrets.SSH_PRIVATE_KEY }}
              script: |
                cd ${{ secrets.DEPLOY_PATH }}
                git pull origin develop
                COMPOSE_PROJECT_NAME=projectiq-staging docker compose exec -T backend alembic upgrade head
                COMPOSE_PROJECT_NAME=projectiq-staging docker compose up -d --build

---

### Phase 6 --- Branch Protection

**Goal:** Nobody can push directly to main or develop. All changes go through a reviewed Pull Request.

**Step 1 --- Create the develop branch**

    git checkout main
    git checkout -b develop
    git push -u origin develop

**Step 2 --- Protect main on GitHub**

1. Go to Settings -> Branches -> Add branch protection rule
2. Branch name pattern: main
3. Check: Require a pull request before merging
4. Check: Require approvals and set to 1
5. Check: Do not allow bypassing the above settings
6. Save

**Step 3 --- Protect develop with the same settings**

Repeat the above with branch pattern: develop

**Step 4 --- Dev 2 rebases his current work onto develop**

    # On Dev 2 machine:
    git fetch origin
    git checkout -b feature/his-current-work
    git rebase origin/develop
    # Then open a PR: feature/his-current-work -> develop

**Step 5 --- Handle the current jaleman-dev branch**

Option A (recommended): Open a PR from jaleman-dev into develop to merge the current state,
then delete jaleman-dev.

Option B: Rename jaleman-dev to a feature/ branch and continue using it normally.

---

## 6. Quick Reference --- Day-to-Day Commands

### Starting a work session (do these steps at the start of each day)

    git checkout jaleman-dev                             # (or user1-dev — your own branch)
    git pull                                             # get any changes you pushed from another machine
    docker compose exec backend alembic upgrade head     # sync your local DB to match the code

The alembic step is the new habit. If your teammate merged a schema change into staging and you pulled
it into your dev branch, this applies it to your local database. If nothing changed, it says
"already at head" and does nothing — always safe to run.

### When you change a model (add a column, new table, etc.)

    # 1. Edit the model file
    # 2. Generate the migration:
    docker compose exec backend alembic revision --autogenerate -m "describe what changed"
    # 3. Review the file created in backend/alembic/versions/ — make sure it looks right
    # 4. Apply it to your local database:
    docker compose exec backend alembic upgrade head
    # 5. Commit the model change AND the migration file together:
    git add backend/models/your_model.py backend/alembic/versions/
    git commit -m "feat: describe the change"

When your teammate pulls this branch and runs alembic upgrade head, their database gets the
new column automatically. No manual ALTER TABLE needed.

### Other useful commands

    # Start your local stack
    docker compose up -d

    # Check what migration version your database is currently at
    docker compose exec backend alembic current

    # Push your branch and open a PR to staging
    git push origin jaleman-dev          # (or user1-dev)
    # Then go to GitHub and open the Pull Request targeting the staging branch

