# AI handoff — diagnostic snapshot (PostForge + Unified Content Studio)

**Purpose:** Give another AI or engineer a single place to understand **what works**, **what’s unverified**, and **what to fix next**.  
**Repo:** Next.js app (`postforge`), primary new surface: **`/unified`**.

**Railway variables, networking, and `NEXTAUTH_URL`:** Use the dedicated paired-AI brief — **[`AI-RAILWAY-ENV-HANDOFF.md`](./AI-RAILWAY-ENV-HANDOFF.md)** — so another assistant can walk through the dashboard without re-explaining context.

---

## 1. Verified working locally (this codebase)

| Check | Result | Notes |
|--------|--------|--------|
| **TypeScript** | `npx tsc --noEmit` → **exit 0** | Last verified in-session; re-run after large pulls. |
| **Production build** | `npm run build` → **exit 0** | Includes `prisma generate` + `next build`. |
| **Prisma client** | Generates against `prisma/schema.prisma` | Provider: **PostgreSQL** (`DATABASE_URL`). |
| **Unified API surface** | Routes compile | See §4 for paths. |
| **Stripe webhook handler** | **`invoice.paid`** present | `src/app/api/stripe/webhook/route.ts` — not `invoice.payment_succeeded`. |
| **TODO/FIXME** (spot check) | None in `src/app/api/unified/**`, `src/app/api/stripe/**` | Not a full-repo audit. |

### Build warnings (non-blocking today)

