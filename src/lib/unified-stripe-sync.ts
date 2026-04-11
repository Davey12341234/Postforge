/**
 * Stripe → database sync (used by webhook and tests).
 * Keeps subscription rows, profile tier, invoices, and analytics in sync with Stripe events.
 */

import type { UnifiedSubscriptionTier } from "@prisma/client";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/unified-limits";
import {
  extractSubscriptionPriceId,
  resolvePlanFromStripePriceId,
} from "@/lib/unified-stripe-plan";

export function mapPlanToTier(plan: string): UnifiedSubscriptionTier {
  switch (plan.toLowerCase()) {
    case "pro":
      return "PRO";
    case "business":
      return "BUSINESS";
    case "enterprise":
      return "ENTERPRISE";
    default:
      return "FREE";
  }
}

export function applyPlanLimitsToSubscriptionData(plan: string) {
  const L = getPlanLimits(plan);
  return {
    monthlyCreditsLimit: L.credits < 0 ? 999999 : L.credits,
    aiGenerationsLimit: L.generations < 0 ? 999999 : L.generations,
    draftStorageLimit: L.drafts < 0 ? 999999 : L.drafts,
    teamMembersLimit: L.teamMembers < 0 ? 999999 : L.teamMembers,
  };
}

/** Sets unified credit pool to this plan’s monthly allowance (upgrade/downgrade / webhook). */
export async function refreshProfileCreditsForPlan(
  profileId: string,
  plan: string,
): Promise<void> {
  const L = getPlanLimits(plan);
  const pool = L.credits < 0 ? 999_999 : L.credits;
  await prisma.unifiedStudioProfile.update({
    where: { id: profileId },
    data: { unifiedCredits: pool },
  });
}

export async function processCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const profileId = session.metadata?.profileId;
  const plan = (session.metadata?.plan as string) || "pro";
  if (!profileId) return;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id;
  const subId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;

  const lim = applyPlanLimitsToSubscriptionData(plan);
  const priceId =
    typeof session.metadata?.priceId === "string"
      ? session.metadata.priceId
      : undefined;

  await prisma.unifiedSubscription.upsert({
    where: { profileId },
    create: {
      profileId,
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subId ?? undefined,
      stripePriceId: priceId,
      plan,
      status: "active",
      ...lim,
    },
    update: {
      stripeCustomerId: customerId ?? undefined,
      stripeSubscriptionId: subId ?? undefined,
      stripePriceId: priceId,
      plan,
      status: "active",
      ...lim,
    },
  });

  await prisma.unifiedStudioProfile.update({
    where: { id: profileId },
    data: { subscriptionTier: mapPlanToTier(plan) },
  });

  await refreshProfileCreditsForPlan(profileId, plan);

  await prisma.unifiedAnalyticsEvent.create({
    data: {
      profileId,
      eventName: "stripe_checkout_completed",
      properties: { plan, sessionId: session.id },
    },
  });
}

export async function processCustomerSubscriptionChange(
  sub: Stripe.Subscription,
): Promise<void> {
  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const row = await prisma.unifiedSubscription.findFirst({
    where: {
      OR: [
        { stripeSubscriptionId: sub.id },
        { stripeCustomerId: customerId },
      ],
    },
  });
  if (!row) return;

  const active = sub.status === "active" || sub.status === "trialing";
  const priceId = extractSubscriptionPriceId(sub);
  const resolvedFromStripe = resolvePlanFromStripePriceId(priceId);

  let plan: string;
  if (!active) {
    plan = "free";
  } else if (resolvedFromStripe) {
    plan = resolvedFromStripe;
  } else if (row.plan && row.plan !== "free") {
    plan = row.plan;
  } else {
    plan = "pro";
  }

  const lim = applyPlanLimitsToSubscriptionData(plan);
  const prevPlan = row.plan;

  await prisma.unifiedSubscription.update({
    where: { id: row.id },
    data: {
      stripeSubscriptionId: sub.id,
      stripePriceId: priceId ?? row.stripePriceId,
      plan,
      status: sub.status === "canceled" ? "canceled" : sub.status,
      ...lim,
      currentPeriodStart: sub.current_period_start
        ? new Date(sub.current_period_start * 1000)
        : null,
      currentPeriodEnd: sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : null,
      cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
      canceledAt: sub.status === "canceled" ? new Date() : null,
    },
  });

  if (!active) {
    await prisma.unifiedStudioProfile.update({
      where: { id: row.profileId },
      data: { subscriptionTier: "FREE" },
    });
    await refreshProfileCreditsForPlan(row.profileId, "free");
  } else {
    await prisma.unifiedStudioProfile.update({
      where: { id: row.profileId },
      data: { subscriptionTier: mapPlanToTier(plan) },
    });
    if (plan !== prevPlan) {
      await refreshProfileCreditsForPlan(row.profileId, plan);
    }
  }

  await prisma.unifiedAnalyticsEvent.create({
    data: {
      profileId: row.profileId,
      eventName: "stripe_subscription_updated",
      properties: {
        status: sub.status,
        subscriptionId: sub.id,
        plan,
        priceId: priceId ?? null,
      },
    },
  });
}

export async function processInvoicePaid(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const sub = await prisma.unifiedSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!sub) return;

  await prisma.unifiedInvoice.create({
    data: {
      profileId: sub.profileId,
      stripeInvoiceId: invoice.id,
      amountPaidCents: invoice.amount_paid ?? 0,
      amountDueCents: invoice.amount_due ?? 0,
      status: invoice.status ?? "unknown",
      invoicePdf: invoice.invoice_pdf ?? null,
      periodStart: invoice.period_start
        ? new Date(invoice.period_start * 1000)
        : new Date(),
      periodEnd: invoice.period_end
        ? new Date(invoice.period_end * 1000)
        : new Date(),
    },
  });

  await prisma.unifiedPayment.create({
    data: {
      profileId: sub.profileId,
      amountCents: invoice.amount_paid ?? 0,
      currency: invoice.currency ?? "usd",
      status: "SUCCEEDED",
      stripeInvoiceId: invoice.id,
      stripeCustomerId: customerId,
      description: `Invoice ${invoice.number ?? invoice.id}`,
      metadata: { invoiceId: invoice.id },
    },
  });

  // Renewals only — checkout.session.completed + first invoice already grant credits.
  const reason = invoice.billing_reason;
  if (reason === "subscription_cycle" && sub.plan && sub.plan !== "free") {
    await refreshProfileCreditsForPlan(sub.profileId, sub.plan);
  }
}

export async function processInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id;
  if (!customerId) return;

  const sub = await prisma.unifiedSubscription.findFirst({
    where: { stripeCustomerId: customerId },
  });
  if (!sub) return;

  await prisma.unifiedAnalyticsEvent.create({
    data: {
      profileId: sub.profileId,
      eventName: "payment_failed",
      properties: {
        invoiceId: invoice.id,
        attemptCount: invoice.attempt_count ?? 0,
      },
    },
  });
}
