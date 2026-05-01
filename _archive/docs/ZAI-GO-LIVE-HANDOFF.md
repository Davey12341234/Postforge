# PostForge — Full handoff for Z.ai (finish, review, deploy)

**Last updated:** April 2026  
**Audience:** Another AI or engineer taking this repo to production.  
**Companion docs:** [`REVIEW-HANDOFF.md`](./REVIEW-HANDOFF.md) (API/schema errata), [`GO-LIVE-DEPLOYMENT-PLAN.md`](./GO-LIVE-DEPLOYMENT-PLAN.md) (full Z.ai checklist + repo-accurate corrections), [`AI-HANDOFF-DIAGNOSTIC.md`](./AI-HANDOFF-DIAGNOSTIC.md) (what works vs gaps — **read this first**).

---

## 1. Product objectives (what we were building)

| Objective | Status |
|-----------|--------|
| **Unified Content Studio** — single `/unified` experience for AI-assisted social content | **Shipped** (feature-complete for MVP) |
| **Auth** — same session as main Postforge (NextAuth v5) | **Shipped** |
| **AI** — Anthropic for chat + one-shot generate | **Shipped** (`/api/unified/chat`, `/api/unified/generate`) |
| **Gamification** — XP, levels, missions, streaks | **Shipped** (`/api/unified/user/progress`) |
| **Drafts** — cloud persistence + local fallback | **Shipped** (`/api/unified/drafts`, client merge with `localStorage`) |
| **Analytics** — real stats tab | **Shipped** (`GET /api/unified/analytics`) |
| **Settings** — cross-device via analytics events | **Shipped** (`/api/unified/settings`, `unified_user_settings`) |
| **Monetization** — Stripe subscriptions, usage limits, upgrade UX | **Shipped** (needs **live env + webhook** to validate end-to-end) |
| **Resilience** — error boundary, structured API errors, offline indicator | **Shipped** |
| **Publish to Meta** | **Stub / Phase 3** (UI copy still references simulation in places) |

**Your job (Z.ai):** code review for security and correctness, run **`npm run build`** on the target host, configure **production env**, **Stripe live webhook**, smoke-test **`/unified`**, then deploy.

---

## 2. What exists in the repo (inventory)

### 2.1 App & UI

| Item | Path / notes |
|------|----------------|
| Unified page (server) | `src/app/unified/page.tsx` — auth gate; wraps client in **`StudioErrorBoundary`** |
| Main client (~1.7k lines) | **`src/app/unified/unified-studio-client.tsx`** — tabs Home / Create / Drafts / Publish / Stats |
| Scoped CSS | `src/app/unified/unified-globals.css` (`.ucs-root` / `ucs-*`) |
| Pricing page | `src/app/unified/pricing/page.tsx` + `src/components/unified/PricingCards.tsx` |
| Upgrade modal | `src/components/unified/UpgradePrompt.tsx` — `type` + `onDismiss` |
| Error boundary | `src/components/unified/studio-error-boundary.tsx` — catches render errors in Unified tree |

**Client capabilities (high level):**

- **`UNIFIED_API`** object: analytics, credits, settings, checkout, drafts CRUD, `generateContent`.
- **Create tab:** one-shot **`/api/unified/generate`** + conversational **`/api/unified/chat`**; preferences (tone, max length, language, auto-save) loaded/saved via settings API; **`UnifiedAPIError`** + network handling.
- **Drafts:** list from API; merge with `localStorage` key **`unified-drafts`** for offline-only rows; delete calls API for cloud ids.
- **Stats:** **`GET /api/unified/analytics`** (no mocks).
- **Header:** credits/streak from progress; **online/offline** pill.
- **Pricing modal:** Pro / Enterprise → **`POST /api/unified/checkout`** → Stripe redirect.

### 2.2 API routes (Unified + Stripe + admin)

Under `src/app/api/unified/`:

- `chat`, `generate`, `credits`, `checkout`, `settings`, `analytics`, `drafts`, `drafts/[id]`, `upload`, `user/progress`, `referrals`, `publish`

Also:

- `src/app/api/stripe/webhook/route.ts` — raw body, signature verification
- `src/app/api/admin/revenue/route.ts` — protected by **`ADMIN_REVENUE_SECRET`**

**Other Postforge APIs** (non-Unified) exist under `src/app/api/` — see glob if you touch core product.

### 2.3 Libraries (business logic)

| File | Role |
|------|------|
| `src/lib/unified-limits.ts` | `checkUsageLimits` — enforced on generate + chat |
| `src/lib/unified-profile.ts` | `getOrCreateUnifiedProfile` |
| `src/lib/unified-revenue.ts` | Costs / tiers helpers |
| `src/lib/unified-gamification.ts` | Levels / XP display |
| `src/lib/unified-api-error.ts` | `UnifiedAPIError`, network helpers |

