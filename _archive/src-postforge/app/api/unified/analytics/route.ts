import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const [totalEvents, totalDrafts, publishedDrafts, recentEvents] =
      await Promise.all([
        prisma.unifiedAnalyticsEvent.count({
          where: {
            profileId: profile.id,
            timestamp: { gte: thirtyDaysAgo },
          },
        }),
        prisma.unifiedStudioDraft.count({
          where: { profileId: profile.id },
        }),
        prisma.unifiedStudioDraft.count({
          where: { profileId: profile.id, status: "PUBLISHED" },
        }),
        prisma.unifiedAnalyticsEvent.findMany({
          where: {
            profileId: profile.id,
            timestamp: { gte: thirtyDaysAgo },
          },
          orderBy: { timestamp: "desc" },
          take: 500,
        }),
      ]);

    const statsByType = recentEvents.reduce(
      (acc, event) => {
        acc[event.eventName] = (acc[event.eventName] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const dailyActivity = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sevenDaysAgo);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const dayEvents = recentEvents.filter((e) => {
        const d = e.timestamp.toISOString().split("T")[0];
        return d === dateStr;
      });

      const breakdown = dayEvents.reduce(
        (acc, e) => {
          acc[e.eventName] = (acc[e.eventName] ?? 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      return {
        date: dateStr,
        total: dayEvents.length,
        breakdown,
      };
    });

    return NextResponse.json({
      overview: {
        totalEvents,
        totalDrafts,
        publishedDrafts,
        currentLevel: profile.level,
        totalXP: profile.xpTotal,
        creditsRemaining: profile.unifiedCredits,
      },
      statsByType,
      dailyActivity,
      recentActivity: recentEvents.slice(0, 20).map((e) => ({
        id: e.id,
        eventName: e.eventName,
        properties: e.properties,
        timestamp: e.timestamp,
      })),
      period: {
        start: thirtyDaysAgo.toISOString(),
        end: now.toISOString(),
      },
    });
  } catch (error: unknown) {
    console.error("Analytics error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
