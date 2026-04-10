# AI handoff — Railway environment & networking (PostForge)

**Purpose:** Give another AI assistant **everything needed** to help the user configure **Railway** (variables, public URL, database wiring) without re-deriving context from chat history.

**Repo:** `postforge` — Next.js app; primary app surface includes **`/unified`**.  
**User pain point (typical):** Finding **Service → Variables**, wiring **`DATABASE_URL`**, understanding **`${{ Postgres.DATABASE_URL }}`**, setting **`NEXTAUTH_URL`** correctly, and enabling a **public URL**.

---

## 1. What the other AI should do first

1. Read this file end-to-end once.
2. Ask the user (only if missing): Railway **project name**, names of the **web** vs **Postgres** services, and whether they use **GitHub deploy** or **`railway up`**.
3. Never ask the user to paste **full** secrets in chat; **redacted** values are OK (e.g. first/last 4 chars, or “set / not set”).
4. After variables are set, have them run **`npm run verify:deploy https://<public-host>`** locally (or confirm deploy logs and **`GET /api/health/live`** returns 200).

---

## 2. Railway concepts (plain language)

| Concept | Meaning |
|--------|--------|
| **Project** | Container for one or more **services** (e.g. web app + Postgres). |
| **Web service** | The service that runs **`npm run build`** / **`npm run start`** — this is where **almost all** app env vars go. |
| **Postgres service** | The database. It has its own **`DATABASE_URL`**. The **web** service must **receive** a `DATABASE_URL` that points at this DB. |
| **Variables** | Environment variables **injected into one service**. Open **web service → Variables** (not the DB service) for app secrets. |
| **Variable reference** | Instead of pasting the DB URL, Railway can **inject** the Postgres service’s URL: **`${{ ServiceName.DATABASE_URL }}`**. **`ServiceName`** must match the **exact** Postgres service name in the canvas (e.g. `Postgres`, `PostgreSQL`, `db`). Use the UI “Reference” picker when possible to avoid typos. |
| **Networking** | **Public URL** is configured on the **web** service (**Settings → Networking** or **Domains**). Until a public hostname exists, the user may not know the final **`NEXTAUTH_URL`**. |

---

## 3. Step-by-step: Variables on the web service

