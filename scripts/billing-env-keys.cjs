/**
 * Shared key lists for billing / gate / Stripe (no values).
 * Used by check-billing-env.cjs and finish-billing-setup.cjs
 */

module.exports.REQUIRED_FOR_CHECKOUT = [
  { group: "Gate", key: "BABYGPT_APP_PASSWORD", note: "Shared login password" },
  { group: "Gate", key: "BABYGPT_SESSION_SECRET", note: "Long random string for JWT cookies" },
  { group: "Stripe", key: "STRIPE_SECRET_KEY", note: "sk_live_... or sk_test_..." },
  { group: "Stripe", key: "STRIPE_WEBHOOK_SECRET", note: "whsec_... from Dashboard → Webhooks" },
  { group: "Stripe", key: "STRIPE_PRICE_STARTER", note: "price_... recurring monthly" },
  { group: "Stripe", key: "STRIPE_PRICE_PRO", note: "price_..." },
  { group: "Stripe", key: "STRIPE_PRICE_TEAM", note: "price_..." },
  { group: "Public URL", key: "NEXT_PUBLIC_APP_URL", note: "https://your-app.vercel.app (no trailing slash)" },
];

module.exports.OPTIONAL_LIST_PRICES = [
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", note: "e.g. 12" },
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_PRO_USD", note: "e.g. 29" },
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_TEAM_USD", note: "e.g. 79" },
];

module.exports.OPTIONAL_STRIPE_TUNING = [
  { group: "Stripe tuning", key: "STRIPE_CHECKOUT_AUTO_TAX", note: "1 = enable automatic tax (configure Tax in Dashboard first)" },
  { group: "Stripe tuning", key: "STRIPE_CHECKOUT_TRIAL_DAYS", note: "Optional trial length 0–90" },
  { group: "Stripe tuning", key: "STRIPE_GRACE_PAST_DUE", note: "1 = treat past_due like paid for plan access (grace)" },
  { group: "Stripe tuning", key: "STRIPE_PORTAL_CONFIGURATION", note: "bpc_... Customer Portal configuration id" },
];

module.exports.ALL_ROWS = [
  ...module.exports.REQUIRED_FOR_CHECKOUT,
  ...module.exports.OPTIONAL_LIST_PRICES,
  ...module.exports.OPTIONAL_STRIPE_TUNING,
];
