import { SignJWT, jwtVerify } from "jose";

import { getSessionSecret } from "@/lib/server-config";

const PURPOSE = "magic_login";

export async function signMagicLinkToken(emailNormalized: string): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("BBGPT_SESSION_SECRET is not set.");
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ purpose: PURPOSE, sub: "default", email: emailNormalized })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .sign(key);
}

export async function verifyMagicLinkToken(token: string): Promise<{ email: string }> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("BBGPT_SESSION_SECRET is not set.");
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  if (payload.purpose !== PURPOSE || typeof payload.email !== "string") {
    throw new Error("Invalid magic link token.");
  }
  return { email: payload.email };
}
