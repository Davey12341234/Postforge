/**
 * Stripe Secret API key shape check (keep in sync with scripts/stripe-secret-valid.cjs).
 * Vercel / .env often paste values with wrapping quotes — normalize before validating.
 */
export function normalizeStripeSecretKey(raw: string | undefined | null): string {
  let s = String(raw ?? "").trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function isStripeSecretApiKey(raw: string | undefined | null): boolean {
  const s = normalizeStripeSecretKey(raw);
  if (!s) return false;
  if (s.startsWith("pk_") || s.startsWith("mk_")) return false;
  if (s.startsWith("rk_")) return false;
  return /^sk_(test|live)_/.test(s) && s.length >= 60;
}
