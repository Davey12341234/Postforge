import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import type { UnifiedDraftStatus } from "@prisma/client";

const postSchema = z.object({
  title: z.string().max(200).optional(),
  content: z.string().min(1).max(32000),
  platform: z.string().max(64).optional(),
  type: z.string().max(64).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  localId: z.string().max(128).optional(),
  status: z.enum(["DRAFT", "READY", "SCHEDULED", "PUBLISHED"]).optional(),
});

function parseStatus(s: string | null): UnifiedDraftStatus | undefined {
  if (!s) return undefined;
  const u = s.toUpperCase();
  if (u === "DRAFT" || u === "draft") return "DRAFT";
  if (u === "READY" || u === "ready") return "READY";
  if (u === "SCHEDULED" || u === "scheduled") return "SCHEDULED";
  if (u === "PUBLISHED" || u === "published") return "PUBLISHED";
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getOrCreateUnifiedProfile(session.user.id);
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status = parseStatus(statusParam);

    const drafts = await prisma.unifiedStudioDraft.findMany({
      where: {
        profileId: profile.id,
        ...(status ? { status } : {}),
      },
      orderBy: { updatedAt: "desc" },
    });

    const mapped = drafts.map((d) => ({
      id: d.id,
      caption: d.caption,
      title: d.caption.split("\n")[0]?.slice(0, 120) ?? "Draft",
      platform: d.platform,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));

    return NextResponse.json({ drafts: mapped });
  } catch (error: unknown) {
    console.error("Drafts GET error:", error);
    return NextResponse.json(
      { error: "Failed to list drafts" },
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

    const { content, platform, metadata, localId, status } = parsed.data;
    const profile = await getOrCreateUnifiedProfile(session.user.id);

    let caption = content;
    if (parsed.data.title) {
      caption = `${parsed.data.title}\n\n${content}`;
    }

    const draft = await prisma.unifiedStudioDraft.create({
      data: {
        profileId: profile.id,
        caption,
        platform: platform ?? null,
        status: status ?? "DRAFT",
      },
    });

    await prisma.unifiedAnalyticsEvent.create({
      data: {
        profileId: profile.id,
        eventName: "draft_created",
        properties: {
          draftId: draft.id,
          localId: localId ?? null,
          ...(metadata != null ? { metadata: metadata as object } : {}),
        },
      },
    });

    return NextResponse.json(
      {
        id: draft.id,
        caption: draft.caption,
        platform: draft.platform,
        status: draft.status,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Drafts POST error:", error);
    return NextResponse.json(
      { error: "Failed to save draft" },
      { status: 500 },
    );
  }
}
