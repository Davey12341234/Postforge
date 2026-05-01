# Production deployment — Railway + GoDaddy (Unified Content Studio)

**Status:** Template — **you** must complete Railway login, env vars, DNS, and Stripe webhook using **your** accounts.  
**Short command order:** [`RAILWAY-QUICK-RUN.md`](./RAILWAY-QUICK-RUN.md)  
**This repo cannot** run `railway login`, open Stripe/GoDaddy in your browser, or use your live keys from here.

**Prerequisites validated locally (this workspace):** `npx tsc --noEmit` ✅ · `npm run build` ✅  
See also: [`GO-LIVE-DEPLOYMENT-PLAN.md`](./GO-LIVE-DEPLOYMENT-PLAN.md), [`DEPLOY-VERIFICATION-RUN.md`](./DEPLOY-VERIFICATION-RUN.md).

---

## Critical env vars (exact names from `.env.local.example`)

Railway injects **`DATABASE_URL`** when you add the PostgreSQL plugin — do not paste a duplicate unless you use an external DB.

| Variable | Required for Unified go-live | Notes |
|----------|------------------------------|--------|
| **`NEXTAUTH_URL`** | **Yes** | **`https://yourdomain.com`** (no trailing slash). **Omitted in many checklists — without it, auth and Stripe return URLs break.** |
| **`NEXTAUTH_SECRET`** | Yes | `openssl rand -base64 32` (or equivalent) |
| **`ANTHROPIC_API_KEY`** | Yes | `/api/unified/chat` and `/api/unified/generate` |
| **`STRIPE_SECRET_KEY`** | Yes | `sk_live_...` or `sk_test_...` for testing |
| **`STRIPE_PUBLISHABLE_KEY`** | If client reads it | Often `pk_live_...` — only add `NEXT_PUBLIC_` prefix if you expose publishable key in browser code |
| **`STRIPE_WEBHOOK_SECRET`** | Yes | `whsec_...` for the endpoint whose URL matches **`NEXTAUTH_URL`** domain |
| **`STRIPE_PRICE_PRO`** | Yes | `price_...` from Stripe Dashboard → Products → Prices |
| **`STRIPE_PRICE_BUSINESS`** | Yes | Same — **`npm run deploy:check` requires all three**; add real Business price or a placeholder `price_...` if that tier is not sold yet |
| **`STRIPE_PRICE_ENTERPRISE`** | Yes | Same for Enterprise |
| **`ADMIN_REVENUE_SECRET`** | Recommended | Protects `GET /api/admin/revenue` |
| **`OPENAI_API_KEY`** | **Recommended** | DALL·E / GPT Image edit, Whisper transcribe, **OpenAI chat** (`UNIFIED_CHAT_PROVIDER=openai`). Unified **text generate** and default **Anthropic chat** work with Anthropic only. |
| **`APP_URL`** | Recommended | Same public `https://` origin as `NEXTAUTH_URL` when the app builds absolute URLs for uploads. |
| **`UNIFIED_CHAT_PROVIDER`** | Optional | `anthropic` (default) or `openai` — requires matching API key configured. |
| **`NODE_ENV`** | Optional | Railway often sets `production` automatically |

**Validate before deploy:** copy Railway variables into a KEY=value file and run **`npm run deploy:check`**. Prefer `deploy/secrets.preview.env` (see `deploy/secrets.preview.env.example`); if your editor hides gitignored folders, use **`%USERPROFILE%\.postforge-deploy-check.env`** or **`DEPLOY_CHECK_FILE`** — see **`deploy/WHERE-TO-PUT-SECRETS.txt`**. After deploy, **`npm run verify:deploy https://your-domain.com`** for HTTP smoke checks.

---

## Railway CLI (local machine)

**Installed in this environment:** `@railway/cli` global install succeeded once; **you** run login/deploy on **your** PC:

```powershell
npm i -g @railway/cli
cd C:\path\to\postforge
railway login
railway init
railway add -d postgres
```

