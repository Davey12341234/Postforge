# Handoff — Last implementation pass (Unified Studio, billing, chat, drafts)

**Purpose:** Give a reviewing agent enough context to audit, harden, and improve the code shipped in recent sessions **without re-deriving intent from chat history**.

**Repo:** `postforge` (Next.js App Router). Primary surface: **`/unified`**.

**Companion docs:** [`AI-HANDOFF-SECOND-REVIEW.md`](./AI-HANDOFF-SECOND-REVIEW.md) (short brief for another agent), [`AI-RAILWAY-ENV-HANDOFF.md`](./AI-RAILWAY-ENV-HANDOFF.md), [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md), [`AI-HANDOFF-DIAGNOSTIC.md`](./AI-HANDOFF-DIAGNOSTIC.md), [`AI-CAPABILITIES-HANDOFF.md`](./AI-CAPABILITIES-HANDOFF.md).

---

## 1. What was implemented (feature map)

| Area | Behavior | Key files |
|------|------------|-----------|
| **Subscription tiers** | Pro / Business / Enterprise differ by **credit pools**, **monthly generation caps**, **draft caps**, and **feature gates** (OpenAI chat + media vs free Anthropic-only). | `src/lib/unified-limits.ts`, `src/lib/unified-stripe-sync.ts`, `src/lib/unified-stripe-plan.ts` |
| **Stripe sync** | Checkout + webhooks update `UnifiedSubscription`, profile `subscriptionTier`, limits; **price id → plan** from env; **credits refreshed** on checkout, plan change, and **invoice `subscription_cycle`**. | `src/lib/unified-stripe-sync.ts`, `src/app/api/stripe/webhook/route.ts`, `src/app/api/unified/checkout/route.ts` |
| **Structured generate** | Multi-turn **`messages[]`** to Anthropic (same `/api/unified/generate` route). | `src/app/api/unified/generate/route.ts`, `src/app/unified/unified-studio-client.tsx` (`genThread`) |
| **Conversational chat** | `/api/unified/chat`; 402 handling; free tier forces Anthropic in UI for OpenAI option. | `src/app/api/unified/chat/route.ts`, `unified-studio-client.tsx` |
| **Chat UX** | Continue structured thread → chat; load latest draft; clear / copy; per-bubble copy; char count; **draft deep link** `?draft=cuid`. | `unified-studio-client.tsx` |
| **Drafts UI** | Cloud drafts: **Open in chat** (`Link`), **Copy link**, Remove. | `unified-studio-client.tsx` |
| **CI** | GitHub Actions: lint, migration BOM, tsc, test, build. | `.github/workflows/ci.yml` |

---

## 2. Critical code paths (read order)

1. **`src/lib/unified-limits.ts`** — `getPlanLimits`, `getUserPlanKey`, `checkUsageLimits` (includes `unified_chat_message` in generation counts), `isFeatureEnabled` / `canUseOpenAiChat` / `canUseMediaStudio`.
2. **`src/lib/unified-stripe-sync.ts`** — `processCheckoutSessionCompleted`, `processCustomerSubscriptionChange`, `processInvoicePaid`, `refreshProfileCreditsForPlan`, `applyPlanLimitsToSubscriptionData`.
3. **`src/lib/unified-stripe-plan.ts`** — `resolvePlanFromStripePriceId`, `extractSubscriptionPriceId` (must match **`STRIPE_PRICE_*`** in env).
4. **`src/app/unified/unified-studio-client.tsx`** — Large client: tabs, `UNIFIED_API`, checkout, chat, generate thread, draft import, **`useSearchParams` + `useEffect`** for `?draft=` (see §4).
5. **`src/app/unified/page.tsx`** — **`Suspense`** wraps client (required for `useSearchParams`).

---

## 3. Environment (production)

Authoritative list: **`scripts/required-env.production.json`** — **`required`** keys must pass **`npm run deploy:check`**; **`recommended`** (`OPENAI_API_KEY`, `APP_URL`) produce **warnings** only if unset.

