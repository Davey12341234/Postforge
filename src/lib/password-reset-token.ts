import { SignJWT, jwtVerify } from "jose";

import { getSessionSecret } from "@/lib/server-config";

const PURPOSE = "password_reset";

export async function signPasswordResetToken(userId: string, emailNormalized: string): Promise<string> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("BBGPT_SESSION_SECRET is not set.");
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ purpose: PURPOSE, sub: userId, email: emailNormalized })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(key);
}

export async function verifyPasswordResetToken(token: string): Promise<{ userId: string; email: string }> {
  const secret = getSessionSecret();
  if (!secret) throw new Error("BBGPT_SESSION_SECRET is not set.");
  const key = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, key);
  if (payload.purpose !== PURPOSE || typeof payload.sub !== "string" || typeof payload.email !== "string") {
    throw new Error("Invalid password reset token.");
  }
  return { userId: payload.sub, email: payload.email };
}
