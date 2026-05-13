# BabyGPT — handoff for the next AI (2026)

This file is the **single onboarding doc** after billing automation and verification were added in-repo. Read this before changing Plans, Stripe, or deploy.

---

## How to finish billing setup (start here)

1. Fill **`.env.local`** or **`.env`** at the repo root (see `.env.local.example`).  
2. Run **`npm run finish:billing`** — exits **0** when all required keys are present; otherwise prints numbered steps.  
3. When `finish:billing` passes: **`npm run vercel:env:prod`** (Windows PowerShell) → **`npx vercel deploy --prod --yes`**.  
4. On macOS/Linux, `vercel:env:prod` is not available; copy the same keys into Vercel **Settings → Environment Variables** (Production), then deploy.

Supporting commands:

| Command | Purpose |
|---------|---------|
| **`npm run verify:billing`** | ✅/❌ for each key — reads **`.env` + `.env.local`** then `process.env` (no values printed). |
| **`npm run finish:billing`** | Status + what’s missing + exact finish commands when ready. |
| **`npm run vercel:env:prod`** | Push env file to Vercel Production (uses `.env.local` if present, else `.env`). |

---

## What the last session completed (repo)

| Item | Status |
|------|--------|
| **`billing-env-keys.cjs`**, **`load-env-files.cjs`** | Shared key list + merge `.env` / `.env.local`. |
| **`npm run verify:billing`** | Uses merged env files + process env. |
| **`npm run finish:billing`** | Exit code 1 until required keys exist; then prints deploy steps. |
| **`set-babygpt-vercel-prod-env.ps1`** | Reads **`.env.local` preferred**, else `.env`; optional `-EnvFile`. |
| **`vercel-env-add-one.ps1`** | Helper for sequential `vercel env add` on Windows. |

**Not automatic (needs your secrets + Stripe Dashboard):** webhook URL, first deploy, Vercel login.

---

## Operator runbook — enable Pay + pricing on Vercel

### 1) Stripe Dashboard

1. Create **Products** with **recurring monthly Prices** for Starter / Pro / Team.
2. Copy each **Price ID** (`price_...`) for env: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`.
3. **Developers → Webhooks → Add endpoint**  
   - URL: `https://<your-production-host>/api/stripe/webhook`  
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`  
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
5. Copy **Secret key** (`sk_live_...` or `sk_test_...`) → `STRIPE_SECRET_KEY`.

### 2) Local `.env.local` or `.env` at repo root (do not commit)

Copy from `.env.local.example` and fill at least:

- **Gate:** `BABYGPT_APP_PASSWORD`, `BABYGPT_SESSION_SECRET`
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`
- **Redirects:** `NEXT_PUBLIC_APP_URL=https://your-domain.example` (no trailing slash)
- **List prices (Plans modal):** `NEXT_PUBLIC_PLAN_PRICE_STARTER_USD`, `NEXT_PUBLIC_PLAN_PRICE_PRO_USD`, `NEXT_PUBLIC_PLAN_PRICE_TEAM_USD` (optional but recommended)

Add LLM keys (`Z_AI_API_KEY` / `OPENAI_API_KEY`) in Vercel separately if not in this script.

### 3) Push env to Vercel Production

```bash
npm run vercel:env:prod
```

Equivalent: `powershell -File scripts/set-babygpt-vercel-prod-env.ps1` (uses `.env.local` if present). Requires `npx vercel link` (`.vercel/project.json`) and `npx vercel login`. For REST/API issues, see workspace rule: `projectId` / `orgId` in `.vercel/project.json`, `VERCEL_TOKEN` if using REST.

### 4) Redeploy

```bash
npx vercel deploy --prod --yes
```

### 5) Verify

1. After login, open DevTools → **Network** → `GET /api/credits` → body should include `"stripe":{"configured":true,...}` when `STRIPE_SECRET_KEY` is set on the server.
2. **Plans** modal: paid tiers show **Subscribe with Stripe** (not only “Use this plan”).
3. `npm run verify:billing` — reads `.env` / `.env.local` from repo root (CI without files shows ❌ unless env is injected).

---

## Architecture (short)

- **Next.js 16** App Router, **React 19**, **Tailwind 4**
- **AI:** `z-ai-web-dev-sdk` in Route Handlers only
- **Chats:** `localStorage` (`babygpt_*`)
- **Community:** in-memory server (resets on restart)
- **Legacy:** `_archive/` must not be imported (`AGENTS.md`)

## Routes

| Route | Role |
|-------|------|
| `GET /` | `BabyGPTClient` shell |
| `POST /api/chat` | SSE chat |
| `POST /api/chat/schrodinger` | Dual-model stream |
| `POST /api/chat/agent` | Agent stream |
| `GET/POST /api/community` | Community |
| `POST /api/community/debate` | Debate |
| `GET/POST /api/credits` | Credits / plan |
| `POST /api/auth/login` | Gate cookie |
| `POST /api/stripe/checkout` | Checkout session |
| `POST /api/stripe/portal` | Billing portal |
| `POST /api/stripe/webhook` | Subscription sync |
| `POST /api/stripe/finalize` | Post-checkout sync |

## Plans UI logic (`SubscriptionModal.tsx`)

- **`stripeMode` = `serverCredits && stripeBilling?.configured`**
- **`configured`** ⇔ **`STRIPE_SECRET_KEY`** present (`src/lib/stripe-config.ts`)
- Without `STRIPE_SECRET_KEY`, gated deploys still show **Use this plan**; amber callout explains missing Stripe.
- List prices: `NEXT_PUBLIC_PLAN_PRICE_*_USD` → `src/lib/plan-pricing-display.ts`

## Recent chat UX (reference)

Abort/regenerate/stop, credits after successful stream, `fetch-chat` signal, MessageBubble copy + generating placeholder, login trim — see `BabyGPTClient.tsx`, `fetch-chat.ts`, `MessageBubble.tsx`, `api/auth/login`.

## Commands

```bash
npm run dev
npm run lint
npm run test
npm run build
npm run verify:billing
npm run finish:billing
npm run vercel:env:prod   # Windows: push env to Vercel Production
```

---

## Files for billing bugs

- `src/components/SubscriptionModal.tsx`
- `src/components/BabyGPTClient.tsx` — `openStripeCheckout`, `stripeBilling`
- `src/app/api/stripe/checkout/route.ts`
- `src/lib/stripe-config.ts`
- `src/middleware.ts`

## Follow-ups for the next AI

- [ ] Confirm **Preview** vs **Production** env on Vercel if Checkout works in one and not the other.
- [ ] Optional: E2E against Stripe test mode (`sk_test_...`).
- [ ] Migrate `middleware` → `proxy` when adopting Next’s new convention (build warns).

---

*Update this file when shipping billing or auth changes.*
