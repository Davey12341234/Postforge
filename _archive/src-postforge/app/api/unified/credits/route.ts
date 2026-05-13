import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

const postSchema = z.object({
  amount: z.number().int(),
  reason: z.string().max(500).optional(),
  missionId: z.string().cuid().optional(),
});

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const subscription = await prisma.unifiedSubscription.findUnique({
      where: { profileId: profile.id },
    });

    return NextResponse.json({
      balance: profile.unifiedCredits,
      level: profile.level,
      xpTotal: profile.xpTotal,
      streakCount: profile.streakCount,
      subscriptionTier: profile.subscriptionTier,
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            currentPeriodEnd: subscription.currentPeriodEnd,
            stripePriceId: subscription.stripePriceId,
          }
        : null,
      activeMissions: profile.missions.filter((m) => m.status === "ACTIVE"),
    });
  } catch (error: unknown) {
    console.error("Credits GET error:", error);
    return NextResponse.json(
      { error: "Failed to load credits" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await request.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { amount, reason, missionId } = parsed.data;
    const profile = await getOrCreateUnifiedProfile(session.user.id);

    if (amount < 0 && profile.unifiedCredits < Math.abs(amount)) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 },
      );
    }

    const updatedProfile = await prisma.unifiedStudioProfile.update({
      where: { id: profile.id },
      data: {
        unifiedCredits: { increment: amount },
      },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "credit_transaction",
        properties: {
          amount,
          newBalance: updatedProfile.unifiedCredits,
          reason: reason ?? "Manual adjustment",
          missionId: missionId ?? null,
        },
      },
    });

    if (missionId) {
      await prisma.unifiedUserMission.updateMany({
        where: {
          id: missionId,
          profileId: profile.id,
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      newBalance: updatedProfile.unifiedCredits,
      transaction: { amount, reason: reason ?? null },
    });
  } catch (error: unknown) {
    console.error("Credits POST error:", error);
    return NextResponse.json(
      { error: "Failed to update credits" },
      { status: 500 },
    );
  }
}
