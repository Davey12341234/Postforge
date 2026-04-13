import type { PlanId } from "@/lib/plans";

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

/** Stripe Price IDs (Dashboard → Products → Price ID) for subscription mode. */
export function stripePriceIdForPlan(planId: PlanId): string | null {
  const m: Record<PlanId, string | undefined> = {
    free: undefined,
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    team: process.env.STRIPE_PRICE_TEAM,
  };
  const v = m[planId]?.trim();
  return v || null;
}

export function planIdFromStripePriceId(priceId: string | null | undefined): PlanId | null {
  if (!priceId) return null;
  const pairs: [string | undefined, PlanId][] = [
    [process.env.STRIPE_PRICE_STARTER?.trim(), "starter"],
    [process.env.STRIPE_PRICE_PRO?.trim(), "pro"],
    [process.env.STRIPE_PRICE_TEAM?.trim(), "team"],
  ];
  for (const [pid, plan] of pairs) {
    if (pid && pid === priceId) return plan;
  }
  return null;
}
