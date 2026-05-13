import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { completeBillingText } from "@/lib/billing-llm";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (isGateEnabled()) {
    const denied = await assertAuthorized(req);
    if (denied) {
      return denied;
    }
  }

  let body: { text?: string; targetLocale?: string };
  try {
    body = (await req.json()) as { text?: string; targetLocale?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = body.text?.trim();
  const targetLocale = body.targetLocale?.trim() || "Spanish";
  if (!text || text.length > 4000) {
    return NextResponse.json({ error: "text required (max 4000 chars)" }, { status: 400 });
  }

  const system = [
    `Translate the user's string to ${targetLocale} for a billing/subscription UI.`,
    "Keep product names: bbGPT, Stripe, OpenAI unchanged unless a locale convention requires transliteration.",
    "Output only the translation text — no quotes or preamble.",
  ].join(" ");

  const res = await completeBillingText({
    system,
    user: text,
  });

  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 503 });
  }
  return NextResponse.json({ translation: res.text });
}
