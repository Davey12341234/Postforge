import { prisma } from "@/lib/prisma";
import type { DraftInput } from "@/lib/constants";

export async function generate30DayContentBatch(
  orgId: string,
  brandId: string,
  userId: string,
  items: DraftInput[],
): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.contentBatch.findFirst({
      where: { createdByUserId: userId, organizationId: orgId },
    });
    const batch = existing
      ? await tx.contentBatch.update({
          where: { id: existing.id },
          data: { itemCount: { increment: items.length } },
        })
      : await tx.contentBatch.create({
          data: {
            organizationId: orgId,
            brandId,
            createdByUserId: userId,
            itemCount: items.length,
            status: "COMPLETED",
          },
        });
    if (items.length > 0) {
      await tx.draft.createMany({
        data: items.map((item) => ({
          ...item,
          organizationId: orgId,
          brandId,
          batchId: batch.id,
          status: "SUGGESTED" as const,
        })),
      });
    }
    return batch.id;
  });
}

export async function approveBatchForScheduling(
  batchId: string,
): Promise<{ scheduledCount: number }> {
  return await prisma.$transaction(async (tx) => {
    const drafts = await tx.draft.findMany({
      where: { batchId, status: "SUGGESTED" },
    });
    let scheduledCount = 0;
    for (const d of drafts) {
      await tx.scheduledPost.create({
        data: {
          organizationId: d.organizationId,
          brandId: d.brandId,
          caption: d.caption,
          platform: d.platform ?? "LINKEDIN",
          scheduledAt: d.suggestedAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
          status: "PENDING",
        },
      });
      await tx.draft.update({
        where: { id: d.id },
        data: { status: "SCHEDULED" },
      });
      scheduledCount += 1;
    }
    return { scheduledCount };
  });
}

