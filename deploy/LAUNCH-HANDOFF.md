# Launch handoff (bbGPT / postforge2)

Use this with **Vercel**, **Namecheap** (or your DNS), **Neon**, and **Stripe** in the same session. Pass the “For the other AI / operator” section verbatim if helpful.

---

## Automated checks this repo supports

Run from repo root (`c:\Users\mckel\postforge`):

| Command | Verifies |
|--------|-----------|
| `npm run verify` | ESLint, Vitest, production `next build` |
| `npm run launch:audit` | `verify` + HTTP smoke (`launch:smoke`) + **`db:ping:vercel`** (Production DB reachable) |
| `npm run launch:smoke` | Live URL (default `https://postforge2.vercel.app`): `/`, `/login`, logo, `/api/credits`, `/checkout/return` |
| `npm run db:ping:vercel` | Postgres URL from **Vercel Production** (stash `.env.local` so empty `DATABASE_URL=""` does not mask secrets) |
| `npm run db:migrate:vercel` | Apply Drizzle migrations against Production DB |
| `npm run finish:billing` | Required Stripe + gate keys in merged `.env` / `.env.local` **only** |

**Important:** `npx vercel env pull` often writes **empty strings** for encrypted variables (e.g. `STRIPE_SECRET_KEY=""`). That makes **`npm run finish:billing`** report everything missing even when Production is correct. **Confirm values in Vercel → postforge2 → Settings → Environment variables → Production.**

---

## What we can prove without your dashboards

- **Build and tests are green** (`npm run verify`).
- **Deployed app responds** (`launch:smoke`) if the default URL (or `LAUNCH_SMOKE_URL`) is up.
- **Production database is reachable and migrated** (`db:ping:vercel`, `db:migrate:vercel`) when `DATABASE_URL` is set on Vercel.

---

## What only you (or another AI with dashboard access) can do

### Vercel

1. **Production env vars** — non-empty values for at least:  
   `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `BBGPT_APP_PASSWORD`, `BBGPT_SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_TEAM`, plus any LLM keys you use in production.
2. **Domains** — add `www.bbgpt.ai` (and apex if needed); wait for **Valid** + HTTPS.
3. **Redeploy** after env changes: `npm run deploy:prod`.

### DNS (Namecheap — see also `DEPLOY-CHECKLIST.md` and `deploy/bbgpt-ai-DNS-Namecheap.txt`)

- **`www`**: **CNAME** → the **exact** target Vercel prints for `www.bbgpt.ai` (example for this project: `45f91758b1a5bb25.vercel-dns-017.com` — copy from **Settings → Domains** if it differs).
- **`@` (apex)**: use only the records Vercel lists for `bbgpt.ai` (do not rely on outdated generic `cname.vercel-dns.com` snippets).

### Neon

- Cluster healthy; connection string matches what’s in **Vercel `DATABASE_URL`** (pooled URL is typical for serverless).

### Login recovery (important: shared password, not per-user passwords)

bbGPT gates the app with **one shared** `BBGPT_APP_PASSWORD`. There is **no separate password per Gmail address** unless you add a full auth provider (e.g. Clerk).

To let **trusted emails** sign in without typing that password:

1. **`BBGPT_MAGIC_LINK_EMAILS`** — comma-separated Gmail/addresses that may request a link on `/login` → *Forgot password / email sign-in link*.
2. **`RESEND_API_KEY`** + **`EMAIL_FROM`** (Resend — verify your sending domain).
3. **`NEXT_PUBLIC_APP_URL`** — canonical `https://…` host so links in emails match production.

Alternatively, **`user_wallets.email`** in Postgres (Stripe customer email) is matched case-insensitively so checkout email can qualify without the allowlist.

Operator CLI without email delivery: **`node scripts/print-magic-link.mjs <email> https://your-domain`** (needs `BBGPT_SESSION_SECRET` in env).

### Stripe

1. **Webhook** endpoint: `https://www.bbgpt.ai/api/stripe/webhook` (or your canonical host) with events your app handles (checkout, subscription lifecycle, invoices).
2. **`STRIPE_WEBHOOK_SECRET`** (`whsec_…`) copied into Vercel Production.
3. **Prices** — monthly (and yearly if needed) price IDs match env vars.

---

## Path to “done”

1. Finish **Vercel Production** env + **Stripe** webhook + **DNS** as above.
2. `npm run deploy:prod`
3. `npm run launch:audit`
4. Manual: log in → chat message → Plans → test checkout → confirm webhook **200** in Stripe.

---

## For the other AI / operator (copy-paste)

Please guide the user through:

1. **Vercel** — Open team **cant-lose-gaming**, project **postforge2**, **Settings → Environment variables (Production)**. Confirm every variable in `scripts/vercel-push-prod-env.cjs` `required` array has a **non-empty** value (especially `DATABASE_URL`, Stripe keys, `NEXT_PUBLIC_APP_URL`, gate secrets). Note: `vercel env pull` may show blanks locally; trust the dashboard for truth.

2. **Stripe** — Webhook URL `https://www.bbgpt.ai/api/stripe/webhook` (adjust if canonical URL differs). Paste signing secret into `STRIPE_WEBHOOK_SECRET`. Confirm API key matches live vs test mode expectations.

3. **DNS** — Namecheap per `DEPLOY-CHECKLIST.md`; wait until Vercel Domains shows **Valid**.

4. **Repo commands** — From repo root run `npm run launch:audit`. If `finish:billing` fails locally but dashboard is complete, treat dashboard as source of truth and proceed with deploy + smoke tests.

5. **Production DB** — Run `npm run db:migrate:vercel` once after `DATABASE_URL` is correct on Vercel.

---

## Troubleshooting

| Symptom | Likely fix |
|---------|------------|
| `finish:billing` all ❌ after pull | Values empty in `.env.local`; verify in **Vercel Dashboard** |
| `db:ping` fails with `placeholder` host | Replace stub `DATABASE_URL` on Vercel with real Neon URL |
| `db:ping:vercel` works, plain `db:ping` fails | Expected when pull leaves `DATABASE_URL=""`; use `:vercel` scripts or paste URL locally |
| Smoke test fails | Wrong URL — set `LAUNCH_SMOKE_URL=https://www.bbgpt.ai npm run launch:smoke` |
