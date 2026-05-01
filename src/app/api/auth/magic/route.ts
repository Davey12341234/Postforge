import { NextResponse, type NextRequest } from "next/server";

import { findUserByEmail } from "@/lib/auth-users";
import { SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { verifyMagicLinkToken } from "@/lib/magic-link-token";
import { createSessionJwt } from "@/lib/session-token";
import { getSessionSecret, isGateEnabled, isUserAuthEnabled } from "@/lib/server-config";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.redirect(new URL("/login?magic=off", req.url));
  }

  const sessionSecret = getSessionSecret();
  if (!sessionSecret) {
    return NextResponse.redirect(new URL("/login?magic=config", req.url));
  }

  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect(new URL("/login?magic=missing", req.url));
  }

  let emailFromToken: string;
  try {
    const p = await verifyMagicLinkToken(token);
    emailFromToken = p.email;
  } catch {
    return NextResponse.redirect(new URL("/login?magic=invalid", req.url));
  }

  let sessionToken: string;
  if (isUserAuthEnabled()) {
    const user = await findUserByEmail(emailFromToken);
    if (!user) {
      return NextResponse.redirect(new URL("/login?magic=invalid", req.url));
    }
    sessionToken = await createSessionJwt(user.id, { email: user.email });
  } else {
    sessionToken = await createSessionJwt("default");
  }

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
