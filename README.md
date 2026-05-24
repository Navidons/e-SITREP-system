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
| `<station>.inputter` | Station inputter | Land posts use nationality batches; **`entebbe.inputter`** uses airport modules (flights, deportees, offloaded, occurrences) |
| `reviewer` | HQ reviewer | Inbox → Review |
| `verifier` | HQ verifier | Verify → Generate consolidated |
| `authoriser` | HQ authoriser | Approve reports |
| `admin` | Admin | Full access |
| `eastern.supervisor` | Cluster supervisor | Eastern cluster (read-only scope in MVP) |

**Sample data:**

- **56 border stations** seeded (names and S/N order from `instructions/support-files/WEEKLY STATISTICS 02.08 MAY 2026.xlsx`).
- **Demo week 17–23 May 2026**: seven days per station with mixed statuses (draft → approved).
- **Elegu 2026-05-08**: approved day matching the NCIC sample totals.
- **Entebbe 2026-05-08**: submitted airport sample from the Entebbe PDF (flights, deportees, offloaded, inadmissible).
- Nationality codes in the database are stored as **ISO alpha-2**; user Settings only change how codes appear in forms (alpha-2 vs alpha-3).

**Consolidated SITREP test:** use date **2026-05-22** (many stations approved that day).

**Weekly matrix export:** log in as `admin` or `verifier` → **Weekly export** → choose date range → download. Layout matches `instructions/support-files/WEEKLY STATISTICS 02.08 MAY 2026.xlsx`. Demo week **17–23 May 2026** is fully approved after `pnpm db:seed`.

## Features (MVP)

- Station arrivals/departures by nationality and gender
- Asylum seekers and remarks
- Workflow: draft → submitted → reviewed → verified → approved
- Consolidated SITREP text generator (HQ format)
- Weekly Excel export — NCIC matrix (stations × days, arrivals/departures per day, weekly & grand totals)

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Development server |
| `pnpm db:push` | Apply Prisma schema |
| `pnpm db:seed` | Seed stations, roles, demo users, Elegu report |
| `pnpm test:formatter` | Validate Elegu consolidated strings |

## Documentation

| Document | Description |
|----------|-------------|
| [**5-page complete guide**](docs/SYSTEM_GUIDE.md) | Everything in one short document (setup, roles, entry, HQ, exports, APIs, demo) — print-friendly |
| [**System documentation (A–Z)**](docs/SYSTEM_DOCUMENTATION.md) | Full system guide: architecture, RBAC, workflows, APIs, land vs air, exports |
| [`instructions/`](instructions/) | NCIC requirements and sample PDFs/Excel |
| [`e-sitrep_mvp_build_a94b9943.plan.md`](e-sitrep_mvp_build_a94b9943.plan.md) | Implementation plan |

## Phase 2 (deferred)

Offline PWA, Keycloak SSO, PDF templates matching exact government layout, admin CRUD UI, Kubernetes deployment.
