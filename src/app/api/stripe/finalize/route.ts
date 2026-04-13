import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { getStripe } from "@/lib/stripe-client";
import { isStripeConfigured } from "@/lib/stripe-config";
import { applyStripeSubscription } from "@/lib/stripe-sync";

export const runtime = "nodejs";

/** Idempotent sync after redirect (webhook may have already run). */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Gate not enabled." }, { status: 400 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { sessionId?: string };
  try {
    body = (await req.json()) as { sessionId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });

  if (session.status !== "complete") {
    return NextResponse.json({ error: "Checkout session not complete." }, { status: 400 });
  }

  const subRaw = session.subscription;
  if (!subRaw) {
    return NextResponse.json({ error: "No subscription on session." }, { status: 400 });
  }

  const subId = typeof subRaw === "string" ? subRaw : subRaw.id;
  const sub = await stripe.subscriptions.retrieve(subId);
  applyStripeSubscription(sub);

  return NextResponse.json({ ok: true });
}
