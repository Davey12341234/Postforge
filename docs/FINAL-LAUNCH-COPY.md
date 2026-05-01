# BabyGPT — Final copy & go-live (payments)

**Production URL:** https://postforge2.vercel.app  
**Stripe webhook URL (paste in Dashboard):** `https://postforge2.vercel.app/api/stripe/webhook`

---

## Final copy (what you’re selling)

**One-liner:** BabyGPT is a dark, fast ChatGPT-style assistant with **plans, credits, and quantum-style controls** (Thinking, dual-model Schrödinger, Agent, templates)—built for people who want one place for both **quick work** and **deeper sessions**.

**Value:** Subscriptions unlock bigger models and heavier modes; **Stripe Checkout** handles payment, tax (optional), and the **Customer Portal** handles cards, invoices, and cancel.

**Life-coach / companion onboarding** (seven intro questions, seven journey questions, five message modes) is on the **home screen when you have no messages** — see `src/lib/companion-onboarding.ts` and the **Companion — start here** block in `WelcomeScreen.tsx`. **Plans** only shows **billing & subscription** FAQ — not onboarding. Deeper product notes: `docs/BabyGPT-Onboarding-Paths-Spec.md`. The **live app** monetizes via **Starter / Pro / Team** and **monthly credits** when the gate + Stripe env are set.

**Trust:** You operate the deployment; Stripe is the merchant of record for charges. Add Terms + Privacy on your site when you take live money.

---

## Seven intro questions (connect & understand — rapport)

These are the **first** questions aimed at **who the user is** and **what matters now**. **Source of truth in code:** `src/lib/companion-onboarding.ts` (`INTRO_SEVEN_QUESTIONS`), shown on the **empty-chat welcome screen** — not in the Plans modal.

1. **Why are you here right now** — what made you open this chat?  
2. **What are you hoping we’ll figure out together** — what would “this helped” look like?  
3. **What have you already tried**, and what **patterns feel conditioned or repeated**?  
4. **What sucks the most** about how things stand — where’s it stuck or heavy?  
5. **How urgent is this** — deadlines, stakes, or pressure if nothing changes?  
6. **Who else is affected** by how this turns out (team, family, customers, future you)?  
7. **How should I talk with you** — preferred **tone and format**: direct vs gentle, brief vs deep, examples vs steps?

---

## Seven journey questions (mountaintop arc — vision / letter)

Use **after** the intro set when you want the **vision** track. **In code:** `JOURNEY_SEVEN_QUESTIONS` in `companion-onboarding.ts`, same welcome-screen UI.

1. What’s one thing you’re really hoping I can help you with?  
2. What’s your **mountaintop** — the big thing you’re ultimately working toward?  
3. If you woke up tomorrow and life was exactly how you want it, what would that **perfect day** look like?  
4. What do you love doing so much that **time disappears**?  
5. What’s the **one habit** that would change everything if you stuck with it?  
6. When you’re finally on that mountaintop, what does a **perfect day there** feel like?  
7. What’s **one thing I should never forget** about you?

---

## Five message prefixes (Fact search + modes)

Lead a message with **one** of these lines so the model stays in the right **mode**. **In app:** tap the mode chips on the **welcome screen** to insert at the start of the composer (`MESSAGE_MODE_PREFIXES` in `companion-onboarding.ts`). Dedicated toggles can come later.

| Prefix | Job |
|--------|-----|
| `Fact search:` | Verifiable info, sources, dates; flag uncertainty. |
| `Clarity mode:` | Define terms, remove ambiguity, confirm before advice. |
| `Discover mode:` | Widen options and unknowns; no forced early answer. |
| `Precision mode:` | Decisions, criteria, constraints, **one** next step. |
| `Perspective mode:` | Stakeholders, tradeoffs, alternate frames. |

**Example:** `Clarity mode: I’m torn between two job offers and the wording in the benefits is confusing.`

