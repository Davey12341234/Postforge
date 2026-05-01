# Stripe account setup for BabyGPT (operator checklist)

Use this when you are **new to Stripe** or wiring **paid plans** for the first time.  
Technical deploy steps (Vercel env push) stay in `docs/HANDOFF-AI-NEXT-REVIEW.md`.

### If Cursor cannot open `.env.local` (“Unable to resolve resource”)

The file is **gitignored** (correct for secrets). Some editor tabs break after URI changes.

1. **Command Palette** → **Developer: Reload Window**, then **File → Open Folder** → select the repo root (`postforge`), then open `.env.local` from the tree or **File → Open File** and paste the full path to `.env.local`.
2. Or run: **`npm run env:open`** — creates `.env.local` from `.env.local.example` if missing, then launches **Cursor CLI**, **VS Code**, or **Notepad** with that path so you can paste Stripe values.

---

## What an AI or script cannot do for you

- **Create or approve your Stripe account** — you must sign up at [stripe.com](https://stripe.com), complete identity / business verification when Stripe asks, and accept their terms.
- **Choose your real prices, tax strategy, or legal entity** — only you (or your accountant) can decide.
- **Receive webhooks on your laptop without tooling** — production webhooks need a **public HTTPS URL** (e.g. Vercel). For local testing, use the **Stripe CLI** (below).

---

## 1. Create the Stripe account

1. Go to **https://dashboard.stripe.com/register** (or **stripe.com** → Sign in / Sign up).
2. Complete email verification and any **business / individual** questions Stripe requires for your country.
3. Stay in **Test mode** (toggle in the Dashboard) until Checkout works end-to-end; then switch to **Live mode** for real charges.

---

## 2. API keys (Test first)

1. **Developers → API keys**.
2. Copy the **Secret key** (`sk_test_...` for Test mode).
3. Put it in `.env.local` as:

   ```env
   STRIPE_SECRET_KEY=sk_test_...
   ```

   Never commit this file. Use **Live** keys only in production/Vercel.

---

## 3a. Product name & description (optional, API — avoids Dashboard typos)

Canonical copy matches `src/lib/plans.ts`. After `STRIPE_SECRET_KEY` is in `.env.local`, you can push **name + description** to a Stripe Product from the repo (no manual paste):

```bash
# Preview payload (no Stripe call, no secret required for --dry-run)
node scripts/stripe-update-product-copy.cjs --dry-run prod_YOUR_ID starter

# Apply (requires STRIPE_SECRET_KEY)
node scripts/stripe-update-product-copy.cjs prod_YOUR_ID starter
```

Or set `STRIPE_PRODUCT_STARTER`, `STRIPE_PRODUCT_PRO`, `STRIPE_PRODUCT_TEAM` and run `node scripts/stripe-update-product-copy.cjs --all`.  
`npm run stripe:sync-product-copy` runs the same script (pass args after `--`).

This **does not** create Prices or change amounts — only Product metadata. Price IDs still go in `STRIPE_PRICE_*`.

## 3. Products and Prices (must match app env names)

BabyGPT expects **three recurring monthly prices** (Starter, Pro, Team):

1. **Product catalog → Add product** (repeat or one product with three prices—your choice).
2. For each tier, add a **Price**:
   - **Recurring**, **Monthly** (or whatever interval you want—the app assumes monthly credits in UX; align copy with your Stripe Prices).
3. Copy each **Price ID** (`price_...`) into `.env.local`:

   ```env
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_TEAM=price_...
   ```

4. Optional but recommended for the Plans modal dollar amounts:

   ```env
   NEXT_PUBLIC_PLAN_PRICE_STARTER_USD=12
   NEXT_PUBLIC_PLAN_PRICE_PRO_USD=24
   NEXT_PUBLIC_PLAN_PRICE_TEAM_USD=69
   ```

### 3b. Annual subscriptions (yearly Stripe Prices)

BabyGPT supports **Annual** billing in the Plans modal (toggle). You need **three additional recurring Prices** in Stripe with interval **year** — one per tier.

**Option A — API helper (same Product IDs as monthly):** after `STRIPE_SECRET_KEY` and `STRIPE_BABYGPT_PRODUCT_ID` (or `STRIPE_PRODUCT_*`) are set:

```bash
npm run stripe:ensure-prices
```

This creates missing **monthly** and **yearly** prices ($12/$24/$69 per month and $120/$240/$690 per year) and prints `STRIPE_PRICE_*` and `STRIPE_PRICE_*_YEARLY` lines. Use `npm run stripe:ensure-prices:yearly` for yearly only.

**Option B — Dashboard:** Product catalog → **Add price** → **Recurring**, **Yearly**, then copy each `price_…` into `.env.local`:

```env
STRIPE_PRICE_STARTER_YEARLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_TEAM_YEARLY=price_...
```

Optional: align what the modal shows before Checkout:

```env
NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD=120
NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD=240
NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD=690
```

If omitted, defaults are **$120 / $240 / $690** per year (~two months less than paying monthly ×12).

---

## 4. Webhook endpoint

The app listens at **`POST /api/stripe/webhook`**.

### Production (e.g. Vercel)

1. **Developers → Webhooks → Add endpoint**.
2. **Endpoint URL:** `https://<your-production-domain>/api/stripe/webhook`  
   Example: `https://postforge2.vercel.app/api/stripe/webhook`
3. **Events to send** — include at least:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` (if offered)
   - `invoice.payment_failed`
4. Copy the **Signing secret** (`whsec_...`) →

   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Local testing (optional)

Install [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the CLI-printed **webhook signing secret** as `STRIPE_WEBHOOK_SECRET` while testing locally.

---

## 5. Gated app + public URL (required for Checkout in this repo)

Paid checkout in BabyGPT is tied to the **login gate** and **`NEXT_PUBLIC_APP_URL`**:

```env
BABYGPT_APP_PASSWORD=your-shared-password
BABYGPT_SESSION_SECRET=<long-random-string>
NEXT_PUBLIC_APP_URL=https://your-domain.example
```

No trailing slash on `NEXT_PUBLIC_APP_URL`.  
Generate a session secret (example): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

## 6. Customer Portal (optional)

**Settings → Billing → Customer portal** — enable and customize.  
If Stripe gives you a **Configuration ID** (`bpc_...`), you can set:

```env
STRIPE_PORTAL_CONFIGURATION=bpc_...
```

---

## 7. Verify in the repo

From the repo root:

```bash
npm run verify:billing   # checklist only
npm run finish:billing   # exit 0 when required keys exist in .env / .env.local
```

When `finish:billing` passes, push env to Vercel (Windows: `npm run vercel:env:prod`) and redeploy. See `HANDOFF-AI-NEXT-REVIEW.md` for the full operator runbook.

---

## 8. Moving forward (product / engineering)

| Direction | Why |
|-----------|-----|
| **Stripe Tax / automatic tax** | Set `STRIPE_CHECKOUT_AUTO_TAX=1` after configuring Tax in Dashboard (see `.env.local.example`). |
| **Test cards** | In Test mode, use Stripe’s [test card numbers](https://stripe.com/docs/testing). |
| **Observability** | Log webhook delivery failures in Stripe Dashboard; add server logging on `/api/stripe/webhook` if needed. |
| **Durability** | Credits/plan sync depend on webhooks + server storage under `BABYGPT_DATA_DIR` when gated—back up that directory for self-host. |

---

## Quick env ↔ Stripe mapping

| Env var | Stripe Dashboard location |
|---------|---------------------------|
| `STRIPE_SECRET_KEY` | Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Developers → Webhooks → your endpoint → Signing secret |
| `STRIPE_PRICE_*` | Product catalog → each Price → copy Price ID |
| `NEXT_PUBLIC_APP_URL` | Your deployed site origin (same host as Checkout return) |