- Next.js 16: **`middleware`** convention deprecated → migrate to **`proxy`** ([docs](https://nextjs.org/docs/messages/middleware-to-proxy)).
- **`/unified`** and **`/unified/pricing`**: `themeColor` in metadata → should move to **`viewport`** export.

---

## 2. Prisma migrations (updated)

| Item | Status |
|------|--------|
| **`prisma/migrations/`** | **Present** — `20260410120000_init_unified_studio` + `migration_lock.toml` (PostgreSQL). |
| **Railway** | **`railway.json`**: **`startCommand`** runs `node scripts/railway-deploy-migrate.mjs && npm run start` (migrate + P3005 recovery). Web service needs **`DATABASE_URL`** (e.g. `${{ Postgres.DATABASE_URL }}`). |
| **Existing DB** (was created with `db push`) | Use **`prisma migrate resolve --applied 20260410120000_init_unified_studio`** once to baseline — see [`docs/PRISMA-MIGRATIONS.md`](./PRISMA-MIGRATIONS.md). |
| **Fresh production DB** | Run **`migrate deploy`** only; no baseline needed. |

---

## 3. Not verified (needs human / hosted env)

| Area | Status |
|------|--------|
| **Production deploy** (Railway / Vercel / other) | User-specific; not executed from Cursor. |
| **Live HTTPS + custom domain** | Unknown. |
| **Stripe end-to-end** (checkout → webhook → DB) | Code paths exist; **live keys + webhook URL** not validated here. |
| **E2E browser tests** | Manual smoke only; no Playwright/Cypress in repo. |
| **Load / security audit** | Not performed. |

---

## 4. Architecture summary

### Unified Content Studio (feature-complete MVP)

- **Entry:** `src/app/unified/page.tsx` — requires NextAuth session; wraps **`UnifiedStudioClient`** in **`StudioErrorBoundary`** (`src/components/unified/studio-error-boundary.tsx`).
- **Main UI:** `src/app/unified/unified-studio-client.tsx` (~1.7k lines) — tabs: **Home · Create · Drafts · Publish · Stats**.  
  - **Create** includes: one-shot generate (`/api/unified/generate`), chat (`/api/unified/chat`), preferences (`/api/unified/settings`). **No separate top-level Chat or Settings tab.**
- **Monetization:** `POST /api/unified/checkout`, `POST /api/stripe/webhook`, limits via **`checkUsageLimits`** in `src/lib/unified-limits.ts` on generate + chat (402 + **`LIMIT_REACHED`** where applicable).
- **Client helpers:** inlined **`UNIFIED_API`**; errors via **`UnifiedAPIError`** (`src/lib/unified-api-error.ts`).
- **Drafts:** cloud API + `localStorage` key **`unified-drafts`** merge for offline-only rows.

### Core Postforge

- Additional routes under `src/app/api/*` (generate, dashboard flows, onboarding, etc.) — **same app**, shared auth/DB.

---

## 5. API routes — Unified (authoritative paths)

Base: **`/api/unified/`**

| Route | Role |
|-------|------|
| `chat` | POST — Anthropic chat |
| `generate` | POST — one-shot generation |
| **`images/generate`** | **POST/GET** — **DALL·E 3** (`OPENAI_API_KEY`), see [`IMAGE-GENERATION-SPEC.md`](./IMAGE-GENERATION-SPEC.md) |
| `credits` | GET/POST |
| `settings` | GET/POST — settings via analytics events |
| `analytics` | GET |
| `drafts`, `drafts/[id]` | CRUD |
| **`user/progress`** | GET/POST — **not** `/api/unified/progress` |
| `upload`, `referrals`, `publish`, `checkout` | As named |

External: **`POST /api/stripe/webhook`**, **`GET /api/admin/revenue`** (secret: `ADMIN_REVENUE_SECRET`).

---

## 6. Environment variables (exact names)

See **`.env.local.example`**. Minimum for Unified + Stripe:

- `DATABASE_URL`, `NEXTAUTH_SECRET`, **`NEXTAUTH_URL`** (must match public origin; no trailing slash)
- `ANTHROPIC_API_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- **`STRIPE_PRICE_PRO`**, **`STRIPE_PRICE_BUSINESS`**, **`STRIPE_PRICE_ENTERPRISE`**
- `ADMIN_REVENUE_SECRET`

**Automation:** `npm run deploy:check` validates a local copy of vars (e.g. `deploy/secrets.preview.env`) against **`scripts/required-env.production.json`**.

---

## 7. Deployment automation in repo

| File | Role |
|------|------|
| **`railway.json`** | `buildCommand`: `npm run build`; **`startCommand`**: `node scripts/railway-deploy-migrate.mjs && npm run start`. |
| **`scripts/check-deploy-readiness.mjs`** | Env validation before deploy. |
| **`deploy/secrets.preview.env.example`** | Template for paste-from-Railway checks. |

**Blocked until:** §2 migrations exist.

---

## 8. Documentation map (for the next AI)

| Document | Contents |
|----------|----------|
| [`AI-CAPABILITIES-HANDOFF.md`](./AI-CAPABILITIES-HANDOFF.md) | **Anthropic vs OpenAI**, unified routes, limits/credits, rate-limit note, performance levers |
| [`IMAGE-GENERATION-SPEC.md`](./IMAGE-GENERATION-SPEC.md) | **Planned (not built):** `GeneratedImage`, `BrandKit`, provider grid, 5-step pipeline |
| [`CURSOR-IMPLEMENTATION-BRIEF.md`](./CURSOR-IMPLEMENTATION-BRIEF.md) | **Target vs reality:** Cursor backlog prompts; accuracy matrix (tenantId, LangGraph, pgvector, etc.) |
| [`AI-RAILWAY-ENV-HANDOFF.md`](./AI-RAILWAY-ENV-HANDOFF.md) | **Start here for Railway:** web vs Postgres service, Variables, `DATABASE_URL` reference, Networking, `NEXTAUTH_URL`, verification commands |
| [`REVIEW-HANDOFF.md`](./REVIEW-HANDOFF.md) | Schema/API corrections (credits `balance`, drafts `caption`, etc.) |
| [`GO-LIVE-DEPLOYMENT-PLAN.md`](./GO-LIVE-DEPLOYMENT-PLAN.md) | Repo-correct go-live checklist |
| [`ZAI-GO-LIVE-HANDOFF.md`](./ZAI-GO-LIVE-HANDOFF.md) | Objectives + inventory |
| [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md) | Railway + env + domain |
| [`RAILWAY-QUICK-RUN.md`](./RAILWAY-QUICK-RUN.md) | Step-by-step Railway + automation |
| [`DEPLOY-VERIFICATION-RUN.md`](./DEPLOY-VERIFICATION-RUN.md) | Last local build/tsc log |

---

## 9. Suggested priority order for the next AI

1. Confirm **`migrate deploy`** on a **fresh** Postgres (or baseline existing DB per [`PRISMA-MIGRATIONS.md`](./PRISMA-MIGRATIONS.md)).
2. Re-run **`npm run build`** and **`npm run deploy:check`** with production-like env. Optional: **`npm run verify:deploy https://your-url`**
3. **Deploy** (Railway/GitHub per user); fix any build/start logs.
4. Configure **Stripe webhook** on **production URL** with events matching `webhook/route.ts`.
5. **Smoke-test** `/unified`: auth, generate, chat, drafts, stats, checkout (test mode first).
6. Optional: fix **middleware → proxy**, **themeColor → viewport**, add **Sentry**, webhook **idempotency** review.

---

## 10. One-line summary

**Unified Studio builds cleanly; initial Prisma migration is committed; Railway uses **`GET /api/health/live`**; **`GET /api/health`** checks the database. Production deploy, DNS, and Stripe live flows remain unverified per environment.**

---

*Update this file when migrations land and when production is first successfully deployed.*