**All three** `STRIPE_PRICE_*` vars are **required** by the checker (even if you only sell one tier — use real or placeholder Stripe prices per `notes` in that JSON).

Stripe **Price IDs** in Railway must match what Stripe sends on subscriptions or **plan resolution fails** until `customer.subscription.updated` applies limits from metadata/row.

Do **not** commit secrets. Use **`deploy/secrets.preview.env.example`** + **`npm run deploy:check`** before deploy.

---

## 4. Fixes applied in this review session (agent self-audit)

| Issue | Fix |
|-------|-----|
| **`?draft=` race / Strict Mode** | `fetch` now uses **`AbortController`**; cleanup calls **`abort()`** so stale responses do not run after unmount or param change. |
| **Chat send rollback** | On **402** or **request failure**, last **user** bubble is removed and **input text restored** so failed sends do not leave orphan user messages. |
| **`loadProgress` vs chat errors** | **`loadProgress()`** moved **outside** the main try/catch so a progress refresh failure does not roll back a **successful** assistant reply. |

---

## 5. Known gaps / review checklist (for the next agent)

### Correctness & edge cases

- [ ] **`sendChat` optimistic UI:** Rollback uses `slice(0, -1)` — assumes the last message is always the just-added user message. Concurrent sends are blocked by `chatLoading`; document if that changes.
- [ ] **Empty draft caption:** `?draft=` with empty `caption` returns early without toast (rare DB state).
- [ ] **Local-only drafts:** No `?draft=` for offline/local rows (no server id). By design; **Open in chat** only on **cloud** drafts.

### Security

- [ ] All **`/api/unified/*`** routes: confirm **auth** on every handler (spot-check new routes).
- [ ] **Admin** routes: `ADMIN_REVENUE_SECRET` and similar.
- [ ] **Webhook:** Stripe signature verification only (already in `webhook/route.ts`).

### Performance

- [ ] `unified-studio-client.tsx` is **very large** (~2.5k lines) — candidate for splitting into hooks/components (generate panel, chat panel, drafts list).
- [ ] Chat history capped at **12** messages client-side; server should enforce max payload size (already via body limits).

### Testing

- [ ] **No E2E** (Playwright/Cypress) in repo — manual smoke: Structured generate → **Continue in chat** → Send; **`/unified?draft=<id>`**; checkout (test mode).
- [ ] Unit tests: `src/lib/__tests__/unified-limits.test.ts`, `unified-stripe-sync.test.ts`, `unified-stripe-plan.test.ts`.

### a11y

- [ ] Chat message **Copy** buttons: ensure focus order and `aria-label` if you refactor UI.
- [ ] Toasts: `aria-live` already on toast container — verify with screen reader once.

---

## 6. Commands (verify locally)

```bash
npm run ci          # lint + migration BOM + tsc + test
npm run ci:full     # + production build (Linux CI; Windows may EPERM on Prisma DLL lock)
npm run deploy:check  # after copying env to deploy/secrets.preview.env
node scripts/verify-deployment.mjs https://your-production-host
```

---

## 7. Suggested “last pass” improvements (optional)

1. **Split** `unified-studio-client.tsx` into smaller modules (maintainability).
2. **Integration test** for `POST /api/unified/generate` with `messages` array (Vitest + mocked fetch to Anthropic).
3. **E2E** smoke for `?draft=` and checkout redirect (Playwright against preview URL).
4. **Rate limiting** review on chat/generate (Upstash if env present).
5. **Observability:** structured logs for Stripe webhook failures and checkout 500s.

---

## 8. Git references (recent feature commits — verify on `main`)

Search history for: `feat(unified)`, `subscription`, `multi-turn generate`, `draft`, `Open Drafts`, `CI workflow`. Exact SHAs depend on your branch; **do not trust this doc for SHAs** — use `git log --oneline -20`.

---

*This document is for review planning only; it must not contain real secrets.*
