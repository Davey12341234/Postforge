import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";

const bodySchema = z.object({
  caption: z.string().min(1).max(8000),
  platform: z.string().min(1),
  scheduledAt: z.string().optional(),
});

/**
 * Placeholder for Meta / LinkedIn publishing (Phase 3).
 * Persists analytics only.
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json: unknown = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "unified_publish_intent",
        properties: {
          platform: parsed.data.platform,
          scheduledAt: parsed.data.scheduledAt ?? null,
          preview: parsed.data.caption.slice(0, 200),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Publish pipeline not connected — event logged for analytics.",
    });
  } catch (e) {
    console.error("unified publish:", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
