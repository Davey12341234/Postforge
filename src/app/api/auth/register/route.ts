import { NextResponse, type NextRequest } from "next/server";

import { registerUser } from "@/lib/auth-users";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import { createSessionJwt } from "@/lib/session-token";
import { getSessionSecret, isUserAuthEnabled } from "@/lib/server-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!isUserAuthEnabled()) {
    return NextResponse.json({ error: "User registration is disabled (set BBGPT_USER_AUTH=1)." }, { status: 403 });
  }
  if (!isPostgresPersistenceEnabled()) {
    return NextResponse.json(
      { error: "Postgres (DATABASE_URL) is required for account registration." },
      { status: 503 },
    );
  }
  const secret = getSessionSecret();
  if (!secret) {
    return NextResponse.json({ error: "BBGPT_SESSION_SECRET is not set." }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await req.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const result = await registerUser(email, password);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const token = await createSessionJwt(result.user.id, { email: result.user.email });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
