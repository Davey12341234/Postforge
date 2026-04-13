# PostForge — Unified Content Studio: Review & Go-Live Handoff

**Version:** 1.1 (schema/API verified against repo)  
**Date:** April 2026  
**Purpose:** Single source of truth for code review and deployment. **Read route files** under `src/app/api/unified/**` for exact request/response shapes; this doc corrects common template mistakes.

**Full narrative + deploy checklist for handoff:** [`ZAI-GO-LIVE-HANDOFF.md`](./ZAI-GO-LIVE-HANDOFF.md) · **Step-by-step go-live plan (corrected for this repo):** [`GO-LIVE-DEPLOYMENT-PLAN.md`](./GO-LIVE-DEPLOYMENT-PLAN.md)

---

## 1. Executive summary

PostForge exposes a **Unified Content Studio** at **`/unified`**: AI-assisted content creation, drafts, chat, missions, referrals, credits, and **Stripe-backed subscriptions** (Pro / Business / Enterprise). The implementation uses **separate Prisma models** (`Unified*`), dedicated API routes, and a large client shell (`unified-studio-client.tsx`).

**Monetization:** `UnifiedSubscription`, `UnifiedInvoice`, extended `UnifiedPayment`; webhook at **`POST /api/stripe/webhook`**; checkout at **`POST /api/unified/checkout`**; usage limits in **`src/lib/unified-limits.ts`** enforced on **`/api/unified/generate`** and **`/api/unified/chat`** (402 + `LIMIT_REACHED` when applicable).

---

## 2. Architecture (verified)

| Layer | Location |
|--------|----------|
| UI | `src/app/unified/page.tsx`, **`src/app/unified/unified-studio-client.tsx`**, `PricingCards.tsx`, `UpgradePrompt.tsx`, `studio-error-boundary.tsx`, `src/app/unified/pricing/page.tsx` |
| APIs | `src/app/api/unified/**` |
| Stripe | `src/app/api/stripe/webhook/route.ts`, `src/app/api/unified/checkout/route.ts` |
| Admin revenue | `src/app/api/admin/revenue/route.ts` (header **`x-admin-secret: ADMIN_REVENUE_SECRET`**) |
| Limits | `src/lib/unified-limits.ts` (`checkUsageLimits`) |
| Profile bootstrap | `src/lib/unified-profile.ts` (`getOrCreateUnifiedProfile`) |

**Auth:** NextAuth session; unified routes expect `session.user.id`.

---

## 3. Prisma: Unified models (actual schema)

**Do not** assume example snippets from generic templates. The **authoritative** definitions are in **`prisma/schema.prisma`**.

### 3.1 `UnifiedStudioProfile`

- `unifiedCredits` (Int) — **balance field name**
- `level`, `xpTotal`, `streakCount`, `subscriptionTier`, `missions` (Json), etc.
- Relations: drafts, sessions, notifications, analytics, assets, payments, **subscription**, **invoices**, achievements, etc.

### 3.2 `UnifiedStudioDraft`

| Field | Type | Notes |
|--------|------|--------|
| `caption` | String | Primary body text |
| `platform` | String? | Optional |
| `status` | `UnifiedDraftStatus` | DRAFT, READY, SCHEDULED, PUBLISHED |

There is **no** separate `content` or `title` column. APIs accept **`content` in POST body** and map it to **`caption`**; list responses may derive a display **title** from the first line of `caption`.

### 3.3 `UnifiedAnalyticsEvent`

| Field | Type |
|--------|------|
| `profileId` | String? (optional) |
| `sessionId` | String? |
| `eventName` | String |
| `properties` | **Json** (store a JSON object; Prisma accepts plain objects) |
| `timestamp` | DateTime @default(now()) |

Prefer **`properties: { ... }`** — not `JSON.stringify(...)` unless you intentionally want a string inside Json.

### 3.4 `UnifiedPayment`

- `amountCents` — **Int** (not Float)
- `status` — **`UnifiedPaymentStatus`** enum
- Stripe: `stripePaymentIntentId`, `stripeInvoiceId`, `metadata` (Json?), etc.

### 3.5 `UnifiedSubscription` / `UnifiedInvoice`

- One subscription row per profile (`profileId` unique).
- Invoice rows: `stripeInvoiceId`, `amountPaidCents`, `amountDueCents`, `status`, `periodStart` / `periodEnd`, optional `invoicePdf`.

### 3.6 `User` model

Unified relations on `User`: `unifiedStudioProfile`, `unifiedReferralsMade`, `unifiedReferralReceived`, etc. — see schema.

---

## 4. API contracts (read the files — examples below are accurate snapshots)

