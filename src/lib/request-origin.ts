import type { NextRequest } from "next/server";

/** Public base URL for Stripe redirects. Prefer NEXT_PUBLIC_APP_URL in production. */
export function requestAppOrigin(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) {
    return env.replace(/\/$/, "");
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "127.0.0.1:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
