import { NextResponse } from "next/server";

/**
 * Liveness only — no DB. Use for Railway healthchecks so the deploy goes green
 * when the Node server is up; use GET /api/health for DB readiness.
 */
export async function GET() {
  return NextResponse.json(
    { status: "ok", check: "liveness" },
    {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
