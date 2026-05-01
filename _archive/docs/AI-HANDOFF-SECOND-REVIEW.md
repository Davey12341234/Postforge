# Second AI — review brief (copy below the line)

---

## REVIEW BRIEF — paste everything under this rule into your context

You are doing a **final code and ops review** of the **Postforge** repo: Next.js App Router, **Unified Content Studio** at `/unified`, Prisma + Postgres, NextAuth, Stripe subscriptions, Anthropic + optional OpenAI (chat, images, voice).

**Your goals**

1. **Correctness:** Auth on all `/api/unified/*` handlers; 402/limit paths; Stripe webhook signature and event types; Prisma migrations on deploy (`scripts/railway-deploy-migrate.mjs` + `railway.json`).
2. **Consistency:** `scripts/required-env.production.json` lists **required** env vars; **`recommended`**: `OPENAI_API_KEY`, `APP_URL`. `npm run deploy:check` fails if required keys are missing/invalid; it **warns** (exit 0) if recommended are missing.
3. **Deploy script nuance:** `deploy:check` requires **all three** `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_ENTERPRISE` — align with Stripe Dashboard even if some tiers are placeholders.
4. **Large client:** `src/app/unified/unified-studio-client.tsx` (~2.5k lines) — recent fixes: `?draft=` fetch uses **AbortController**; failed **sendChat** rolls back optimistic user message + restores input; **`loadProgress()`** not inside chat error path.
5. **CI:** `.github/workflows/ci.yml` — lint, migration BOM, tsc, vitest, production build with dummy env.
6. **Windows:** Local `npm run build` may hit Prisma **EPERM** (DLL rename); trust **Linux CI** for build verification.

**Read first**

- `src/lib/unified-limits.ts`, `unified-stripe-sync.ts`, `unified-stripe-plan.ts`
- `src/app/api/unified/chat/route.ts`, `generate/route.ts`
- `src/app/api/stripe/webhook/route.ts`
- `src/app/unified/unified-studio-client.tsx` (search: `sendChat`, `draft`, `AbortController`)

**Commands**

- `npm run ci` — required before approving
- `npm run deploy:check` — after filling `deploy/secrets.preview.env` from Railway
- `npm run verify:deploy https://<host>` — post-deploy HTTP checks

**Do not** commit or log real secrets. See `docs/PRODUCTION-DEPLOYMENT.md` and `docs/AI-HANDOFF-LAST-IMPLEMENTATION-REVIEW.md` for deeper checklists.

---

## Appendix (same repo; optional detail)

| Doc | Use |
|-----|-----|
| `docs/PRODUCTION-DEPLOYMENT.md` | Railway, Stripe webhook URL, DNS, sign-off |
| `docs/AI-HANDOFF-LAST-IMPLEMENTATION-REVIEW.md` | Feature map, known gaps, a11y/security checklist |
| `docs/AI-RAILWAY-ENV-HANDOFF.md` | Env-specific notes |
| `deploy/secrets.preview.env.example` | Template for local `deploy:check` |

Edits in the session that produced this file: **`--file path`** supported in `check-deploy-readiness.mjs`; Stripe **three-price** requirement documented; this brief for second reviewer.

*No secrets. Safe to commit.*
