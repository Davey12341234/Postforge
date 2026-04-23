import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerBilling } from "@/lib/server-billing";
import { requestAppOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured, stripePriceIdForPlan } from "@/lib/stripe-config";
import type { PlanBillingCadence, PlanId } from "@/lib/plans";

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

  let body: { planId?: PlanId; billing?: PlanBillingCadence };
  try {
    body = (await req.json()) as { planId?: PlanId; billing?: PlanBillingCadence };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId;
  const cadence: PlanBillingCadence = body.billing === "annual" ? "annual" : "monthly";
  if (!planId || planId === "free") {
    return NextResponse.json(
      {
        error:
          "Choose Starter, Pro, or Team. To cancel or downgrade to Free, use Manage billing (Stripe Customer Portal).",
      },
      { status: 400 },
    );
  }

  const priceId = stripePriceIdForPlan(planId, cadence);
  if (!priceId) {
    const envName =
      cadence === "annual"
        ? planId === "starter"
          ? "STRIPE_PRICE_STARTER_YEARLY"
          : planId === "pro"
            ? "STRIPE_PRICE_PRO_YEARLY"
            : planId === "team"
              ? "STRIPE_PRICE_TEAM_YEARLY"
              : "STRIPE_PRICE_*_YEARLY"
        : planId === "starter"
          ? "STRIPE_PRICE_STARTER"
          : planId === "pro"
            ? "STRIPE_PRICE_PRO"
            : planId === "team"
              ? "STRIPE_PRICE_TEAM"
              : "STRIPE_PRICE_*";
    return NextResponse.json(
      {
        error: `Missing Stripe Price for ${planId} (${cadence}). Set ${envName} to the recurring Price ID from the Stripe Dashboard.`,
      },
      { status: 500 },
    );
  }

  const origin = requestAppOrigin(req);
  const billingRecord = await readServerBilling();

  const stripe = getStripe();
  const autoTax = process.env.STRIPE_CHECKOUT_AUTO_TAX?.trim() === "1";
  const trialDaysRaw = process.env.STRIPE_CHECKOUT_TRIAL_DAYS?.trim();
  const trialDays = trialDaysRaw ? Math.min(90, Math.max(0, Number.parseInt(trialDaysRaw, 10))) : 0;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: billingRecord.customerId ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?checkout=canceled`,
    metadata: { planId, billingCadence: cadence },
    subscription_data: {
      metadata: { planId, billingCadence: cadence },
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
