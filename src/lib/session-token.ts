import { SignJWT } from "jose";

import { getSessionSecret } from "@/lib/server-config";

/** Standard session JWT for gate + APIs (legacy `sub: default` or user UUID). */
export async function createSessionJwt(sub: string, claims?: { email?: string }): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("BBGPT_SESSION_SECRET is not set.");

  const key = new TextEncoder().encode(secret);
  const jwt = new SignJWT({
    sub,
    ...(claims?.email ? { email: claims.email } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d");

  return jwt.sign(key);
}
