# Unified Content Studio — Go-live deployment plan (Z.ai)

**Purpose:** End-to-end checklist to review, harden, and deploy.  
**Companions:** [`ZAI-GO-LIVE-HANDOFF.md`](./ZAI-GO-LIVE-HANDOFF.md) (inventory + objectives), [`REVIEW-HANDOFF.md`](./REVIEW-HANDOFF.md) (API/schema accuracy).

---

## Repo-accurate corrections (read first)

| Topic | Use this (repo) | Not this (common mistakes) |
|--------|------------------|----------------------------|
| Auth secret | **`NEXTAUTH_SECRET`** (see `.env.local.example`) | `AUTH_SECRET` unless you configure otherwise |
| Progress API | **`GET/POST /api/unified/user/progress`** | `/api/unified/progress` |
| Stripe webhook events (handled in code) | `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, **`invoice.paid`**, `invoice.payment_failed` | `invoice.payment_succeeded` (different name in Stripe API) — subscribe to what **`webhook/route.ts`** handles |
| Rate limiting | **`checkUsageLimits`** in `unified-limits.ts` on generate/chat | A separate `rateLimit()` helper is **not** present unless you add it |
| UI tabs | **Home, Create, Drafts, Publish, Stats** — preferences live under **Create**, not a separate Settings tab | “Settings tab” as its own top-level tab |
| Health endpoint | **`GET /api/health/live`** (Railway) / **`GET /api/health`** (DB ping) | Liveness vs readiness |
| Windows | Use `Remove-Item -Recurse` / `;` instead of `&&` if needed | Bash-only one-liners may fail in PowerShell |

---

## Part 1 — Current status summary

### Built (production-oriented)

| Component | Location | Notes |
|-----------|----------|--------|
| Main UI | `src/app/unified/unified-studio-client.tsx` | Generate + chat, drafts, stats, prefs, `UNIFIED_API`, offline pill |
| Page + boundary | `src/app/unified/page.tsx` | Wraps client in **`StudioErrorBoundary`** |
| Styles | `src/app/unified/unified-globals.css` | Scoped `.ucs-*` |
| Error boundary | `src/components/unified/studio-error-boundary.tsx` | Class component |
| Upgrade UI | `src/components/unified/UpgradePrompt.tsx` | 402 / limits |
| Pricing | `src/app/unified/pricing/page.tsx`, `PricingCards.tsx` | Stripe checkout from modal |

### API surface (`/api/unified/`)

| Route | Methods | Notes |
|-------|---------|--------|
| `chat` | POST | 402 + `LIMIT_REACHED` / credits |
| `generate` | POST | Same limits |
| `credits` | GET, POST | Balance + missions in GET response |
| `settings` | GET, POST | Body / response use **`{ settings }`** for GET merge |
| `analytics` | GET | Real aggregates |
| `drafts` | GET, POST | `drafts/[id]` PUT, DELETE |
| `upload` | POST | Assets |
| **`user/progress`** | GET, POST | XP, missions, streak — **not** `/progress` |
| `referrals` | GET, POST | |
| `publish` | POST | Stub / phase |
| `checkout` | POST | Stripe session |

Other: **`POST /api/stripe/webhook`**, **`GET /api/admin/revenue`** (secret).

### Database & logic

- **ORM:** Prisma, **PostgreSQL** (`DATABASE_URL` in `schema.prisma`).
- **Limits:** `src/lib/unified-limits.ts`.
- **Profile:** `src/lib/unified-profile.ts`.
- **Errors:** `src/lib/unified-api-error.ts`.

---

## Part 2 — Pre-deployment gaps

### Critical

1. **Environment** — Copy **`.env.local.example`** → production host env. Minimum: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `ANTHROPIC_API_KEY`, Stripe keys + price IDs + `STRIPE_WEBHOOK_SECRET`, `ADMIN_REVENUE_SECRET`.
2. **Migrations** — `npx prisma generate` then **`npx prisma migrate deploy`** against production (avoid `db push` on real prod unless you know the tradeoff).
3. **Stripe** — Webhook URL `https://<domain>/api/stripe/webhook`; signing secret = `STRIPE_WEBHOOK_SECRET`. **Subscribe to events actually handled** (see table above). Verify **signature** + consider **idempotency** for retries.

