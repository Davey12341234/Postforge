import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InsufficientCreditsError } from "@/lib/constants";
import { failAndRefundRun } from "@/services/credit-accounting";

const bodySchema = z.object({
  draftId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
});

async function findAiRunForDraft(draft: {
  organizationId: string;
  brandId: string;
  createdAt: Date;
}) {
  return prisma.aiRun.findFirst({
    where: {
      organizationId: draft.organizationId,
      brandId: draft.brandId,
      runType: "BATCH_GENERATE",
      status: "COMPLETED",
      startedAt: { lte: draft.createdAt },
      completedAt: { gte: draft.createdAt },
    },
    orderBy: { completedAt: "desc" },
  });
}

async function refundCreditsForRejectedDraft(
  draftId: string,
  reason: string,
): Promise<void> {
  const draft = await prisma.draft.findUnique({
    where: { id: draftId },
  });
  if (!draft?.batchId) return;

  const run = await findAiRunForDraft(draft);
  if (!run) return;

  const peers = await prisma.draft.count({
    where: {
      batchId: draft.batchId,
      createdAt: {
        gte: run.startedAt,
        lte: run.completedAt ?? new Date(),
      },
    },
  });
  const n = Math.max(peers, 1);

  if (n <= 1) {
    await failAndRefundRun(run.id, reason);
    return;
  }

  const share = Math.ceil(run.reservedCredits / n);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: draft.organizationId },
      data: { aiCredits: { increment: share } },
    });
    await tx.aiUsageLedger.create({
      data: {
        organizationId: draft.organizationId,
        amount: share,
        type: "REFUND",
        description: `${reason} (draft ${draftId})`,
      },
    });
  });
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const orgId = session.user.orgId;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid body", details: parsed.error.issues },
        { status: 400 },
      );
    }
    const { draftId, action } = parsed.data;

    const draft = await prisma.draft.findFirst({
      where: { id: draftId, organizationId: orgId },
    });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (action === "reject") {
      if (draft.status !== "SUGGESTED") {
        return NextResponse.json(
          { error: "Draft is not in suggested status." },
          { status: 400 },
        );
      }
      await prisma.draft.update({
        where: { id: draftId },
        data: { status: "REJECTED" },
      });
      await refundCreditsForRejectedDraft(draftId, "User rejected draft");
      return NextResponse.json({ success: true, draftId });
    }

    if (action === "approve") {
      if (draft.status !== "SUGGESTED") {
        return NextResponse.json(
          { error: "Draft is not in suggested status." },
          { status: 400 },
        );
      }
      const post = await prisma.scheduledPost.create({
        data: {
          organizationId: draft.organizationId,
          brandId: draft.brandId,
          caption: draft.caption,
          platform: draft.platform ?? "LINKEDIN",
          scheduledAt:
            draft.suggestedAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });
      await prisma.draft.update({
        where: { id: draftId },
        data: { status: "SCHEDULED" },
      });
      return NextResponse.json({
        success: true,
        scheduledPostId: post.id,
      });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: error.message },
        { status: 402 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
