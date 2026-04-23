import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSecret, getSessionSecret, isGateEnabled, isUserAuthEnabled } from "@/lib/server-config";

export async function middleware(request: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/login" || pathname === "/register") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  if (pathname === "/api/stripe/webhook" || pathname.startsWith("/api/stripe/webhook/")) {
    return NextResponse.next();
  }

  const apiSecret = getApiSecret();
  const auth = request.headers.get("authorization");
  if (apiSecret && auth === `Bearer ${apiSecret}`) {
    return NextResponse.next();
  }

  const secret = getSessionSecret();
  if (!secret) {
    if (pathname.startsWith("/api")) {
      const hint = isUserAuthEnabled()
        ? "Set BBGPT_SESSION_SECRET when the gate is enabled."
        : "Set BBGPT_SESSION_SECRET when BBGPT_APP_PASSWORD (or BBGPT_USER_AUTH) is set.";
      return NextResponse.json({ error: `Server misconfigured: ${hint}` }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|bbgpt-logo.png|babygpt-logo.png|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif)$).*)",
  ],
};
