/**
 * Fallback wallet row id when no JWT / non-request context (Stripe webhooks, file-backed mode).
 * Override with `BBGPT_WALLET_USER_ID`. Registered users use their UUID as `clerk_id`.
 */
export function getDefaultWalletClerkId(): string {
  return process.env.BBGPT_WALLET_USER_ID?.trim() || "default";
}

/** @deprecated use getDefaultWalletClerkId */
export function getSiteWalletUserId(): string {
  return getDefaultWalletClerkId();
}
