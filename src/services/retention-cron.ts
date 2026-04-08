import { prisma } from "@/lib/prisma";
import { inngest } from "@/lib/inngest";

export const retentionCron = inngest.createFunction(
  { id: "daily-retention-check", triggers: [{ cron: "0 10 * * *" }] },
  async () => {
    const orgs = await prisma.organization.findMany({ select: { id: true, brands: { select: { id: true } } } });
    for (const org of orgs) { for (const brand of org.brands) {
      const futureCount = await prisma.scheduledPost.count({ where: { organizationId: org.id, brandId: brand.id, scheduledAt: { gt: new Date() } } });
      if (futureCount === 0) { await prisma.notification.create({ data: { organizationId: org.id, brandId: brand.id, type: "STARVING_QUEUE", title: "Queue Empty", body: "Add content." } }); }
    }}
  }
);
