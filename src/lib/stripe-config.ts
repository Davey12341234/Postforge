import type { PlanBillingCadence, PlanId } from "@/lib/plans";
import { isStripeSecretApiKey } from "@/lib/stripe-secret-valid";

export function isStripeConfigured(): boolean {
  return isStripeSecretApiKey(process.env.STRIPE_SECRET_KEY);
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim() || undefined;
}

/** Stripe Price IDs (Dashboard → Products → Price ID) for subscription Checkout. */
export function stripePriceIdForPlan(planId: PlanId, cadence: PlanBillingCadence = "monthly"): string | null {
  if (planId === "free") return null;

  if (cadence === "annual") {
    const m: Record<Exclude<PlanId, "free">, string | undefined> = {
      starter: process.env.STRIPE_PRICE_STARTER_YEARLY,
      pro: process.env.STRIPE_PRICE_PRO_YEARLY,
      team: process.env.STRIPE_PRICE_TEAM_YEARLY,
    };
    const v = m[planId]?.trim();
    return v || null;
  }

  const m: Record<Exclude<PlanId, "free">, string | undefined> = {
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
    [process.env.STRIPE_PRICE_STARTER_YEARLY?.trim(), "starter"],
    [process.env.STRIPE_PRICE_PRO_YEARLY?.trim(), "pro"],
    [process.env.STRIPE_PRICE_TEAM_YEARLY?.trim(), "team"],
  ];
  for (const [pid, plan] of pairs) {
    if (pid && pid === priceId) return plan;
  }
  return null;
}
