import { NextRequest } from "next/server";
import { decode } from "next-auth/jwt";

const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
] as const;

export async function getEdgeSession(request: NextRequest) {
  for (const name of SESSION_COOKIES) {
    const cookie = request.cookies.get(name);
    if (!cookie?.value) continue;
    const token = await decode({
      token: cookie.value,
      secret: process.env.NEXTAUTH_SECRET!,
      salt: name,
    });
    if (!token?.sub) continue;
    return { userId: token.sub, orgId: token.orgId as string | undefined };
  }
  return null;
}
