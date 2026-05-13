import { NextResponse, type NextRequest } from "next/server";

import { findUserByEmail } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/email-normalize";
import { isEmailEligibleForMagicLink } from "@/lib/magic-link-policy";
import { signMagicLinkToken } from "@/lib/magic-link-token";
import { signPasswordResetToken } from "@/lib/password-reset-token";
import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import { requestAppOrigin } from "@/lib/request-origin";
import { sendMagicLinkEmail } from "@/lib/send-sign-in-email";
import { sendPasswordResetEmail } from "@/lib/send-password-reset-email";
import { getSessionSecret, isGateEnabled, isUserAuthEnabled } from "@/lib/server-config";

export const runtime = "nodejs";

const genericResponse = {
  ok: true,
  message: "If that address can receive sign-in links, you will get an email shortly.",
} as const;

const genericPasswordResetResponse = {
  ok: true,
  message: "If an account exists for that email, you will receive password reset instructions shortly.",
} as const;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: NextRequest) {
  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return NextResponse.json({ error: "Set BBGPT_SESSION_SECRET to use password recovery." }, { status: 500 });
  }

  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailRaw = String(body.email ?? "").trim();

  /** Per-user accounts: JWT reset link (email or console when Resend is off). */
  if (isUserAuthEnabled()) {
    if (!isPostgresPersistenceEnabled()) {
      return NextResponse.json({ error: "Postgres is required for password reset." }, { status: 503 });
    }

    const normalized = normalizeEmail(emailRaw);
    const user = normalized ? await findUserByEmail(normalized) : null;
    await sleep(user ? 80 : 120);

    if (!user || !normalized) {
      return NextResponse.json(genericPasswordResetResponse);
    }

    const origin = requestAppOrigin(req);
    const resetToken = await signPasswordResetToken(user.id, normalized);
    const resetUrl = `${origin}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const fromAddr = process.env.EMAIL_FROM?.trim();
    if (apiKey && fromAddr) {
      const sent = await sendPasswordResetEmail({ to: normalized, resetUrl });
      if (!sent.ok) {
        console.error("RESEND_FAILURE:", sent.error ?? "unknown (password reset)");
      }
    } else {
      console.error(
        "RESEND_FAILURE: RESEND_API_KEY or EMAIL_FROM missing — password reset email was not sent (check Vercel env).",
      );
      if (process.env.NODE_ENV !== "production") {
        console.info("[forgot-password] reset link (dev only, do not share):\n", resetUrl);
      }
    }

    return NextResponse.json(genericPasswordResetResponse);
  }

  /** Legacy: magic sign-in link (shared app password gate). */
  if (!isGateEnabled()) {
    return NextResponse.json(
      { error: "App gate is not enabled (set BBGPT_APP_PASSWORD or BBGPT_USER_AUTH with Postgres)." },
      { status: 400 },
    );
  }

  const eligible = await isEmailEligibleForMagicLink(emailRaw);
  await sleep(eligible ? 80 : 120);

  if (!eligible || !normalizeEmail(emailRaw)) {
    return NextResponse.json(genericResponse);
  }

  const normalized = normalizeEmail(emailRaw)!;
  const origin = requestAppOrigin(req);
  const mlToken = await signMagicLinkToken(normalized);
  const magicUrl = `${origin}/api/auth/magic?token=${encodeURIComponent(mlToken)}`;

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromAddr = process.env.EMAIL_FROM?.trim();
  if (apiKey && fromAddr) {
    const sent = await sendMagicLinkEmail({ to: normalized, magicUrl });
    if (!sent.ok) {
      console.error("RESEND_FAILURE:", sent.error ?? "unknown (magic link)");
    }
  } else if (process.env.NODE_ENV !== "production") {
    console.info("[forgot-password] Resend not configured — dev magic link:\n", magicUrl);
  }

  return NextResponse.json(genericResponse);
}
