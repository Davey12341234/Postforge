import type Stripe from "stripe";
import type { PlanId } from "@/lib/plans";
import { DEFAULT_PLAN } from "@/lib/plans";
import { setServerPlan } from "@/lib/server-wallet";
import { planIdFromStripePriceId } from "@/lib/stripe-config";
import { readServerBilling, writeServerBilling, type ServerBillingRecord } from "@/lib/server-billing";

function activeStatuses(): Set<string> {
  const grace = process.env.STRIPE_GRACE_PAST_DUE?.trim() === "1";
  return new Set(grace ? ["active", "trialing", "past_due"] : ["active", "trialing"]);
}

function resolvePlanFromSubscription(sub: Stripe.Subscription): PlanId {
  const priceId = sub.items.data[0]?.price?.id;
  return planIdFromStripePriceId(priceId) ?? DEFAULT_PLAN;
}

/**
 * Syncs wallet plan + billing snapshot from a Stripe Subscription object.
 */
export async function applyStripeSubscription(sub: Stripe.Subscription): Promise<PlanId> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const prev = await readServerBilling();
  const billing: ServerBillingRecord = {
    ...prev,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    priceId,
  };
  await writeServerBilling(billing);

  const ACTIVE = activeStatuses();
  let planId: PlanId = DEFAULT_PLAN;
  if (ACTIVE.has(sub.status)) {
    planId = resolvePlanFromSubscription(sub);
  } else {
    planId = DEFAULT_PLAN;
  }

  await setServerPlan(planId);
  return planId;
}

/**
 * Clears subscription to Free (e.g. canceled / unpaid).
 */
export async function clearStripeSubscriptionToFree(customerId?: string | null): Promise<void> {
  const prev = await readServerBilling();
  await writeServerBilling({
    ...prev,
    customerId: customerId ?? prev.customerId,
    subscriptionId: null,
    status: "canceled",
    priceId: null,
  });
  await setServerPlan(DEFAULT_PLAN);
}
