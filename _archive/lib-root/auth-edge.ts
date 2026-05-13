import { NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

const SESSION_COOKIE_CANDIDATES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
] as const;

function getSessionCookie(request: NextRequest): { token: string; salt: string } {
  for (const name of SESSION_COOKIE_CANDIDATES) {
    const value = request.cookies.get(name)?.value;
    if (value) return { token: value, salt: name };
  }
  return { token: "", salt: SESSION_COOKIE_CANDIDATES[0] };
}

export async function getEdgeSession(request: NextRequest) {
  const { token: sessionToken, salt } = getSessionCookie(request);
  const token = await decode({
    token: sessionToken,
    secret: process.env.NEXTAUTH_SECRET!,
    salt,
  });

  if (!token?.sub) return null;

  return {
    userId: token.sub,
    orgId: token.orgId as string | undefined,
  };
}
