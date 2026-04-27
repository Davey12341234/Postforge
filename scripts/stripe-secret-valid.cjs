/**
 * Shared Stripe Secret key validation for Node scripts (bootstrap, finish:billing).
 * App runtime uses the same rules in src/lib/stripe-secret-valid.ts (keep in sync).
 */

/** Strip one pair of surrounding quotes (common Vercel / .env paste mistake). */
function normalizeStripeSecretKey(raw) {
  let s = String(raw || "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

/** @returns {{ ok: true } | { ok: false; reason: string }} */
function validateStripeSecretKey(raw) {
  const s = normalizeStripeSecretKey(raw);
  if (!s) return { ok: false, reason: "STRIPE_SECRET_KEY is empty." };
  if (s.startsWith("pk_")) {
    return {
      ok: false,
      reason:
        "Value starts with pk_ — that is the Publishable key. Use the Secret key (Developers → API keys → Reveal test/live secret key). It must start with sk_test_ or sk_live_.",
    };
  }
  if (s.startsWith("mk_")) {
    return {
      ok: false,
      reason:
        "Value starts with mk_ — that is not the Stripe Secret API key. Copy the Secret key from Developers → API keys (long string starting with sk_test_ or sk_live_, usually 100+ characters).",
    };
  }
  if (s.startsWith("rk_")) {
    return {
      ok: false,
      reason:
        "Restricted keys (rk_...) often cannot create Products/Prices. Use the standard Secret key (sk_test_... or sk_live_...) for bootstrap scripts.",
    };
  }
  if (!/^sk_(test|live)_/.test(s)) {
    return {
      ok: false,
      reason: `Unexpected prefix (${JSON.stringify(s.slice(0, 14))}...). Stripe secret keys start with sk_test_ or sk_live_.`,
    };
  }
  if (s.length < 60) {
    return {
      ok: false,
      reason: `Secret key looks too short (length ${s.length}). Full keys are usually ~100 characters — wrong field or truncated paste.`,
    };
  }
  return { ok: true };
}

function isStripeSecretApiKey(raw) {
  return validateStripeSecretKey(raw).ok;
}

module.exports = { validateStripeSecretKey, isStripeSecretApiKey };
