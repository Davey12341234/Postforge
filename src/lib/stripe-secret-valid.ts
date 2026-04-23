/**
 * Stripe Secret API key shape check (matches scripts/stripe-secret-valid.cjs success path).
 */
export function isStripeSecretApiKey(raw: string | undefined | null): boolean {
  const s = String(raw ?? "").trim();
  return /^sk_(test|live)_/.test(s) && s.length >= 60;
}
