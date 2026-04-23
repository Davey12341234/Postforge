import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { readServerBilling } from "@/lib/server-billing";
import { requestAppOrigin } from "@/lib/request-origin";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  void req;
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured (STRIPE_SECRET_KEY)." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Billing portal requires the app gate (BABYGPT_APP_PASSWORD)." }, { status: 400 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  const billing = await readServerBilling();
  if (!billing.customerId) {
    return NextResponse.json(
      { error: "No Stripe customer yet. Subscribe to a paid plan first (Checkout)." },
      { status: 400 },
    );
  }

  const origin = requestAppOrigin(req);
  const stripe = getStripe();
  const portalConfig = process.env.STRIPE_PORTAL_CONFIGURATION?.trim();
  const session = await stripe.billingPortal.sessions.create({
    customer: billing.customerId,
    return_url: `${origin}/`,
    ...(portalConfig ? { configuration: portalConfig } : {}),
  });

  return NextResponse.json({ url: session.url });
}
