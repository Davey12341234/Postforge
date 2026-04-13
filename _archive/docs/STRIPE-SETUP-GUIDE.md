# Stripe setup — Unified Content Studio

**Webhook URL:** `https://YOUR_DOMAIN/api/stripe/webhook` (use your real domain; must match `NEXTAUTH_URL` host.)

**Events to select** (must match `src/app/api/stripe/webhook/route.ts`):

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- **`invoice.paid`** (not `invoice.payment_succeeded`)
- `invoice.payment_failed`

Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET`.

---

## API keys & prices

1. **Developers → API keys** — publishable + secret (`pk_` / `sk_`). Test vs live toggles top-right.
2. **Products →** create Pro / Business / Enterprise (or your pricing) → copy **Price IDs** (`price_...`) into:
   - `STRIPE_PRICE_PRO`
   - `STRIPE_PRICE_BUSINESS`
   - `STRIPE_PRICE_ENTERPRISE`

Set these in **Railway → Variables** (same names as `.env.local.example`).

---

## Test mode vs live

| Mode | Cards |
|------|--------|
| **Test** | Use [Stripe test cards](https://stripe.com/docs/testing) (e.g. `4242 4242 4242 4242`) — only when Dashboard says **Test mode**. |
| **Live** | Real cards only; **never** use `4242…` in live mode — charges are real. |

---

## Troubleshooting

- **Webhook signature verification failed** — `STRIPE_WEBHOOK_SECRET` must match the **same** endpoint (test secret vs live secret differ).
- **No such price** — Price IDs must match the mode (test price IDs with test keys).
- **Checkout redirects wrong** — `NEXTAUTH_URL` must be the public origin (e.g. `https://app.example.com`), no trailing slash.

---

## References

- [Stripe webhooks](https://stripe.com/docs/webhooks)
- Repo: [`PRODUCTION-DEPLOYMENT.md`](./PRODUCTION-DEPLOYMENT.md), [`REVIEW-HANDOFF.md`](./REVIEW-HANDOFF.md)
