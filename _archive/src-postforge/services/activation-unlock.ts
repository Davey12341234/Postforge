import { prisma } from "@/lib/prisma";
interface ScheduledPostCreateInput { caption: string; platform?: string; scheduledAt: Date; }
export async function unlockDashboardOnFirstScheduledPost(orgId: string, postData: ScheduledPostCreateInput) {
  return await prisma.$transaction(async (tx) => {
    let brand = await tx.brand.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: "asc" },
    });
    if (!brand) {
      brand = await tx.brand.create({
        data: { name: "Default Brand", organizationId: orgId },
      });
    }
    const post = await tx.scheduledPost.create({ data: { organizationId: orgId, brandId: brand.id, caption: postData.caption, platform: postData.platform, scheduledAt: postData.scheduledAt, status: "PENDING" } });
    await tx.organization.update({ where: { id: orgId, activationStatus: { not: "ACTIVE" }, firstScheduledPostAt: null }, data: { activationStatus: "ACTIVE", firstScheduledPostAt: new Date() } });
    return post;
  });
}
