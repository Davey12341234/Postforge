import { jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getApiSecret, getSessionSecret, isGateEnabled } from "@/lib/server-config";

export async function middleware(request: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/login") {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  // Stripe Checkout/Portal/Finalize require the same session as the rest of the app.
  // Only the webhook is verified via Stripe-Signature (no browser cookie).
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
      return NextResponse.json(
        { error: "Server misconfigured: set BABYGPT_SESSION_SECRET when BABYGPT_APP_PASSWORD is set." },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const token = request.cookies.get("babygpt_token")?.value;
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
    "/((?!_next/static|_next/image|favicon.ico|babygpt-logo.png|.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif)$).*)",
  ],
};
