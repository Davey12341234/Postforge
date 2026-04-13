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
 * Syncs wallet plan + `.data/billing.json` from a Stripe Subscription object.
 */
export function applyStripeSubscription(sub: Stripe.Subscription): PlanId {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const priceId = sub.items.data[0]?.price?.id ?? null;
  const prev = readServerBilling();
  const billing: ServerBillingRecord = {
    ...prev,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    priceId,
  };
  writeServerBilling(billing);

  const ACTIVE = activeStatuses();
  let planId: PlanId = DEFAULT_PLAN;
  if (ACTIVE.has(sub.status)) {
    planId = resolvePlanFromSubscription(sub);
  } else {
    planId = DEFAULT_PLAN;
  }

  setServerPlan(planId);
  return planId;
}

/**
 * Clears subscription to Free (e.g. canceled / unpaid).
 */
export function clearStripeSubscriptionToFree(customerId?: string | null): void {
  const prev = readServerBilling();
  writeServerBilling({
    ...prev,
    customerId: customerId ?? prev.customerId,
    subscriptionId: null,
    status: "canceled",
    priceId: null,
  });
  setServerPlan(DEFAULT_PLAN);
}