---

## What must be true to accept payments today

Your repo’s **`npm run finish:billing`** checks these (all required for **Subscribe with Stripe** + gate):

| Variable | Purpose |
|----------|---------|
| `BABYGPT_APP_PASSWORD` | Shared login for gated app |
| `BABYGPT_SESSION_SECRET` | JWT cookie signing |
| `STRIPE_SECRET_KEY` | `sk_live_…` (real charges) or `sk_test_…` (test cards) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` for **this** webhook endpoint |
| `STRIPE_PRICE_STARTER` / `PRO` / `TEAM` | Recurring **monthly** Price IDs from Stripe |
| `NEXT_PUBLIC_APP_URL` | **Must** be `https://postforge2.vercel.app` (no trailing slash) for this deployment |

**Optional but recommended:** `NEXT_PUBLIC_PLAN_PRICE_*_USD` (modal list prices), `OPENAI_API_KEY` or `Z_AI_API_KEY` (chat), `STRIPE_CHECKOUT_AUTO_TAX` if you use Stripe Tax.

**Current local status:** Run `npm run finish:billing`. Until Stripe + price IDs + webhook secret are in `.env` / `.env.local`, the script exits **1** — **you cannot sync or trust production checkout without filling those in Stripe first.**

---

## Stripe Dashboard (live money today)

1. **Mode:** Switch to **Live** (or stay in **Test** until webhook is verified — same steps, test keys).
2. **Products:** Create three recurring **monthly** prices (Starter, Pro, Team). Copy each `price_…` ID into `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`.
3. **Developers → API keys:** Copy **Secret key** → `STRIPE_SECRET_KEY`.
4. **Developers → Webhooks → Add endpoint:**  
   - URL: `https://postforge2.vercel.app/api/stripe/webhook`  
   - Events (minimum): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`  
   - Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`.
5. **Customer Portal** (optional): Configure in Stripe; optionally set `STRIPE_PORTAL_CONFIGURATION` (`bpc_…`).

---

## Vercel (this project: `postforge2`)

Production env on Vercel currently includes **legacy** vars (`NEXTAUTH_*`, `DATABASE_URL`) from an older stack. **BabyGPT billing** needs the variables in the table above on **Production**.

**After `.env.local` passes `npm run finish:billing`:**

```powershell
cd C:\Users\mckel\postforge
npm run vercel:env:prod
```

(Uses `scripts/set-babygpt-vercel-prod-env.ps1` — reads `.env.local` or `.env`, pushes to Vercel Production.)

Then:

```powershell
npx vercel deploy --prod --yes
```

---

## Verify after deploy

1. Open https://postforge2.vercel.app → log in with `BABYGPT_APP_PASSWORD`.
2. **Plans** → paid tier should show **Subscribe with Stripe** (not only “Use this plan”) when `STRIPE_SECRET_KEY` + prices exist on the server.
3. Complete a **test** checkout (test mode) or small **live** payment (live keys).
4. **Stripe → Webhooks** → latest delivery **200** for `/api/stripe/webhook`.
5. Browser **Network** → `GET /api/credits` → body includes `"stripe":{"configured":true,...}` when Stripe is wired.

---

## Files to share with collaborators

| File | Use |
|------|-----|
| `docs/FINAL-LAUNCH-COPY.md` | This doc — launch, payments, intro + journey questions, five prefixes |
| `docs/BabyGPT-App-Diagnostic.md` | Full app architecture |
| `docs/BabyGPT-Onboarding-Paths-Spec.md` | Product/onboarding spec |
| `docs/HANDOFF-AI-NEXT-REVIEW.md` | Billing / Stripe detail |

---

## Legal / ops (same day)

- [ ] Stripe **business details** and **payout** bank in Dashboard.  
- [ ] **Terms of Service** + **Privacy Policy** linked from the app or site.  
- [ ] **Refund / support** contact (even a simple email) for paying users.
