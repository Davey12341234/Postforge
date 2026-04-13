import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";
import { matchBillingFaq } from "@/lib/billing-faq";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isGateEnabled()) {
    const denied = await assertAuthorized(req);
    if (denied) {
      return denied;
    }
  }

  let body: { query?: string };
  try {
    body = (await req.json()) as { query?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const query = body.query?.trim();
  if (!query || query.length > 2000) {
    return NextResponse.json({ error: "query required (max 2000 chars)" }, { status: 400 });
  }

  const matches = matchBillingFaq(query, 5);
  if (matches.length === 0) {
    return NextResponse.json({
      answer:
        "No matching FAQ entry. Open Plans → Manage billing to use Stripe's Customer Portal (payment methods, invoices, cancellation), or contact the operator running this deployment.",
      sources: [] as string[],
    });
  }

  const faqBlock = matches.map((e) => `## ${e.title}\n${e.body}`).join("\n\n");
  const system = [
    "You help BabyGPT users with billing and subscription questions (Stripe, plans, credits, invoices, cancellation).",
    "Ground your answer in the FAQ excerpts below. Do not contradict them.",
    "If the excerpts do not fully answer the question, say what is known from them. For account-specific Stripe actions, suggest Manage billing in the app.",
    "Under 160 words. Plain language.",
    "",
    "FAQ EXCERPTS:",
    faqBlock,
  ].join("\n");

  const res = await completeBillingText({ system, user: query });
  if ("error" in res) {
    const fallback = matches.map((e) => `${e.title}: ${e.body}`).join("\n\n");
    return NextResponse.json({
      answer: fallback,
      sources: matches.map((e) => e.id),
      degraded: true,
    });
  }

  return NextResponse.json({
    answer: res.text,
    sources: matches.map((e) => e.id),
  });
}
