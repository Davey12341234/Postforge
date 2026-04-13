import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerBilling } from "@/lib/server-billing";
import { requestAppOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured, stripePriceIdForPlan } from "@/lib/stripe-config";
import type { PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json(
      { error: "Paid checkout requires the app gate (set BABYGPT_APP_PASSWORD)." },
      { status: 400 },
    );
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { planId?: PlanId };
  try {
    body = (await req.json()) as { planId?: PlanId };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId;
  if (!planId || planId === "free") {
    return NextResponse.json(
      {
        error:
          "Choose Starter, Pro, or Team. To cancel or downgrade to Free, use Manage billing (Stripe Customer Portal).",
      },
      { status: 400 },
    );
  }

  const priceId = stripePriceIdForPlan(planId);
  if (!priceId) {
    const envName =
      planId === "starter"
        ? "STRIPE_PRICE_STARTER"
        : planId === "pro"
          ? "STRIPE_PRICE_PRO"
          : planId === "team"
            ? "STRIPE_PRICE_TEAM"
            : "STRIPE_PRICE_*";
    return NextResponse.json(
      {
        error: `Missing Stripe Price for ${planId}. Set ${envName} to the Price ID from the Stripe Dashboard.`,
      },
      { status: 500 },
    );
  }

  const origin = requestAppOrigin(req);
  const billing = readServerBilling();

  const stripe = getStripe();
  const autoTax = process.env.STRIPE_CHECKOUT_AUTO_TAX?.trim() === "1";
  const trialDaysRaw = process.env.STRIPE_CHECKOUT_TRIAL_DAYS?.trim();
  const trialDays = trialDaysRaw ? Math.min(90, Math.max(0, Number.parseInt(trialDaysRaw, 10))) : 0;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billing.customerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=canceled`,
    metadata: { planId },
    subscription_data: {
      metadata: { planId },
      ...(trialDays > 0 && !Number.isNaN(trialDays) ? { trial_period_days: trialDays } : {}),
    },
    allow_promotion_codes: true,
    payment_method_types: ["card", "link"],
    ...(autoTax
      ? {
          automatic_tax: { enabled: true },
          customer_update: { address: "auto", name: "auto" },
        }
      : {}),
    custom_text: {
      submit: {
        message:
          "Recurring billing. You can update payment methods, invoices, and cancellation in Manage billing after checkout.",
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe did not return a checkout URL." }, { status: 502 });
  }

  return NextResponse.json({ url: session.url });
}