### Important (should verify)

4. **Security** — Auth on all unified routes; no secrets in client; sanitize user-facing errors in production; admin route checks secret.
5. **Monitoring** — Optional Sentry; at minimum server logs and Stripe dashboard webhook delivery.

### Nice to have

6. Product analytics, feature flags, backups policy, uptime pings.

---

## Part 3 — Z.ai execution order

### Phase 1 — Review (≈30 min)

1. Read **`docs/REVIEW-HANDOFF.md`** and **`docs/ZAI-GO-LIVE-HANDOFF.md`**.
2. Grep for `TODO`/`FIXME` in `src/app/api/unified` and `stripe/webhook`.
3. **`npx tsc --noEmit`** — must exit 0.

### Phase 2 — Build local (≈20 min)

```bash
npm install
npx prisma generate
npx tsc --noEmit
npm run build
npm start
# Smoke: http://localhost:3000/unified (authenticated)
```

(Fresh install: only remove `node_modules` if you have a good reason; `rm -rf` is Unix — on Windows use Explorer or `Remove-Item -Recurse -Force node_modules`.)

### Phase 3 — Deploy prep

1. Set production env on host (Vercel/Railway/etc.).
2. `DATABASE_URL` → production Postgres → **`npx prisma migrate deploy`**.
3. Stripe live (or test) products/prices match **`STRIPE_PRICE_*`** env vars.

### Phase 4 — Deploy

- Vercel: `vercel --prod` or Git integration; confirm build logs.
- Docker/self-host: Node 20+, port 3000, same env + migrate step.

### Phase 5 — Post-deploy checks

- Load `/unified` signed in.
- Generate, chat, drafts, stats, pricing → checkout (test mode first).
- Webhook: Stripe dashboard shows 2xx; DB subscription row updates as expected.

---

## Part 4 — Smoke tests (aligned with actual UI)

1. **`/unified`** loads; header shows credits / streak / online status.
2. **Create** — One-shot generate; conversational chat; save reply as draft; preferences + **Save preferences**.
3. **Drafts** — Cloud list; remove cloud vs local; sync message when loading.
4. **Stats** — Analytics cards and charts (from API).
5. **Publish** — Still largely simulated — expect copy, not full Meta publish.
6. **Upgrade** — Trigger 402 or open pricing; Stripe redirect when configured.

---

## Part 5 — Rollback

- **Vercel:** Promote previous deployment or rollback in dashboard.
- **Feature flag:** Env-driven maintenance page (add only if needed).
- **Stripe:** Pause webhooks or use test mode while fixing.

---

## Part 6 — Success criteria

- `/unified` works over **HTTPS** with auth.
- AI generate + chat succeed when keys and credits allow.
- Drafts and settings persist.
- Checkout + webhooks update subscription state (verify in DB).
- No unhandled white-screen: **StudioErrorBoundary** + sensible toasts for API/network errors.

---

## Copy-paste command block (bash / Git Bash)

```bash
cd /path/to/postforge

# Docs
cat docs/ZAI-GO-LIVE-HANDOFF.md
cat docs/REVIEW-HANDOFF.md
cat docs/GO-LIVE-DEPLOYMENT-PLAN.md

# Quality gates
npx tsc --noEmit
npm run build

# Production DB (set DATABASE_URL first)
npx prisma migrate deploy
```

---

**Latest local verification log:** [`DEPLOY-VERIFICATION-RUN.md`](./DEPLOY-VERIFICATION-RUN.md)  
**Railway + GoDaddy + env reference:** [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md)

---

*This file subsumes the long “UNIFIED CONTENT STUDIO - GO-LIVE DEPLOYMENT PLAN” checklist with corrections for this repository. Update it when behavior or routes change.*
