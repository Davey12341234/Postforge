import { NextResponse, type NextRequest } from "next/server";

import { findUserById, updateUserPasswordHash } from "@/lib/auth-users";
import { normalizeEmail } from "@/lib/email-normalize";
import { hashPassword } from "@/lib/password";
import { verifyPasswordResetToken } from "@/lib/password-reset-token";
import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import { getSessionSecret, isUserAuthEnabled } from "@/lib/server-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isUserAuthEnabled()) {
    return NextResponse.json({ error: "Password reset is only available when BBGPT_USER_AUTH=1." }, { status: 403 });
  }
  if (!isPostgresPersistenceEnabled()) {
    return NextResponse.json({ error: "Postgres is required for password reset." }, { status: 503 });
  }
  if (!getSessionSecret()) {
    return NextResponse.json({ error: "BBGPT_SESSION_SECRET is not set." }, { status: 500 });
  }

  let body: { token?: string; password?: string };
  try {
    body = (await req.json()) as { token?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = String(body.token ?? "").trim();
  const password = String(body.password ?? "");
  if (!token) {
    return NextResponse.json({ error: "Reset token is required." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  let userId: string;
  let email: string;
  try {
    const p = await verifyPasswordResetToken(token);
    userId = p.userId;
    email = p.email;
  } catch {
    return NextResponse.json({ error: "Invalid or expired reset link. Request a new one from the login page." }, { status: 400 });
  }

  const user = await findUserById(userId);
  if (!user || normalizeEmail(user.email) !== normalizeEmail(email)) {
    return NextResponse.json({ error: "Invalid or expired reset link." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const ok = await updateUserPasswordHash(userId, passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Could not update password." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Password updated. You can sign in now." });
}
