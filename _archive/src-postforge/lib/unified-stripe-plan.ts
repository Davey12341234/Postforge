/**
 * Map Stripe Price IDs (from env) to internal plan keys. Used by webhooks so
 * subscription.updated reflects the actual purchased price, not a stale DB row.
 */

export type PaidPlanId = "pro" | "business" | "enterprise";

const PRICE_ENV_KEYS: Record<PaidPlanId, string> = {
  pro: "STRIPE_PRICE_PRO",
  business: "STRIPE_PRICE_BUSINESS",
  enterprise: "STRIPE_PRICE_ENTERPRISE",
};

export function resolvePlanFromStripePriceId(
  priceId: string | null | undefined,
): PaidPlanId | null {
  if (!priceId || typeof priceId !== "string") return null;
  const trimmed = priceId.trim();
  for (const plan of Object.keys(PRICE_ENV_KEYS) as PaidPlanId[]) {
    const env = process.env[PRICE_ENV_KEYS[plan]];
    if (env && env.trim() === trimmed) return plan;
  }
  return null;
}

/** First recurring line item on the subscription (Stripe API 2024+). */
export function extractSubscriptionPriceId(sub: {
  items?: { data?: Array<{ price?: string | { id?: string } | null }> };
}): string | undefined {
  const item = sub.items?.data?.[0];
  if (!item?.price) return undefined;
  if (typeof item.price === "string") return item.price;
  return item.price.id ?? undefined;
}
