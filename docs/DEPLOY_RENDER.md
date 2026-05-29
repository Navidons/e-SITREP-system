# Deploying e-SITREP on Render

PostgreSQL is hosted on Render. **No VPS or Docker** required for the database.

## Connection details

| Field | Value |
|-------|--------|
| Hostname | `dpg-d8cpfla8qa3s73bng75g-a` |
| Port | `5432` |
| Database | `e_strep_db` |
| Username | `ugprohub` |
| Password | `sHx2R1T8SMrMULib4pYL8rzkc7RNHe7H` |

### External Database URL (local dev, CI, your PC)

```
postgresql://ugprohub:sHx2R1T8SMrMULib4pYL8rzkc7RNHe7H@dpg-d8cpfla8qa3s73bng75g-a.oregon-postgres.render.com/e_strep_db
```

Set in `.env`:

```env
DATABASE_URL="postgresql://ugprohub:sHx2R1T8SMrMULib4pYL8rzkc7RNHe7H@dpg-d8cpfla8qa3s73bng75g-a.oregon-postgres.render.com/e_strep_db"
```

### Internal Database URL (Render Web Service only)

```
postgresql://ugprohub:sHx2R1T8SMrMULib4pYL8rzkc7RNHe7H@dpg-d8cpfla8qa3s73bng75g-a/e_strep_db
```

Use this as `DATABASE_URL` on your **Render web service** environment.

## psql

```bash
PGPASSWORD=sHx2R1T8SMrMULib4pYL8rzkc7RNHe7H psql -h dpg-d8cpfla8qa3s73bng75g-a.oregon-postgres.render.com -U ugprohub e_strep_db
```

Or with Render CLI:

```bash
render psql dpg-d8cpfla8qa3s73bng75g-a
```

## Local setup

```bash
cp .env.example .env
pnpm install
pnpm db:push
pnpm db:seed
pnpm dev
```

## Render Web Service (app)

1. Create a **Web Service** from this repo.
2. Environment variables:
   - `DATABASE_URL` — **Internal Database URL** (above)
   - `AUTH_SECRET` — `openssl rand -base64 32`
   - `AUTH_TRUST_HOST` — `true`
   - `NEXTAUTH_URL` — `https://<your-service>.onrender.com`
3. Build: `pnpm install && pnpm exec prisma db push && pnpm build`
4. Start: `pnpm start`
5. Run `pnpm db:seed` **once** (Render shell or locally via external URL).
