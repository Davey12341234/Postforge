import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  applyXpAndLevel,
  getOrCreateUnifiedProfile,
} from "@/lib/unified-profile";
import { computeLevelFromXp, LEVELS } from "@/lib/unified-gamification";

const postSchema = z.object({
  action: z.enum([
    "add_xp",
    "tick_streak",
    "complete_mission_step",
    "sync_level",
  ]),
  amount: z.number().int().min(1).max(5000).optional(),
  missionKey: z.string().min(1).optional(),
  delta: z.number().int().min(1).max(100).optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const referral = await prisma.unifiedReferral.findFirst({
      where: { referrerUserId: session.user.id },
    });

    const levelMeta = LEVELS.map((l, i) => ({
      index: i,
      name: l.name,
      icon: l.icon,
      min: l.min,
      max: l.max === Number.POSITIVE_INFINITY ? null : l.max,
      unlocked: profile.xpTotal >= l.min,
    }));

    return NextResponse.json({
      profile: {
        id: profile.id,
        xpTotal: profile.xpTotal,
        level: profile.level,
        streakCount: profile.streakCount,
        lastStreakDate: profile.lastStreakDate,
        subscriptionTier: profile.subscriptionTier,
        unifiedCredits: profile.unifiedCredits,
      },
      missions: profile.missions.map((m) => ({
        id: m.id,
        missionKey: m.missionKey,
        title: m.title,
        description: m.description,
        progress: m.progress,
        target: m.target,
        status: m.status,
        xpReward: m.xpReward,
      })),
      referralCode: referral?.referralCode ?? null,
      levels: levelMeta,
      computedLevel: computeLevelFromXp(profile.xpTotal),
    });
  } catch (error: unknown) {
    console.error("unified progress GET:", error);
    return NextResponse.json(
      { error: "Failed to load progress" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const { action, amount, missionKey, delta } = parsed.data;

    if (action === "add_xp") {
      const xp = amount ?? 10;
      const { xpTotal, level } = await applyXpAndLevel(profile.id, xp);
      return NextResponse.json({ ok: true, xpTotal, level });
    }

    if (action === "tick_streak") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const last = profile.lastStreakDate
        ? new Date(profile.lastStreakDate)
        : null;
      if (last) last.setHours(0, 0, 0, 0);

      let nextStreak = profile.streakCount;
      if (!last) {
        nextStreak = 1;
      } else {
        const diffDays = Math.floor(
          (today.getTime() - last.getTime()) / (86400 * 1000),
        );
        if (diffDays === 0) {
          nextStreak = profile.streakCount;
        } else if (diffDays === 1) {
          nextStreak = profile.streakCount + 1;
        } else {
          nextStreak = 1;
        }
      }

      const updated = await prisma.unifiedStudioProfile.update({
        where: { id: profile.id },
        data: {
          streakCount: nextStreak,
          lastStreakDate: new Date(),
        },
      });

      const mission = await prisma.unifiedUserMission.findFirst({
        where: {
          profileId: profile.id,
          missionKey: "streak_three",
          status: "ACTIVE",
        },
      });
      if (mission && nextStreak >= mission.target) {
        await prisma.unifiedUserMission.update({
          where: { id: mission.id },
          data: {
            progress: nextStreak,
            status: "COMPLETED",
            completedAt: new Date(),
          },
        });
        await applyXpAndLevel(profile.id, mission.xpReward);
      } else if (mission) {
        await prisma.unifiedUserMission.update({
          where: { id: mission.id },
          data: { progress: Math.min(nextStreak, mission.target) },
        });
      }

      return NextResponse.json({
        ok: true,
        streakCount: updated.streakCount,
      });
    }

    if (action === "complete_mission_step") {
      if (!missionKey) {
        return NextResponse.json(
          { error: "missionKey required" },
          { status: 400 },
        );
      }
      const step = delta ?? 1;
      const mission = await prisma.unifiedUserMission.findFirst({
        where: {
          profileId: profile.id,
          missionKey,
          status: "ACTIVE",
        },
      });
      if (!mission) {
        return NextResponse.json({ ok: true, skipped: true });
      }
      const progress = mission.progress + step;
      const completed = progress >= mission.target;
      await prisma.unifiedUserMission.update({
        where: { id: mission.id },
        data: {
          progress: Math.min(progress, mission.target),
          status: completed ? "COMPLETED" : "ACTIVE",
          completedAt: completed ? new Date() : null,
        },
      });
      if (completed) {
        await applyXpAndLevel(profile.id, mission.xpReward);
      }
      return NextResponse.json({ ok: true, completed });
    }

    if (action === "sync_level") {
      const level = computeLevelFromXp(profile.xpTotal);
      await prisma.unifiedStudioProfile.update({
        where: { id: profile.id },
        data: { level },
      });
      return NextResponse.json({ ok: true, level });
    }

    return NextResponse.json({ error: "Unsupported" }, { status: 400 });
  } catch (error: unknown) {
    console.error("unified progress POST:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 },
    );
  }
}
