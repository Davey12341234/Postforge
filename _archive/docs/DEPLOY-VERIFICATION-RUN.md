# Deploy verification run (local automation)

**Date:** 2026-04-10 (UTC)  
**Environment:** Windows workspace `postforge`  
**Plan followed:** [`GO-LIVE-DEPLOYMENT-PLAN.md`](./GO-LIVE-DEPLOYMENT-PLAN.md) Phases 1–2; Phases 3–5 require your hosting credentials and production URL.

---

## Phase 1 — Review

| Step | Result |
|------|--------|
| Read `GO-LIVE-DEPLOYMENT-PLAN.md` | Reference doc verified (corrected endpoints/env table) |
| Grep `TODO` / `FIXME` in `src/app/api/unified/**/*.ts` | **None found** |
| Grep `TODO` / `FIXME` in `src/app/api/stripe/**/*.ts` | **None found** |
| `invoice.paid` in webhook handler | **Present** — `src/app/api/stripe/webhook/route.ts` (`case "invoice.paid"`) |
| `npx tsc --noEmit` | **OK** — exit code **0** (standalone run) |

---

## Phase 2 — Build (local)

| Command | Result |
|---------|--------|
| `npx prisma generate` | **OK** — Prisma Client v5.22.0 |
| `npm run build` | **OK** — exit code **0** (~75s) |

### Build warnings (non-fatal)

1. **Middleware:** Next.js 16 reports the **`middleware`** file convention is deprecated in favor of **`proxy`** — follow [Next.js message](https://nextjs.org/docs/messages/middleware-to-proxy) when you upgrade routing.
2. **Metadata:** `themeColor` in metadata export on **`/unified`** and **`/unified/pricing`** — move to **`viewport` export** per Next.js 16.

### Route manifest (Unified-related, from build output)

- `ƒ /api/stripe/webhook`
- `ƒ /api/unified/analytics`, `chat`, `checkout`, `credits`, `drafts`, `drafts/[id]`, `generate`, `publish`, `referrals`, `settings`, `upload`, **`user/progress`**
- `ƒ /unified`, `ƒ /unified/pricing`

---

## Phases 3–5 — Not executed here

| Phase | Why |
|-------|-----|
| **3–4 Deploy** (Vercel / Railway / Docker) | Requires **your** account login, env vars, and production `DATABASE_URL`. Run on your machine or CI. |
| **5 Validate E2E** | Requires deployed **HTTPS** URL + browser session + Stripe test/live keys. |
| **Monitor** | Use Vercel logs / Stripe dashboard after you deploy. |

### Commands for you to run after configuring production env

```bash
# Production database (set DATABASE_URL first)
npx prisma migrate deploy

# Deploy (example: Vercel)
vercel --prod
```

### Smoke tests (manual, post-deploy)

Use the checklist in **`GO-LIVE-DEPLOYMENT-PLAN.md` Part 4** — Preferences under **Create** tab, offline/localStorage drafts, generate, chat, stats, checkout.

---

## Summary

- **Local quality gates:** prisma generate + **production build succeeded** (exit 0).
- **No blocking TODO/FIXME** in unified or Stripe API folders from grep.
- **Webhook** uses **`invoice.paid`** (not `payment_succeeded`).
- **Deploy + live monitoring** are **your** next steps; this run does not replace them.

---

*Append a new section below when you complete production deploy and E2E validation.*
