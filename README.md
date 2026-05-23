# e-SITREP System

Secure web platform to automate **Daily** and **Weekly Border Situation Reports (SITREPs)** for NCIC — station data entry, HQ review workflow, consolidated national daily SITREP (HQ compressed format), and weekly Excel matrix export.

**Stack:** Next.js 16, TypeScript, Prisma, PostgreSQL, NextAuth (credentials).

## Quick start

### 1. Prerequisites

- Node.js 20+
- Docker Desktop (for PostgreSQL)

### 2. Environment

```bash
cp .env.example .env
```

Edit `.env` and set `AUTH_SECRET` (e.g. `openssl rand -base64 32`).

### 3. Database

```bash
docker compose up -d
pnpm install
pnpm db:push
pnpm db:seed
```

### 4. Run

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo accounts

Password for all users: **`Demo@2026`**

| Username | Role | Use |
|----------|------|-----|
| `elegu.inputter` | Station inputter | Daily data entry (Elegu) |
| `reviewer` | HQ reviewer | Inbox → Review |
| `verifier` | HQ verifier | Verify → Generate consolidated |
| `authoriser` | HQ authoriser | Approve reports |
| `admin` | Admin | Full access |

**Sample data:** Elegu report for **2026-05-08** is pre-seeded and **approved** (matches `instructions/support-files/strep system.txt`).

## Features (MVP)

- Station arrivals/departures by nationality and gender
- Asylum seekers and remarks
- Workflow: draft → submitted → reviewed → verified → approved
- Consolidated SITREP text generator (HQ format)
- Weekly Excel export (stations × days)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm db:push` | Apply Prisma schema |
| `pnpm db:seed` | Seed stations, roles, demo users, Elegu report |
| `pnpm test:formatter` | Validate Elegu consolidated strings |

## Project docs

Requirements and samples live in [`instructions/`](instructions/). Implementation plan: [`e-sitrep_mvp_build_a94b9943.plan.md`](e-sitrep_mvp_build_a94b9943.plan.md).

## Phase 2 (deferred)

Offline PWA, Keycloak SSO, PDF templates matching exact government layout, admin CRUD UI, Kubernetes deployment.
