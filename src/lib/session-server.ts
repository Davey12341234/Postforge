import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { getApiSecret, getSessionSecret, isGateEnabled } from "@/lib/server-config";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * True when gate is off, or JWT cookie is valid, or Authorization Bearer matches BABYGPT_API_SECRET.
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

  const token = (await cookies()).get("babygpt_token")?.value;
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
