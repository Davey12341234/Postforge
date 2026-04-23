import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe-client";
import {
  clearPaymentAlertForStripeCustomer,
  recordPaymentFailureForStripeCustomer,
} from "@/lib/server-billing";
import { getStripeWebhookSecret } from "@/lib/stripe-config";
import { applyStripeSubscription, clearStripeSubscriptionToFree } from "@/lib/stripe-sync";

export const runtime = "nodejs";

function stripeCustomerId(
  customer: Stripe.Checkout.Session["customer"] | Stripe.Subscription["customer"] | Stripe.Invoice["customer"],
): string | null {
  if (customer == null) return null;
  return typeof customer === "string" ? customer : customer.id;
}

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
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Invalid signature";
    console.error("[stripe webhook] constructEvent failed:", msg);
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
          await applyStripeSubscription(sub);
          await clearPaymentAlertForStripeCustomer(stripeCustomerId(session.customer));
        }
        break;
      }
      case "invoice.paid": {
        const inv = event.data.object as Stripe.Invoice;
        await clearPaymentAlertForStripeCustomer(stripeCustomerId(inv.customer));
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await applyStripeSubscription(sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const cid =
          typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null);
        await clearStripeSubscriptionToFree(cid);
        break;
      }
      case "invoice.payment_failed": {
        const inv = event.data.object as Stripe.Invoice;
        const subRef = inv.subscription;
        const subId =
          subRef == null ? null : typeof subRef === "string" ? subRef : subRef.id;
        const customerId = stripeCustomerId(inv.customer);
        console.warn("[stripe webhook] invoice.payment_failed", {
          invoiceId: inv.id,
          customerId,
          subscriptionId: subId,
          attemptCount: inv.attempt_count,
        });
        await recordPaymentFailureForStripeCustomer(customerId, {
          at: new Date().toISOString(),
          invoiceId: inv.id ?? null,
          attemptCount: inv.attempt_count ?? null,
        });
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          await applyStripeSubscription(sub);
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
