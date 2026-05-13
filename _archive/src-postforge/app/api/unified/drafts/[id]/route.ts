import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import type { UnifiedDraftStatus } from "@prisma/client";

const putSchema = z.object({
  content: z.string().min(1).max(32000).optional(),
  caption: z.string().min(1).max(32000).optional(),
  platform: z.string().max(64).nullable().optional(),
  status: z.enum(["DRAFT", "READY", "SCHEDULED", "PUBLISHED"]).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const draft = await prisma.unifiedStudioDraft.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: draft.id,
      caption: draft.caption,
      platform: draft.platform,
      status: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Draft GET error:", error);
    return NextResponse.json(
      { error: "Failed to load draft" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const json: unknown = await request.json();
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const existing = await prisma.unifiedStudioDraft.findFirst({
      where: { id, profileId: profile.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const nextCaption =
      parsed.data.caption ??
      parsed.data.content ??
      existing.caption;
    const nextPlatform =
      parsed.data.platform !== undefined
        ? parsed.data.platform
        : existing.platform;
    const nextStatus = (parsed.data.status ??
      existing.status) as UnifiedDraftStatus;

    const draft = await prisma.unifiedStudioDraft.update({
      where: { id },
      data: {
        caption: nextCaption,
        platform: nextPlatform,
        status: nextStatus,
      },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "draft_updated",
        properties: { draftId: id },
      },
    });

    return NextResponse.json({
      id: draft.id,
      caption: draft.caption,
      platform: draft.platform,
      status: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    });
  } catch (error: unknown) {
    console.error("Draft PUT error:", error);
    return NextResponse.json(
      { error: "Failed to update draft" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const profile = await getOrCreateUnifiedProfile(session.user.id);

    const result = await prisma.unifiedStudioDraft.deleteMany({
      where: { id, profileId: profile.id },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "draft_deleted",
        properties: { draftId: id },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Draft DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete draft" },
      { status: 500 },
    );
  }
}
