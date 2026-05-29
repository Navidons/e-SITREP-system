# e-SITREP System — Complete Guide (5 pages)

**Electronic Situation Report automation · NCIC, Ministry of Internal Affairs — Uganda**  
MVP · Next.js 16 · May 2026

| | |
|---|---|
| **Full reference** | [`SYSTEM_DOCUMENTATION.md`](./SYSTEM_DOCUMENTATION.md) (30 sections, developer detail) |
| **This guide** | Everything you need on **≤5 printed pages** — setup, roles, data entry, HQ workflow, outputs, APIs, demo |

---

## 1. What it is and why

**e-SITREP** replaces manual border situation reporting. Officers at **56 NCIC entry/exit points** (weekly matrix) record daily movements; HQ **reviews, verifies, and approves**; the system produces:

1. **Per-station daily totals** (by nationality/gender or airport modules)  
2. **National consolidated daily SITREP** (HQ compressed nationality lines)  
3. **Weekly Excel matrix** (stations × days, arrivals/departures, grand totals)

Manual process today: each post sends a report → HQ retypes into one national SITREP → weekly Excel by hand. This system adds **workflow, locking, amendments, audit trail, and one-click exports**.

**Reference formats:** `instructions/support-files/` (Elegu sample, weekly XLSX, Entebbe PDF, RBAC/workflow notes).

---

## 2. Stack, setup, environment

| Layer | Technology |
|-------|------------|
| App | Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 |
| Auth | NextAuth v5 (credentials, JWT session) |
| Data | Prisma 6 → PostgreSQL on Render (or Docker locally) |
| Export | ExcelJS (weekly matrix) |

**First-time setup**

```bash
cp .env.example .env          # DATABASE_URL (Render external URL), AUTH_SECRET
pnpm install && pnpm db:push && pnpm db:seed
pnpm dev                      # http://localhost:3000
```

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL (Render external or internal URL) |
| `AUTH_SECRET` | Session signing (required) |
| `NEXTAUTH_URL` | Public URL in production |

| Command | Action |
|---------|--------|
| `pnpm dev` / `pnpm build` | Run / production build |
| `pnpm db:push` | Apply schema |
| `pnpm db:seed` | Demo stations, users, sample week |
| `pnpm test:formatter` | Validate consolidated strings vs Elegu sample |

**Architecture (one line):** Browser → Next.js pages + `/api/*` → `lib/*` (daily-day, workflow, amendments, formatter, weekly-matrix) → Prisma → PostgreSQL. Middleware enforces login; every API checks permissions and station scope.

**Core rule:** one `station_daily_report` per **station + calendar date**; many `daily_entries` appended through the day with `recordedAt`.

---

## 3. Roles, permissions, and routes

### Roles

| Role | Who | Main job |
|------|-----|----------|
| `STATION_INPUTTER` | Border officer | Enter data for **own station only** |
| `CLUSTER_SUPERVISOR` | Regional lead | Review scope + station (MVP limited) |
| `HQ_REVIEWER` | HQ | Review submitted reports |
| `HQ_VERIFIER` | HQ | Verify; consolidated SITREP + weekly export |
| `HQ_AUTHORISER` | HQ | Approve verified reports |
| `ADMIN` | ICT | Users, stations, full access |

### Permissions (high level)

| Permission | Used for |
|------------|----------|
| `station.input` | Daily entry, submit day |
| `report.review` | Review, reject (early stages) |
| `report.verify` | Verify, reject |
| `report.approve` | Approve, reject |
| `report.generate.consolidated` | National daily SITREP text |
| `weekly.export` | Weekly Excel download |
| `admin.users` | Admin console |

### Where users land

| Role | Home |
|------|------|
| `ADMIN` | `/admin` |
| HQ roles | `/hq/inbox` |
| Station | `/station` |

**Auth:** username + password (bcrypt). Station users **must** have `stationId`. Session carries `roles`, `permissions`, `stationId`.

### Main UI routes

| Path | Who | Purpose |
|------|-----|---------|
| `/station` | Inputters | Today + previous days; land or air workspace |
| `/hq/inbox` | HQ | Preview, review workflow, amendments |
| `/hq/consolidated` | Verifier+ | National SITREP for a date |
| `/weekly` | Verifier+ | Weekly Excel |
| `/admin` | Admin | Users & stations **and** Reports & SITREP tab |
| `/settings` | All | Country code display (alpha-2 vs alpha-3) |

---

## 4. Land vs air reporting