### 2.4 Database (Prisma)

- **Source of truth:** `prisma/schema.prisma` — **PostgreSQL** (`DATABASE_URL`).
- **Unified models:** `UnifiedStudioProfile`, `UnifiedStudioDraft`, `UnifiedAnalyticsEvent`, `UnifiedSubscription`, `UnifiedInvoice`, `UnifiedPayment`, conversations, missions, referrals, etc.
- **Important field names:** credits = **`unifiedCredits`**; drafts store **`caption`** (API may accept **`content`** and map to caption). See **`REVIEW-HANDOFF.md`** §3.

### 2.5 Environment

- Template: **`.env.local.example`** — copy to **`.env.local`** locally; use host-specific secrets in production.
- **Required for Unified AI:** `ANTHROPIC_API_KEY`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- **Required for Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ENTERPRISE`
- **Admin:** `ADMIN_REVENUE_SECRET` for revenue endpoint

---

## 3. Objectives for the finishing pass (Z.ai checklist)

### 3.1 Review (security & quality)

- [ ] **Webhook:** idempotency for repeated `invoice.paid` / `checkout.session.completed` if Stripe retries (verify `src/app/api/stripe/webhook/route.ts`).
- [ ] **Secrets:** no keys in client bundles; admin route only with secret.
- [ ] **Limits:** `unified-limits.ts` matches product (credits vs generation caps, `teamMembersLimit` if used).
- [ ] **CORS / auth:** unified routes use `auth()` consistently.

### 3.2 Edit if needed

- [ ] Replace any remaining “simulated” / Phase 3 copy if you ship publish, or leave clearly labeled.
- [ ] Align **README** with production URL and env list (optional polish).
- [ ] **Windows:** if `npx prisma generate` hits **EPERM** on `query_engine-windows.dll.node`, close locking processes and retry.

### 3.3 Bring online

1. [ ] Provision **PostgreSQL** and set **`DATABASE_URL`**.
2. [ ] Run **`npx prisma migrate deploy`** (or `migrate dev` in dev), then **`npx prisma generate`**.
3. [ ] Set all env vars on the host (see `.env.local.example`).
4. [ ] **`NEXTAUTH_URL`** = public site URL (needed for Stripe return URLs in checkout).
5. [ ] Stripe Dashboard: webhook URL **`https://<domain>/api/stripe/webhook`**, events aligned with handlers in `webhook/route.ts`.
6. [ ] **`npm run build`** then **`npm run start`** (or platform equivalent).
7. [ ] Smoke test: sign-in → `/unified` → generate → chat → drafts → stats → pricing → test checkout (test mode first).

---

## 4. Quick verification commands

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # production DB
npm run build
npm run start
# local dev:
npm run dev
```

Local app: **http://localhost:3000/unified** (requires authenticated session).

---

## 5. Known gaps / nice-to-haves (not blockers)

- Publish tab / Meta integration still largely **stub**.
- **Language** preference in UI prefixes one-shot prompts (API has no dedicated `language` field yet).
- **Sentry** (or similar) mentioned in generic “production” templates — not wired unless you add it.
- **Idempotent Stripe processing** — verify before high-traffic launch.

---

## 6. File map (Unified focus)

```
src/app/unified/
  page.tsx
  unified-studio-client.tsx    ← main UI
  unified-globals.css
  pricing/page.tsx

src/components/unified/
  UpgradePrompt.tsx
  PricingCards.tsx
  studio-error-boundary.tsx

src/app/api/unified/**          ← REST surface
src/app/api/stripe/webhook/route.ts
src/lib/unified-*.ts
prisma/schema.prisma

docs/
  REVIEW-HANDOFF.md             ← API/schema accuracy
  ZAI-GO-LIVE-HANDOFF.md        ← this file
```

---

## 7. One-paragraph summary for Z.ai

PostForge’s **Unified Content Studio** at **`/unified`** is a Next.js App Router feature with a large client component, Prisma **`Unified*`** models, Anthropic-backed **`/api/unified/chat`** and **`/api/unified/generate`**, cloud drafts and analytics, settings stored via analytics events, Stripe checkout and webhooks, usage limits returning **402** with **`LIMIT_REACHED`**, plus an error boundary and structured **`UnifiedAPIError`** handling. Finish by reviewing webhook idempotency and auth, run Prisma migrations against production Postgres, configure env + Stripe webhook URL, **`npm run build`**, and smoke-test the full flow before pointing DNS traffic.

---

*End of Z.ai handoff.*
