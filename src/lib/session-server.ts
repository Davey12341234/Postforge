import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { jwtVerify } from "jose";
import { getApiSecret, getSessionSecret, isGateEnabled } from "@/lib/server-config";
import { getDefaultWalletClerkId } from "@/lib/site-wallet-user";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * True when gate is off, or JWT cookie is valid, or Authorization Bearer matches BBGPT_API_SECRET (legacy BABYGPT_*).
 */
export async function isRequestAuthorized(request: NextRequest): Promise<boolean> {
  if (!isGateEnabled()) {
    return true;
  }

  const apiSecret = getApiSecret();
  const auth = request.headers.get("authorization");
  if (apiSecret && auth === `Bearer ${apiSecret}`) {
    return true;
  }

  const secret = getSessionSecret();
  if (!secret) {
    return false;
  }

  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return false;
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

/**
 * Wallet row key from JWT `sub` (user UUID, or legacy `"default"`).
 * Falls back to `BBGPT_WALLET_USER_ID` / `default` when token missing or invalid.
 */
export async function getWalletClerkIdFromRequest(request: NextRequest): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) {
    return getDefaultWalletClerkId();
  }

  const token =
    request.cookies.get(SESSION_COOKIE_NAME)?.value ??
    request.cookies.get(LEGACY_SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return getDefaultWalletClerkId();
  }

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    if (typeof payload.sub === "string" && payload.sub.length > 0) {
      return payload.sub;
    }
  } catch {
    /* invalid */
  }
  return getDefaultWalletClerkId();
}

/** `null` means OK to proceed. */
export async function assertAuthorized(request: NextRequest): Promise<NextResponse | null> {
  const ok = await isRequestAuthorized(request);
  if (ok) {
    return null;
  }
  return NextResponse.json(
    { error: "Unauthorized — sign in or send Authorization: Bearer (API secret)." },
    { status: 401 },
  );
}
