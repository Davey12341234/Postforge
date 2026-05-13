import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await getOrCreateUnifiedProfile(session.user.id);

    const row = await prisma.unifiedReferral.findFirst({
      where: { referrerUserId: session.user.id },
    });
    const conversions = await prisma.unifiedReferral.count({
      where: {
        referrerUserId: session.user.id,
        status: "CONVERTED",
      },
    });

    return NextResponse.json({
      referralCode: row?.referralCode ?? null,
      status: row?.status ?? "PENDING",
      conversions,
      rewardCredits: row?.rewardCredits ?? 0,
    });
  } catch (error: unknown) {
    console.error("unified referrals GET:", error);
    return NextResponse.json(
      { error: "Failed to load referrals" },
      { status: 500 },
    );
  }
}

const postSchema = z.object({
  action: z.enum(["track_view", "convert"]),
  referralCode: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const json: unknown = await req.json();
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body" },
        { status: 400 },
      );
    }

    const { action, referralCode } = parsed.data;

    const ref = await prisma.unifiedReferral.findUnique({
      where: { referralCode },
    });
    if (!ref) {
      return NextResponse.json({ ok: false, error: "Invalid code" });
    }

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: null,
        eventName:
          action === "track_view"
            ? "referral_link_view"
            : "referral_convert_attempt",
        properties: { referralCode, referrerUserId: ref.referrerUserId },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    console.error("unified referrals POST:", error);
    return NextResponse.json(
      { error: "Failed" },
      { status: 500 },
    );
  }
}
