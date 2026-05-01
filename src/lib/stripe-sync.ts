import type Stripe from "stripe";

import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import type { PlanId } from "@/lib/plans";
import { DEFAULT_PLAN } from "@/lib/plans";
import { readServerBilling, writeServerBilling, type ServerBillingRecord } from "@/lib/server-billing";
import { setServerPlan } from "@/lib/server-wallet";
import {
  dbReadBilling,
  dbSetPlan,
  dbWriteBilling,
  findClerkIdByStripeCustomerId,
} from "@/lib/site-wallet-store";
import { getDefaultWalletClerkId } from "@/lib/site-wallet-user";
import { planIdFromStripePriceId } from "@/lib/stripe-config";

function activeStatuses(): Set<string> {
  const grace = process.env.STRIPE_GRACE_PAST_DUE?.trim() === "1";
  return new Set(grace ? ["active", "trialing", "past_due"] : ["active", "trialing"]);
}

function resolvePlanFromSubscription(sub: Stripe.Subscription): PlanId {
  const priceId = sub.items.data[0]?.price?.id;
  return planIdFromStripePriceId(priceId) ?? DEFAULT_PLAN;
}

async function resolveClerkId(customerId: string | null | undefined): Promise<string> {
  if (!isPostgresPersistenceEnabled() || !customerId) {
    return getDefaultWalletClerkId();
  }
  return (await findClerkIdByStripeCustomerId(customerId)) ?? getDefaultWalletClerkId();
}

/**
 * Syncs wallet plan + billing snapshot from a Stripe Subscription object.
 */
export async function applyStripeSubscription(sub: Stripe.Subscription): Promise<PlanId> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  const priceId = sub.items.data[0]?.price?.id ?? null;

  const ACTIVE = activeStatuses();
  let planId: PlanId = DEFAULT_PLAN;
  if (ACTIVE.has(sub.status)) {
    planId = resolvePlanFromSubscription(sub);
  } else {
    planId = DEFAULT_PLAN;
  }

  if (!isPostgresPersistenceEnabled()) {
    const prev = await readServerBilling();
    const billing: ServerBillingRecord = {
      ...prev,
      customerId,
      subscriptionId: sub.id,
      status: sub.status,
      priceId,
    };
    await writeServerBilling(billing);
    await setServerPlan(planId);
    return planId;
  }

  const clerkId = await resolveClerkId(customerId);
  const prev = await dbReadBilling(clerkId);
  const billing: ServerBillingRecord = {
    ...prev,
    customerId,
    subscriptionId: sub.id,
    status: sub.status,
    priceId,
  };
  await dbWriteBilling(clerkId, billing);
  await dbSetPlan(clerkId, planId);
  return planId;
}

/**
 * Clears subscription to Free (e.g. canceled / unpaid).
 */
export async function clearStripeSubscriptionToFree(customerId?: string | null): Promise<void> {
  if (!isPostgresPersistenceEnabled()) {
    const prev = await readServerBilling();
    await writeServerBilling({
      ...prev,
      customerId: customerId ?? prev.customerId,
      subscriptionId: null,
      status: "canceled",
      priceId: null,
    });
    await setServerPlan(DEFAULT_PLAN);
    return;
  }

  const clerkId = await resolveClerkId(customerId ?? null);
  const prev = await dbReadBilling(clerkId);
  await dbWriteBilling(clerkId, {
    ...prev,
    customerId: customerId ?? prev.customerId,
    subscriptionId: null,
    status: "canceled",
    priceId: null,
  });
  await dbSetPlan(clerkId, DEFAULT_PLAN);
}