| | **Land** (`reportingProfile: land`) | **Air** (`reportingProfile: air`, e.g. Entebbe `ENT`) |
|---|-------------------------------------|-----------------------------------------------------|
| UI | `DayRecordWorkspace` | `EntebbeDayWorkspace` |
| Movements | Arrival/departure by **nationality** + M/F | **Flights**: number, route, passengers, shift B/D |
| Other | Asylum seekers, refugees | Deportees, returned, offloaded, denied |
| Day fields | Medical screening, staff on duty | Inadmissible count, staff on leave |
| Incidents | Optional | **Occurrences** tab (shift narratives) |
| Weekly cells | Sum `arrival` / `departure` | Sum `flight_arrival` / `flight_departure` passengers |

**Entry types:**  
Land: `arrival`, `departure`, `asylum_seeker`, `refugee`  
Air: `flight_arrival`, `flight_departure`, `deportee`, `returned_person`, `offloaded`, `denied_entry`

**Country codes:** stored in DB as **ISO alpha-2** always (`UG`, `KE`, `SS`). User **Settings** only change display (alpha-2 vs alpha-3). Consolidated HQ text may use legacy labels (`SSD`, `USA`). List from REST Countries API (cached).

---

## 5. Station daily entry

**Navigation:** Today (current date) or Previous days (year/month list). Drawer lists all days for the station.

**Land tabs:** New entry · Entry log · Day totals · Submit day / Modify day  
**Air tabs:** New record (modules) · Activity log · Occurrences · Day totals · Submit day / Modify day

### What you can do by status

| Status | Add new rows | Edit/delete existing |
|--------|--------------|------------------------|
| `draft` / `rejected` | Yes | Immediate |
| Submitted+ (inputter) | No | **Amendment** (reason → HQ queue) |
| Submitted+ (`ADMIN`) | Direct add/edit/delete | Direct |

- **Submit day** only in `draft` or **`rejected`** (after HQ return). After first submit, tab becomes **Modify day** (remarks only; no second submit until rejected).  
- **Rejected days:** red banner with HQ reason; alert list at top of station app; fix data → **Submit day** to resubmit (`rejected` → `submitted`).

---

## 6. Report lifecycle and HQ review

```
draft ──submit──► submitted ──review──► reviewed ──verify──► verified ──approve──► approved
                         │                    │                  │
                         └──────── reject (reason required) ─────┘
                                         ▼
                                    rejected ──submit──► submitted (clears rejection)
```

| Step | API | Who |
|------|-----|-----|
| Submit | `POST /api/reports/[id]/submit` | Station |
| Review | `POST /api/reports/[id]/review` | Reviewer |
| Verify | `POST /api/reports/[id]/verify` | Verifier |
| Approve | `POST /api/reports/[id]/approve` | Authoriser |
| Reject | `POST /api/reports/[id]/reject` + **comment** | HQ at submitted/reviewed/verified |

**HQ inbox (`/hq/inbox` and Admin → Reports & SITREP → Review):**

- **Preview** full day (`GET /api/reports/[id]`) — summary, entries, occurrences, remarks — **before** Review / Verify / Approve / Reject.  
- **Reject report:** mandatory reason; stored on report; station sees notification.  
- **Pending corrections:** inputter edits on locked days → approve/reject amendment (**reject requires reason**).

Only **`approved`** reports feed **consolidated SITREP** and **weekly export**.

---

## 7. Amendments (locked days)

Locked when status is `submitted`, `reviewed`, `verified`, or `approved`.

1. Inputter edits/deletes with **correction reason**.  
2. `day_amendment` created (`pending`).  
3. HQ approves (applies to `daily_entries`) or rejects with reason.  
4. Station notified via amendment status on the day record.

Actions: `add_entry`, `update_entry`, `delete_entry` — logic in `lib/reports/amendments.ts`.

---

## 8. HQ outputs

### Consolidated daily SITREP

- **Where:** `/hq/consolidated` or Admin → Reports & SITREP  
- **Input:** calendar date  
- **Data:** all **approved** reports that day  
- **Output example:**

```
235 ARRIVALS: 01 BI, 17 ER (01 FE), 70 KE (04 FE), ...
223 DEPARTURES: 04 BI, 09 ER (01 FE), ...
55 ASYLUM SEEKERS
```

API: `POST /api/reports/generate/consolidated?date=YYYY-MM-DD`  
Test: `pnpm test:formatter` · demo date **2026-05-22**

### Weekly statistics Excel

- **Where:** `/weekly` or Admin tab  
- **Layout:** matches `WEEKLY STATISTICS 02.08 MAY 2026.xlsx` — S/N, station, per-day Arr/Dep, weekly totals, **GRAND TOTAL** formulas  
- **Rules:** all active stations (zero if missing); **approved** only; max **31 days**  
- API: `GET /api/exports/weekly?from=&to=`  
- Demo week: **2026-05-17 – 2026-05-23** (seeded approved)

---

## 9. Admin console

**Path:** `/admin` · Role: `ADMIN`

