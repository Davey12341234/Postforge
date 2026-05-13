#!/usr/bin/env node
/**
 * Operator checklist for Vercel + Stripe (read after `npm run finish:billing` passes).
 * Does not read secrets; safe to run anywhere.
 */
const { loadMergedEnv } = require("./load-env-files.cjs");

const url = loadMergedEnv(process.cwd()).NEXT_PUBLIC_APP_URL?.trim() || "https://your-app.vercel.app";

console.log(`
=== bbGPT — next steps to go live (production) ===

0) Preconditions
   - Vercel project linked: .vercel/project.json (npx vercel link)
   - Local file:  .env.local  with real values (not committed)

1) Quality gate
   npm run prod:ready
   (ESLint, tests, build, and finish:billing must all pass)

2) Sync environment to Vercel Production
   npm run vercel:env:prod

3) Deploy
   npm run deploy:prod
   (adds --force to clear build cache:  npm run deploy:prod:fresh )

4) Stripe (same mode as your secret key: test vs live)
   - Developers → Webhooks → Add endpoint
     URL:  ${url.replace(/\/$/, "")}/api/stripe/webhook
   - Subscribe to events your handlers use (at minimum):
     checkout.session.completed,
     customer.subscription.created, customer.subscription.updated, customer.subscription.deleted,
     invoice.paid, invoice.payment_failed
   - Paste the endpoint signing secret into Vercel as STRIPE_WEBHOOK_SECRET (must match this endpoint).

5) Smoke test
   - Open ${url.replace(/\/$/, "")}/login → sign in
   - Same host: GET /api/credits → stripe.configured should be true when billing env is correct
   - Plans → Subscribe → Stripe Checkout (test card if sk_test_…)

Local development only
   If Checkout must return to localhost, set in .env.local:
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   Production deploy should use your public HTTPS URL on Vercel.

`);
