import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateMRR(
  rows: Array<{ plan: string; _count: number }>,
): number {
  const planPrices: Record<string, number> = {
    free: 0,
    pro: 29,
    business: 99,
    enterprise: 299,
  };
  let mrr = 0;
  for (const r of rows) {
    mrr += (planPrices[r.plan] ?? 0) * r._count;
  }
  return mrr;
}

export async function GET(req: NextRequest) {
  try {
    const secret = process.env.ADMIN_REVENUE_SECRET;
    const header = req.headers.get("authorization");
    const token = header?.replace(/^Bearer\s+/i, "") ?? "";
    const qp = req.nextUrl.searchParams.get("key");
    if (!secret || (token !== secret && qp !== secret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenueResult,
      paymentsLast30Days,
      paymentsThisMonth,
      paymentsLastMonth,
      activeSubscriptionsByPlan,
      subscriptionsByStatus,
      totalProfiles,
      totalInvoices,
      canceledThisMonth,
    ] = await Promise.all([
      prisma.unifiedPayment.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: { status: "SUCCEEDED" },
      }),
      prisma.unifiedPayment.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.unifiedPayment.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: startMonth },
        },
      }),
      prisma.unifiedPayment.aggregate({
        _sum: { amountCents: true },
        _count: true,
        where: {
          status: "SUCCEEDED",
          createdAt: { gte: startLastMonth, lte: endLastMonth },
        },
      }),
      prisma.unifiedSubscription.groupBy({
        by: ["plan"],
        where: { status: "active" },
        _count: true,
      }),
      prisma.unifiedSubscription.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.unifiedStudioProfile.count(),
      prisma.unifiedInvoice.count(),
      prisma.unifiedSubscription.count({
        where: {
          status: "canceled",
          canceledAt: { gte: startMonth },
        },
      }),
    ]);

    const mrr = calculateMRR(
      activeSubscriptionsByPlan.map((r) => ({
        plan: r.plan,
        _count: r._count,
      })),
    );

    const totalActive = subscriptionsByStatus.reduce(
      (s, x) => s + (x.status === "active" ? x._count : 0),
      0,
    );
    const churnRate =
      totalActive + canceledThisMonth > 0
        ? (
            (canceledThisMonth / (totalActive + canceledThisMonth)) *
            100
          ).toFixed(1)
        : "0.0";

    const lastSum = paymentsLastMonth._sum.amountCents ?? 0;
    const thisSum = paymentsThisMonth._sum.amountCents ?? 0;
    const revenueGrowth =
      lastSum > 0
        ? (((thisSum - lastSum) / lastSum) * 100).toFixed(1)
        : null;

    return NextResponse.json({
      overview: {
        totalRevenueCents: totalRevenueResult._sum.amountCents ?? 0,
        totalTransactions: totalRevenueResult._count,
        mrr,
        totalProfiles,
        churnRate: `${churnRate}%`,
        totalInvoices,
      },
      revenue: {
        last30Days: {
          totalCents: paymentsLast30Days._sum.amountCents ?? 0,
          transactions: paymentsLast30Days._count,
        },
        thisMonth: {
          totalCents: thisSum,
          transactions: paymentsThisMonth._count,
        },
        growthPercent: revenueGrowth,
      },
      subscriptions: {
        byPlan: Object.fromEntries(
          activeSubscriptionsByPlan.map((r) => [r.plan, r._count]),
        ),
        byStatus: Object.fromEntries(
          subscriptionsByStatus.map((r) => [r.status, r._count]),
        ),
      },
      timestamp: now.toISOString(),
    });
  } catch (error: unknown) {
    console.error("Revenue dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 },
    );
  }
}