Set variables in the Railway dashboard (**Variables**) or:

```bash
railway variables --set "NEXTAUTH_URL=https://yourdomain.com"
# ... repeat for secrets (prefer dashboard for multiline/paste)
```

Deploy:

```bash
railway up
```

**After first successful deploy** (Postgres reachable):

```bash
railway run npx prisma migrate deploy
```

If `railway run` is not linked, open a shell attached to the service from the dashboard and run the same command, or use **Deploy / Release Command** in Railway to run migrations on each deploy (recommended for teams).

---

## Stripe webhook (GoDaddy domain)

1. **Developers → Webhooks → Add endpoint**  
2. **URL:** `https://yourdomain.com/api/stripe/webhook`  
   Use the **same host** as `NEXTAUTH_URL` (not only `*.up.railway.app` once DNS is live).  
3. **Events** — must match code in `src/app/api/stripe/webhook/route.ts`:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - **`invoice.paid`** (not `invoice.payment_succeeded`)
   - `invoice.payment_failed`
4. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET` in Railway.

---

## GoDaddy DNS → Railway

1. Railway **Settings → Networking → Custom domain** → add `yourdomain.com` and `www.yourdomain.com`.  
2. Apply the **CNAME / A** records Railway shows in **GoDaddy → DNS Management**.  
3. Wait for propagation; verify with `nslookup yourdomain.com` or [dnschecker.org](https://dnschecker.org).

**SSL:** Railway terminates HTTPS once the domain is verified.

---

## UI smoke tests (repo-accurate)

The **Unified** shell uses tabs: **Home · Create · Drafts · Publish · Stats** (not a separate top-level “Chat” or “Settings” tab).

- **Create** includes: one-shot **Generate**, **Preferences (cloud)**, and **Conversational AI** (chat) on the same tab.  
- There is **no** dedicated “Copy” button in the current generate panel unless you add it — verify manually.  
- **Credits** refresh after successful generate/chat via existing `loadProgress()` calls.

Endpoints to curl (expect **401** without session cookie — proves route exists):

```bash
curl -sI "https://yourdomain.com/api/unified/credits"
curl -sI "https://yourdomain.com/api/unified/user/progress"
curl -sI -X POST "https://yourdomain.com/api/stripe/webhook" -H "Content-Type: application/json" -d "{}"
# Webhook should reject unsigned body (e.g. 400) — not 404
```

---

## Rollback (Railway)

Use the Railway dashboard **Deployments** → select previous deployment → **Rollback**, or CLI:

```bash
railway deployments
railway rollback
```

(Exact CLI syntax may vary by CLI version — check `railway --help`.)

---

## Production deployment record (fill in after go-live)

| Field | Value |
|-------|--------|
| **Date** | |
| **Public URL** | `https://____________` |
| **Railway project** | |
| **Postgres** | Railway plugin / external: |
| **Stripe mode** | Test / Live |
| **DNS provider** | GoDaddy |
| **Migrations** | `prisma migrate deploy` run at: |

### Sign-off checklist

- [ ] `npm run deploy:check` passes (using `deploy/secrets.preview.env` or `.env.production.local`)  
- [ ] `NEXTAUTH_URL` = production `https://` origin  
- [ ] `OPENAI_API_KEY` + `APP_URL` set if you need OpenAI image/voice/chat or absolute asset URLs  
- [ ] All Stripe **price** env vars set (`STRIPE_PRICE_*`)  
- [ ] Webhook URL uses **production** domain + `invoice.paid` selected  
- [ ] `railway run npx prisma migrate deploy` (or equivalent) succeeded — **or** rely on `railway.json` start command running `railway-deploy-migrate.mjs`  
- [ ] `npm run verify:deploy https://your-domain.com` passes (optional but recommended)  
- [ ] `/unified` loads signed in; generate + chat smoke-tested  

---

*Update this file when infrastructure changes. Do not commit real secrets.*
