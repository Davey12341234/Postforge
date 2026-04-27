# Deploy checklist (manual steps)

- Namecheap / DNS: In **Vercel → Project → Settings → Domains**, open each hostname and copy the listed records (do not use generic guesses).
- Typical today: **`www`** **CNAME** → project target such as **`45f91758b1a5bb25.vercel-dns-017.com`** (use the value **your** Domains page shows).
- **Apex (`@`)**: use the **A** / **ALIAS** rows Vercel shows for `bbgpt.ai` (often different from `www`).
- Vercel: Wait for Domains to show "Valid" + HTTPS
- Stripe: Add webhook endpoint https://www.bbgpt.ai/api/stripe/webhook
- Stripe: Copy Webhook Signing Secret to Vercel Env (STRIPE_WEBHOOK_SECRET)
- Local: Run npx vercel env pull .env.local --environment production --yes
- Full operator + AI handoff: [deploy/LAUNCH-HANDOFF.md](deploy/LAUNCH-HANDOFF.md) (also: `npm run launch:audit`)
