import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import type { UnifiedSubscriptionTier } from "@prisma/client";
import { getPlanLimits } from "@/lib/unified-limits";

export const runtime = "nodejs";

function mapPlanToTier(plan: string): UnifiedSubscriptionTier {
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

function applyPlanLimitsToSubscriptionData(plan: string) {
  const L = getPlanLimits(plan);
  return {
    monthlyCreditsLimit: L.credits < 0 ? 999999 : L.credits,
    aiGenerationsLimit: L.generations < 0 ? 999999 : L.generations,
    draftStorageLimit: L.drafts < 0 ? 999999 : L.drafts,
    teamMembersLimit: L.teamMembers < 0 ? 999999 : L.teamMembers,
  };
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json(
      { error: "Stripe webhook not configured" },
      { status: 500 },
    );
  }

  const rawBody = await req.text();
  const sig = (await headers()).get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(key);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, secret);
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const profileId = session.metadata?.profileId;
        const plan = (session.metadata?.plan as string) || "pro";
        if (!profileId) break;

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

        await prisma.unifiedAnalyticsEvent.create({
          data: {
            profileId,
            eventName: "stripe_checkout_completed",
            properties: { plan, sessionId: session.id },
          },
        });
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
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
        if (!row) break;

        const active = sub.status === "active" || sub.status === "trialing";
        const plan =
          row.plan ||
          (active ? "pro" : "free");

        await prisma.unifiedSubscription.update({
          where: { id: row.id },
          data: {
            stripeSubscriptionId: sub.id,
            status: sub.status === "canceled" ? "canceled" : sub.status,
            currentPeriodStart: sub.current_period_start
              ? new Date(sub.current_period_start * 1000)
              : null,
            currentPeriodEnd: sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : null,
            cancelAtPeriodEnd: sub.cancel_at_period_end ?? false,
            canceledAt:
              sub.status === "canceled" ? new Date() : null,
          },
        });

        if (!active) {
          await prisma.unifiedStudioProfile.update({
            where: { id: row.profileId },
            data: { subscriptionTier: "FREE" },
          });
        } else {
          await prisma.unifiedStudioProfile.update({
            where: { id: row.profileId },
            data: { subscriptionTier: mapPlanToTier(plan) },
          });
        }

        await prisma.unifiedAnalyticsEvent.create({
          data: {
            profileId: row.profileId,
            eventName: "stripe_subscription_updated",
            properties: {
              status: sub.status,
              subscriptionId: sub.id,
            },
          },
        });
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (e: unknown) {
    console.error("Stripe webhook handler error:", e);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
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
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
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
