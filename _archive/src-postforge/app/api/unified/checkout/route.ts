import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Stripe from "stripe";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

const bodySchema = z.object({
  planId: z.enum(["pro", "business", "enterprise"]),
  mode: z.enum(["subscription", "payment"]).default("subscription"),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const secret = process.env.STRIPE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json(
        { error: "STRIPE_SECRET_KEY is not configured" },
        { status: 500 },
      );
    }

    const json: unknown = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { planId, mode } = parsed.data;
    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const existing = await prisma.unifiedSubscription.findUnique({
      where: { profileId: profile.id },
    });
    if (
      existing &&
      existing.plan === planId &&
      existing.status === "active"
    ) {
      return NextResponse.json(
        { error: "Already subscribed to this plan" },
        { status: 409 },
      );
    }

    const priceMap: Record<string, string | undefined> = {
      pro: process.env.STRIPE_PRICE_PRO,
      business: process.env.STRIPE_PRICE_BUSINESS,
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
    };

    const stripePriceId = priceMap[planId];
    if (!stripePriceId) {
      console.error(`No Stripe price configured for plan: ${planId}`);
      return NextResponse.json(
        { error: "Plan not configured. Set STRIPE_PRICE_* env vars." },
        { status: 500 },
      );
    }

    const stripe = new Stripe(secret);
    let stripeCustomerId = existing?.stripeCustomerId ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        metadata: {
          userId: session.user.id,
          profileId: profile.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    const baseUrl = (
      process.env.NEXTAUTH_URL ?? "http://localhost:3000"
    ).replace(/\/$/, "");

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode,
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${baseUrl}/unified?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/unified/pricing?canceled=1`,
      metadata: {
        userId: session.user.id,
        profileId: profile.id,
        plan: planId,
        priceId: stripePriceId,
      },
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout";
    console.error("Checkout error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
