/**
 * Shared key lists for billing / gate / Stripe (no values).
 * Used by check-billing-env.cjs and finish-billing-setup.cjs
 */

module.exports.REQUIRED_FOR_CHECKOUT = [
  { group: "Gate", key: "BBGPT_APP_PASSWORD", note: "Shared login password (legacy: BABYGPT_APP_PASSWORD)" },
  { group: "Gate", key: "BBGPT_SESSION_SECRET", note: "Long random string for JWT cookies (legacy: BABYGPT_SESSION_SECRET)" },
  { group: "Stripe", key: "STRIPE_SECRET_KEY", note: "sk_live_... or sk_test_..." },
  { group: "Stripe", key: "STRIPE_WEBHOOK_SECRET", note: "whsec_... from Dashboard → Webhooks" },
  { group: "Stripe", key: "STRIPE_PRICE_STARTER", note: "price_... recurring monthly" },
  { group: "Stripe", key: "STRIPE_PRICE_PRO", note: "price_..." },
  { group: "Stripe", key: "STRIPE_PRICE_TEAM", note: "price_..." },
  { group: "Public URL", key: "NEXT_PUBLIC_APP_URL", note: "https://your-app.vercel.app (no trailing slash)" },
];

module.exports.OPTIONAL_LIST_PRICES = [
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_STARTER_USD", note: "e.g. 12" },
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_PRO_USD", note: "e.g. 24" },
  { group: "List prices (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_TEAM_USD", note: "e.g. 69" },
  { group: "List prices annual (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD", note: "e.g. 120" },
  { group: "List prices annual (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD", note: "e.g. 240" },
  { group: "List prices annual (modal)", key: "NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD", note: "e.g. 690" },
];

module.exports.OPTIONAL_STRIPE_YEARLY_PRICE_IDS = [
  { group: "Stripe yearly checkout", key: "STRIPE_PRICE_STARTER_YEARLY", note: "price_... recurring yearly" },
  { group: "Stripe yearly checkout", key: "STRIPE_PRICE_PRO_YEARLY", note: "price_..." },
  { group: "Stripe yearly checkout", key: "STRIPE_PRICE_TEAM_YEARLY", note: "price_..." },
];

module.exports.OPTIONAL_STRIPE_TUNING = [
  { group: "Stripe tuning", key: "STRIPE_CHECKOUT_AUTO_TAX", note: "1 = enable automatic tax (configure Tax in Dashboard first)" },
  { group: "Stripe tuning", key: "STRIPE_CHECKOUT_TRIAL_DAYS", note: "Optional trial length 0–90" },
  { group: "Stripe tuning", key: "STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES", note: "e.g. card — add link only if Link enabled in Stripe Dashboard (card,link)" },
  { group: "Stripe tuning", key: "STRIPE_GRACE_PAST_DUE", note: "1 = treat past_due like paid for plan access (grace)" },
  { group: "Stripe tuning", key: "STRIPE_PORTAL_CONFIGURATION", note: "bpc_... Customer Portal configuration id" },
];

/** Multimodal attachments + POST /api/gemini/image (server-side; not NEXT_PUBLIC). */
module.exports.OPTIONAL_GEMINI = [
  { group: "Gemini", key: "GEMINI_API_KEY", note: "Google AI Studio — required for file attachments + Create image" },
  { group: "Gemini", key: "GEMINI_CHAT_MODEL", note: "optional override; default gemini-2.5-flash" },
  {
    group: "Gemini",
    key: "GEMINI_IMAGE_MODEL",
    note: "optional override; native image model e.g. gemini-3.1-flash-image-preview",
  },
];

module.exports.OPTIONAL_EMAIL_RESEND = [
  { group: "Email (Resend)", key: "RESEND_API_KEY", note: "Password reset / magic links (server)" },
  { group: "Email (Resend)", key: "EMAIL_FROM", note: "Verified sender (e.g. onboarding@resend.dev)" },
];

module.exports.OPTIONAL_AUTH_FLAGS = [
  { group: "Auth", key: "BBGPT_USER_AUTH", note: "1 = email/password accounts + Postgres wallets" },
  { group: "Auth", key: "NEXT_PUBLIC_BBGPT_USER_AUTH", note: "1 = register/login UI (build-time)" },
];

module.exports.ALL_ROWS = [
  ...module.exports.REQUIRED_FOR_CHECKOUT,
  ...module.exports.OPTIONAL_LIST_PRICES,
  ...module.exports.OPTIONAL_STRIPE_YEARLY_PRICE_IDS,
  ...module.exports.OPTIONAL_STRIPE_TUNING,
  ...module.exports.OPTIONAL_GEMINI,
  ...module.exports.OPTIONAL_EMAIL_RESEND,
  ...module.exports.OPTIONAL_AUTH_FLAGS,
];
