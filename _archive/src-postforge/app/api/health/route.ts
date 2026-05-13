import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Liveness/readiness for Railway and ops. No auth required.
 * Returns 503 if the database cannot be reached.
 */
export async function GET() {
  const start = Date.now();
  let dbStatus: "connected" | "error" = "error";
  let dbLatencyMs: number | null = null;

  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
    dbStatus = "connected";
  } catch (e) {
    console.error("[health] database check failed:", e);
  }

  const totalMs = Date.now() - start;
  const ok = dbStatus === "connected";

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      latency: {
        totalMs,
        databaseMs: dbLatencyMs,
      },
      services: {
        database: dbStatus,
      },
      version: process.env.npm_package_version ?? "0.0.0",
      environment: process.env.NODE_ENV ?? "development",
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}
