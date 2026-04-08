import { prisma } from "@/lib/prisma";
interface ScheduledPostCreateInput { caption: string; platform?: string; scheduledAt: Date; }
export async function unlockDashboardOnFirstScheduledPost(orgId: string, postData: ScheduledPostCreateInput) {
  return await prisma.$transaction(async (tx) => {
    const brand = await tx.brand.upsert({ where: { id: "brand_1" }, update: {}, create: { id: "brand_1", name: "Default Brand", organizationId: orgId } });
    const post = await tx.scheduledPost.create({ data: { organizationId: orgId, brandId: brand.id, caption: postData.caption, platform: postData.platform, scheduledAt: postData.scheduledAt, status: "PENDING" } });
    await tx.organization.update({ where: { id: orgId, activationStatus: { not: "ACTIVE" }, firstScheduledPostAt: null }, data: { activationStatus: "ACTIVE", firstScheduledPostAt: new Date() } });
    return post;
  });
}
