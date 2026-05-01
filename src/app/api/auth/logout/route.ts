import { LEGACY_SESSION_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth-cookie";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const cleared = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 0,
};

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", cleared);
  res.cookies.set(LEGACY_SESSION_COOKIE_NAME, "", cleared);
  return res;
}
