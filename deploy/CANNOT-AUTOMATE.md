# BabyGPT — what automation cannot do (you must do these)

Bots and CI cannot log into third‑party accounts or mint real secrets. Below is the split between **repo automation** and **human-only** steps.

---

## Fully automated from the repo (after you clone)

| Command | What it does |
|---------|----------------|
| `npm run env:scaffold` | Adds missing empty `KEY=` lines to `.env.local` (no overwrites). |
| `npm run prod:ready` | Lint → test → production build → `finish:billing` (env completeness). |
| `npm run ship` | `env:scaffold` then `prod:ready` (one-shot “am I ready?”). |
| `npm run stripe:ensure-prices` | **If** `STRIPE_SECRET_KEY` + product ID are in env: creates missing Stripe Prices via API and prints env lines. |
| `npm run verify` | Lint + test + build (no env check). |
| `npm run finish:billing` | Checks required billing/gate vars in merged `.env` / `.env.local`. |
| `npm run vercel:env:prod` | Pushes env from `.env.local` to Vercel Production **after** you are logged into Vercel CLI and linked. |

---

## You must do (accounts, secrets, legal)

### 1. Stripe (dashboard.stripe.com)

| Task | Why it can’t be scripted here |
|------|--------------------------------|
| Sign up / business verification | Identity and banking are yours. |
| Decide real prices & tax | Business decision. |
| Copy **Secret key** (`sk_test_…` / `sk_live_…`) | Issued only in your Dashboard. |
| Copy **Webhook signing secret** (`whsec_…`) | Tied to the endpoint **you** register on **your** domain. |
| Register webhook URL `https://<your-app>/api/stripe/webhook` | Must use your production (or tunnel) URL. |

**Partial help:** After `STRIPE_SECRET_KEY` and `STRIPE_BABYGPT_PRODUCT_ID` are in `.env.local`, run:

`npm run stripe:ensure-prices`

That creates monthly/yearly Prices via the API and prints `STRIPE_PRICE_*` lines — you still paste them into `.env.local` / Vercel.

### 2. Paste secrets into `.env.local`

| Task | Why |
|------|-----|
| Fill `sk_`, `whsec_`, `price_`, LLM keys | Values exist only in provider dashboards or your password manager. |

**Help:** `npm run env:open` opens the file; `npm run env:scaffold` ensures variable names exist.

### 3. Vercel (vercel.com)

| Task | Why |
|------|-----|
| `npx vercel login` | OAuth / browser login to **your** team. |
| Link project (`npx vercel link`) | Binds repo to **your** project. |
| Confirm Production env vars | CLI push or Dashboard paste — credentials are yours. |

### 4. Legal / compliance (when charging money)

| Task | Why |
|------|-----|
| Publish **Terms** and **Privacy** | Legal content is your responsibility. |

### 5. Final smoke test in a browser

| Task | Why |
|------|-----|
| Log in → Plans → Checkout → confirm credits / Stripe state | Validates cookies, redirects, and live Stripe together. |

---

## Optional “almost push” sequence (you run locally)

After `npm run ship` exits **0**:

```bash
npm run vercel:env:prod
npx vercel deploy --prod --yes
```

Then smoke-test `https://<your-production-host>`.

---

See also: `deploy/OPERATOR-only-you-can-do-this.txt`, `docs/STRIPE-ACCOUNT-SETUP.md`, `docs/FINAL-LAUNCH-COPY.md`.
