import { SignJWT } from "jose";
import { NextResponse, type NextRequest } from "next/server";
import { getAppPassword, getSessionSecret } from "@/lib/server-config";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const expected = getAppPassword();
  if (!expected) {
    return NextResponse.json({ error: "BABYGPT_APP_PASSWORD is not configured." }, { status: 400 });
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const submitted = String(body.password ?? "").trim();
  if (submitted !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const secret = getSessionSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Set BABYGPT_SESSION_SECRET (long random string) when using BABYGPT_APP_PASSWORD." },
      { status: 500 },
    );
  }

  const key = new TextEncoder().encode(secret);
  const token = await new SignJWT({ sub: "default" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(key);

  const res = NextResponse.json({ ok: true });
  res.cookies.set("babygpt_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
