import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";
import { readServerBilling } from "@/lib/server-billing";
import { buildStripeBillingFacts } from "@/lib/stripe-billing-context";
import { isStripeConfigured } from "@/lib/stripe-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json({ error: "Billing assistant requires the app gate." }, { status: 400 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 503 });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  let body: { question?: string };
  try {
    body = (await req.json()) as { question?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question || question.length > 2000) {
    return NextResponse.json({ error: "question required (max 2000 chars)" }, { status: 400 });
  }

  const billing = await readServerBilling(req);
  const { facts, error } = await buildStripeBillingFacts(billing);
  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  const system = [
    "You are bbGPT's billing helper.",
    "Answer ONLY using the FACTS block below plus general knowledge of how Stripe subscriptions and the Customer Portal work.",
    "Never invent invoice amounts, dates, or card details. If FACTS are insufficient, tell the user to open Plans → Manage billing (Stripe Customer Portal).",
    "Keep answers under 180 words, plain language.",
    "",
    "FACTS:",
    facts || "(none)",
  ].join("\n");

  const res = await completeBillingText({ system, user: question });
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 503 });
  }
  return NextResponse.json({ answer: res.text });
}