### 4.1 `GET /api/unified/credits`

Returns **`balance`** (not `credits`):

```json
{
  "balance": 150,
  "level": 3,
  "xpTotal": 450,
  "streakCount": 5,
  "subscriptionTier": "PRO",
  "subscription": { "plan": "...", "status": "...", "currentPeriodEnd": "...", "stripePriceId": "..." },
  "activeMissions": []
}
```

### 4.2 `GET /api/unified/drafts`

- Query: **`status`** only (optional). Values parsed in route (e.g. `draft`, `DRAFT`, …).
- Response items include **`caption`**, derived **`title`**, **`platform`**, **`status`**, timestamps — see `drafts/route.ts` mapping.

### 4.3 `POST /api/unified/generate` & `POST /api/unified/chat`

- Enforced by **`checkUsageLimits`** before provider calls; may return **402** with code **`LIMIT_REACHED`**.
- Credits decrement **after** successful AI response (see routes).

### 4.4 Stripe

- **`POST /api/unified/checkout`** — creates Checkout Session; requires configured **`STRIPE_PRICE_*`** for tiers.
- **`POST /api/stripe/webhook`** — uses **raw body** + `stripe.webhooks.constructEvent`.

**Webhook event types handled in code** (grep `case` in `route.ts`):  
`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.

---

## 5. Settings pattern

There is **no** `metadata` / settings Json column on `UnifiedStudioProfile` for arbitrary UI settings. **Latest settings** are intended to be read from analytics: events with **`eventName === 'unified_user_settings'`** (see client `saveUnifiedSettings` / analytics usage).

---

## 6. Environment variables (deployment)

Set in production (see **`.env.local.example`** in repo):

| Variable | Role |
|----------|------|
| `DATABASE_URL` | Prisma |
| `NEXTAUTH_URL`, `NEXTAUTH_SECRET` | Auth + checkout return URLs |
| `ANTHROPIC_API_KEY` | AI |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe |
| `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ENTERPRISE` | Checkout |
| `ADMIN_REVENUE_SECRET` | `/api/admin/revenue` |

Configure Stripe Dashboard webhook URL to **`https://<your-domain>/api/stripe/webhook`** (live mode secret in prod).

---

## 7. Known operational notes

- **Windows:** `npx prisma generate` can fail with **EPERM** on `query_engine-windows.dll.node` if the file is locked — close processes using it and retry.
- After schema changes: run **`prisma migrate`** (or `db push` in dev) and **`prisma generate`** on the deployment host; then **`npm run build`**.

---

## 8. Review focus areas (for the reviewing AI)

1. **Data integrity:** Subscription and invoice rows stay consistent with Stripe webhook payloads; consider **idempotency** for duplicate `invoice.paid` if Stripe retries.
2. **Limits:** `unified-limits.ts` vs product expectations (`teamMembersLimit`, monthly generation caps, draft storage).
3. **Security:** Webhook signature verification (already present); admin route protected by secret; no leakage of secrets client-side.
4. **UX:** 402 handling in chat/generate (e.g. `UpgradePrompt`).

---

## 9. Prompt for implementation / deployment AI (copy-paste)

```
You are working in the PostForge repo. Unified Content Studio lives at /unified with Prisma models Unified*.

Authoritative schema: prisma/schema.prisma.
APIs: src/app/api/unified/** — read each route for exact Zod schemas and JSON shapes.

Corrections vs generic templates:
- UnifiedStudioDraft stores caption + optional platform; POST may send "content" mapped to caption.
- UnifiedAnalyticsEvent: eventName, properties as Json object, profileId optional.
- UnifiedPayment: amountCents Int, UnifiedPaymentStatus enum.
- GET /api/unified/credits returns "balance" not "credits".
- Settings: latest unified_user_settings from analytics events, not a profile metadata column.

Stripe: webhook POST /api/stripe/webhook (raw body); checkout POST /api/unified/checkout.
Limits: src/lib/unified-limits.ts on generate and chat.

Deploy: set env vars from .env.local.example, run migrations, configure Stripe webhook URL, verify build.
```

---

## 10. Changelog from template-only reviews

| Topic | Wrong assumption | Actual |
|--------|------------------|--------|
| Draft columns | `content` / `title` in DB | **`caption`** (+ optional `platform`); API maps content → caption |
| Credits GET | field `credits` | **`balance`** |
| Drafts list query | `limit` param | **`status`** only (in current route) |
| Analytics `properties` | Must stringify | **Json object** in Prisma |
| Payments | Float amount | **`amountCents` Int** |
| Profile credits field | various names | **`unifiedCredits`** |

---

*End of handoff — keep this file updated when schema or contracts change.*