1. [railway.app](https://railway.app) → open the **project**.
2. Click the **web** service (the Next.js / Node service — **not** “Postgres” unless only checking DB).
3. Open **Variables** (tab or sidebar; on some layouts it’s under **Settings**).
4. Add or verify:

### Required names (authoritative list)

Source of truth: **`scripts/required-env.production.json`**. Minimum production set:

| Variable | Notes |
|----------|--------|
| **`DATABASE_URL`** | On web service: **`${{ Postgres.DATABASE_URL }}`** only if the Postgres service is literally named `Postgres`; otherwise use UI reference or paste full `postgresql://…` from Postgres → Variables. |
| **`NEXTAUTH_URL`** | **HTTPS root only** — e.g. `https://something.up.railway.app`. **No** path: **not** `https://…/unified`, **not** trailing path segments. Must match the URL users open in the browser. |
| **`NEXTAUTH_SECRET`** | Long random string (e.g. `openssl rand -base64 32`). Not placeholder text. |
| **`ANTHROPIC_API_KEY`** | For Unified AI features. |
| **`STRIPE_SECRET_KEY`**, **`STRIPE_PUBLISHABLE_KEY`**, **`STRIPE_WEBHOOK_SECRET`** | Live or test per user plan. |
| **`STRIPE_PRICE_PRO`**, **`STRIPE_PRICE_BUSINESS`**, **`STRIPE_PRICE_ENTERPRISE`** | Stripe **Price IDs** (`price_…`), from Dashboard → Products. |
| **`ADMIN_REVENUE_SECRET`** | Protects admin revenue endpoint. |

Copy-paste template (empty values): **`.env.production.template`**.

Optional / feature flags: see same template and **`docs/PRODUCTION-DEPLOYMENT.md`**.

5. **`NODE_ENV=production`** is often set automatically on Railway; if not, set it on the web service.

### Stripe: automated provision (CLI)

If **`railway`** is logged in and linked to the **Postforge** service, and **`STRIPE_SECRET_KEY`** is already set on Railway:

```bash
npm run stripe:sync-railway
```

This runs **`scripts/stripe-sync-railway.mjs`**: ensures a **Postforge** product exists, creates or reuses **monthly** prices (Pro / Business / Enterprise in USD), recreates the **webhook** at **`https://<your-host>/api/stripe/webhook`**, and pushes **`STRIPE_PRICE_*`** and **`STRIPE_WEBHOOK_SECRET`** to Railway. Re-run after changing public URL.

---

## 4. Step-by-step: Public URL (Networking)

1. **Web service** → **Settings** → **Networking** (or **Public networking** / **Generate domain**).
2. Enable a **Railway-generated domain** or attach a **custom domain**.
3. Copy the exact **`https://…`** origin (no path).
4. Set **`NEXTAUTH_URL`** on the web service to that value → **redeploy** if the app already started with a wrong URL.

**Stripe webhooks:** Endpoint is **`POST /api/stripe/webhook`** on the **same** public origin (e.g. `https://your-host/api/stripe/webhook`). User must configure the webhook URL in Stripe Dashboard to match.

---

## 5. How deploy + health checks work in this repo

| Item | Detail |
|------|--------|
| **`railway.json`** | **`startCommand`**: `node scripts/railway-deploy-migrate.mjs && npm run start` — migrations run **before** Next.js listens. |
| **Health (Railway probe)** | **`GET /api/health/live`** — **200** without DB (liveness). |
| **Health (full)** | **`GET /api/health`** — includes DB check; may **503** if DB down. |
| **Migrations** | **`scripts/railway-deploy-migrate.mjs`** — `prisma migrate deploy`, BOM strip on SQL, recovery for certain Prisma error codes. Requires valid **`DATABASE_URL`** on the **web** service at **runtime**. |

If deploy **hangs** or healthcheck **fails**, check **deploy logs**: migration errors vs app not binding to **`0.0.0.0`** (this repo’s **`package.json`** `start` uses **`next start --hostname 0.0.0.0`**).

---

## 6. Verification commands (user’s machine, repo root)

```bash
npm run check:migrations    # migration.sql BOM check
npm run verify:deploy       # BOM + tsc; add https://URL for HTTP checks
```

With Railway vars copied locally (no secrets in git): **`deploy/secrets.preview.env`** from **`deploy/secrets.preview.env.example`** → **`npm run deploy:check`**.

---

## 7. When things go wrong (pointers only)

| Symptom | Where to read |
|--------|----------------|
| Prisma **P3009** / failed migration / BOM / “﻿” syntax error | **`docs/PRISMA-MIGRATIONS.md`**, **`scripts/railway-deploy-migrate.mjs`** |
| Env missing / wrong format | **`scripts/check-deploy-readiness.mjs`**, **`scripts/required-env.production.json`** |
| Full go-live checklist | **`docs/GO-LIVE-DEPLOYMENT-PLAN.md`**, **`docs/RAILWAY-QUICK-RUN.md`** |

**Schema half-applied:** may need DB reset or manual **`migrate resolve`** — see **PRISMA-MIGRATIONS.md**; do not guess in production without user consent.

---

## 8. One-paragraph summary for the other AI

> Help the user open the **correct Railway service** (web, not Postgres), set **`DATABASE_URL`** (reference or paste from Postgres), set **`NEXTAUTH_URL`** to the **exact public HTTPS root** after **Networking** is enabled, fill **`NEXTAUTH_SECRET`** and **Stripe/Anthropic/admin** vars per **`required-env.production.json`**, redeploy, then verify with **`npm run verify:deploy https://…`** and **`/api/health/live`**. Migrations run at **container start** via **`railway-deploy-migrate.mjs`**.

---

*Update this file if `required-env.production.json` or Railway layout instructions change.*