| Tab | Functions |
|-----|-----------|
| **Users & stations** | Create/edit users (roles, station, password); create/edit stations (code, name, cluster, `reportingProfile`, active) |
| **Reports & SITREP** | HQ review inbox (preview + reject with reason), consolidated generator, weekly export |

APIs: `/api/admin/users`, `/api/admin/stations`, `/api/admin/meta`

---

## 10. Database (essentials)

| Table | Role |
|-------|------|
| `border_stations` | Posts; `reportingProfile` land/air |
| `users` | Login; `station_id`; `country_code_format` |
| `roles` / `user_roles` | RBAC |
| `station_daily_reports` | One per station+date; status; remarks; **rejection_reason**, **rejected_by**, **rejected_at** |
| `daily_entries` | Batches; nationality, M/F, flight fields, person fields |
| `day_incidents` | Occurrences (especially air) |
| `day_amendments` | Correction queue |
| `audit_logs` | Who changed what |

Statuses: `draft` · `submitted` · `reviewed` · `verified` · `approved` · `rejected`

---

## 11. API quick reference

All require login (except auth routes). JSON unless file download.

| Area | Key endpoints |
|------|----------------|
| Auth | `/api/auth/[...nextauth]` |
| Settings | `GET/PATCH /api/settings` |
| Countries | `GET /api/countries` |
| Day record | `GET /api/reports/daily?date=` · `GET /api/reports/daily/list` · `?meta=1` → `today`, `years`, **`rejected[]`** |
| Entries | `POST /api/reports/daily/entries` · `PATCH/DELETE .../entries/[id]` |
| Incidents | `POST /api/reports/daily/incidents` · `PATCH/DELETE .../incidents/[id]` |
| Report detail | `GET /api/reports/[id]` (preview; HQ or owning station) |
| Workflow | `POST /api/reports/[id]/submit|review|verify|approve|reject` |
| Pending | `GET /api/reports/pending` |
| Amendments | `GET /api/reports/amendments/pending` · `POST .../approve|reject` |
| Consolidated | `POST /api/reports/generate/consolidated?date=` |
| Weekly | `GET /api/exports/weekly?from=&to=` |
| Admin | `/api/admin/users`, `/api/admin/stations`, `/api/admin/meta` |

---

## 12. Demo accounts and test paths

**Password (all users):** `Demo@2026`

| Username | Use |
|----------|-----|
| `<station>.inputter` | That station’s daily entry (e.g. `elegu.inputter`, `entebbe.inputter`) |
| `reviewer` | Inbox → Review |
| `verifier` | Verify, consolidated, weekly |
| `authoriser` | Approve |
| `admin` | Everything + admin console |

**Seed highlights:** **56 stations** (from weekly XLSX S/N order) · demo week **17–23 May 2026** · Elegu **2026-05-08** (approved, formatter reference) · Entebbe **2026-05-08** (air sample)

**Suggested tests**

1. Land: submit → review → verify → approve  
2. Reject with reason → station banner → fix → resubmit  
3. Locked edit → amendment → HQ approve/reject  
4. Consolidated **2026-05-22**  
5. Weekly export demo week  
6. Entebbe: flights + deportee + occurrence → submit  

---

## 13. Security, operations, limits

| Control | How |
|---------|-----|
| Login | Credentials + bcrypt |
| Authorization | Permission on every API |
| Station isolation | Inputters tied to `stationId` |
| Post-submit changes | Amendments + audit |
| Secrets | `.env` not in git |

**Production:** strong `AUTH_SECRET`, HTTPS `NEXTAUTH_URL`, `pnpm build && pnpm start`, schema migrate, **no demo seed**, backup PostgreSQL.

**MVP limits:** no offline/PWA; no SSO; station PDF not full government template; cluster supervisor UI limited; weekly uses approved only.

**Phase 2 (planned):** offline PWA, Keycloak, official PDF templates, K8s, analytics dashboards.

---

## 14. Glossary & one-line cheat sheet

| Term | Meaning |
|------|---------|
| SITREP | Situation report |
| Day report | One station, one calendar date |
| Entry / batch | One logged row in `daily_entries` |
| Consolidated SITREP | HQ national summary (compressed codes) |
| Amendment | Proposed fix on a locked day |
| Shift B / D | Entebbe night / day |

**Status:** `draft` → `submitted` → `reviewed` → `verified` → `approved` (or `rejected` with reason → resubmit)

**Code map:** `lib/reports/daily-day.ts` · `workflow.ts` · `amendments.ts` · `consolidated-formatter.ts` · `lib/exports/weekly-matrix.ts` · `lib/rbac.ts` · `prisma/schema.prisma`

**Support:** requirements in `instructions/` · full A–Z doc: `docs/SYSTEM_DOCUMENTATION.md`

---

*End of 5-page guide — print-friendly; expand any topic in SYSTEM_DOCUMENTATION.md.*
