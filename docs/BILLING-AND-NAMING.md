# Billing environment, pricing display, naming, and tools

## 1. Payment environment (Stripe)

**Already in code:** `/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`, `/api/stripe/finalize`, and the Plans modal read `NEXT_PUBLIC_PLAN_PRICE_*_USD`.

**You must configure (production / paid checkout):**

1. **Gate** — `BABYGPT_APP_PASSWORD` + `BABYGPT_SESSION_SECRET` in the deployment env.
2. **Stripe** — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and recurring price IDs `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM` (create Products/Prices in the Stripe Dashboard to match your USD amounts).
3. **Redirects** — `NEXT_PUBLIC_APP_URL` = your public origin (no trailing slash), e.g. `https://your-app.vercel.app`.

**Checklist script (shows ✅/❌ without printing secrets):**

```bash
npm run verify:billing
```

**Local dev:** `.env.local` includes `NEXT_PUBLIC_APP_URL=http://localhost:3000` and example list prices. Add Stripe keys when you test Checkout (use Stripe test keys and CLI webhook forwarding if needed).

---

## 2. Clear prices in the app

List prices are **not** hard-coded in React; they come from:

- `NEXT_PUBLIC_PLAN_PRICE_STARTER_USD`
- `NEXT_PUBLIC_PLAN_PRICE_PRO_USD`
- `NEXT_PUBLIC_PLAN_PRICE_TEAM_USD`

They must stay **aligned** with what you configure in Stripe for each subscription price, or customers will see one number in-app and another at Checkout.

**Defaults in `.env.local` (edit freely):** Starter **$12**, Pro **$24**, Team **$69** / month (USD).

---

## 3. Comparison with ChatGPT (informational only)

| | **ChatGPT (OpenAI)** | **BabyGPT (this app)** |
|---|----------------------|-------------------------|
| Vendor | OpenAI | Your deployment |
| Models | GPT family, etc. | GLM / Z.AI (+ fallbacks per `AGENTS.md`) |
| Pricing | Changes over time; Plus often cited around **~$20/mo US** for consumers | Your Stripe prices + in-app credits |

BabyGPT does **not** claim parity with ChatGPT features or pricing; the Plans modal includes a **reference-only** note.

---

## 4. Trademark / naming (“Baby ChatGPT” vs “BabyGPT”)

**This is not legal advice.** For a product you ship commercially, ask an IP lawyer in your jurisdiction.

- **“ChatGPT”** is widely associated with **OpenAI** and is used as a **brand**; using **“ChatGPT”** or **“Baby ChatGPT”** in a way that suggests **endorsement, affiliation, or the same service** creates **real risk** (confusion, trademark/unfair-competition claims).
- **“BabyGPT”** (without “Chat”) is **more distinctive**, but **“GPT”** is strongly associated with OpenAI’s family of marks in the public mind — some residual risk remains, especially in ads or app store listings.
- **Safer patterns:** an **unrelated coined name** + clear **“Not affiliated with OpenAI”** (already in site metadata and footer) + no use of OpenAI logos.

**Recommendation:** Prefer **“BabyGPT”** or rebrand entirely; **avoid “Baby ChatGPT”** in marketing and product title. Confirm with counsel before large spend on branding.

---

## 5. OpenClaw / “claw” and search

- **OpenClaw** is a **separate** agent/runtime ecosystem (e.g. browser automation via Playwright, skills). It is **not** bundled into this Next.js repo.
- **BabyGPT** already exposes **`web_search`** in agent mode: Z.AI’s `web_search` when configured, otherwise **DuckDuckGo** instant answers (`src/lib/tools/web-search.ts`).
- **Practical path:** keep **web_search** for normal “look this up” flows. If you need **full browser automation** (log into sites, drive headless Chrome), run **OpenClaw** (or similar) as a **separate service** and call it from your backend with strict auth — that is a larger integration than a small patch.

---

## 6. Related files

- `src/lib/plan-pricing-display.ts` — reads `NEXT_PUBLIC_PLAN_PRICE_*`
- `src/components/SubscriptionModal.tsx` — shows money + Stripe buttons when gate + Stripe are configured
- `scripts/check-billing-env.cjs`, `scripts/billing-env-keys.cjs`
