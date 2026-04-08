import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEdgeSession } from "@/lib/auth-edge";
export async function middleware(request: NextRequest) {
  const session = await getEdgeSession(request);
  if (!session) { const isProtected = request.nextUrl.pathname.startsWith("/dashboard"); if (isProtected) return NextResponse.redirect(new URL("/auth/signin", request.url)); }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon\\.ico|static/).*)"] };
