import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe-client";
import { getStripeWebhookSecret } from "@/lib/stripe-config";
import { clearPaymentAlert, recordPaymentFailure } from "@/lib/server-billing";
import { applyStripeSubscription, clearStripeSubscriptionToFree } from "@/lib/stripe-sync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const whsec = getStripeWebhookSecret();
  if (!whsec) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET is not set." }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  const raw = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          const sub = await stripe.subscriptions.retrieve(subId);
          applyStripeSubscription(sub);
          clearPaymentAlert();
        }
        break;
      }
      case "invoice.paid": {
        clearPaymentAlert();
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        applyStripeSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cid =
          typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);
        clearStripeSubscriptionToFree(cid);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId =
          subRef == null ? null : typeof subRef === "string" ? subRef : subRef.id;
        const customerId =
          typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
        console.warn("[stripe webhook] invoice.payment_failed", {
          invoiceId: inv.id,
          customerId,
          subscriptionId: subId,
          attemptCount: inv.attempt_count,
        });
        recordPaymentFailure({
          at: new Date().toISOString(),
          invoiceId: inv.id ?? null,
          attemptCount: inv.attempt_count ?? null,
        });
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          applyStripeSubscription(sub);
        }
        break;
      }
      default:
        break;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler error";
    console.error("[stripe webhook]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
