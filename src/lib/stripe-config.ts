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

/**
 * Stripe Checkout `payment_method_types`. Default is `["card"]` only — some accounts do not have
 * Link enabled and Stripe rejects `link` with an invalid payment method error.
 * Set `STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES=card,link` (comma- or space-separated) to add Link, etc.
 */
export function stripeCheckoutPaymentMethodTypes(): string[] {
  const raw = process.env.STRIPE_CHECKOUT_PAYMENT_METHOD_TYPES?.trim();
  if (!raw) return ["card"];
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.length ? parts : ["card"];
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
