import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";
import { ensureStarterCreditsIfEligible } from "@/lib/ensure-org-credits";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

const getDashboardData = cache(async (organizationId: string) => {
  const [scheduledPosts, suggestedDrafts, notifications, brandCount, org] =
    await Promise.all([
      prisma.scheduledPost.findMany({
        where: { organizationId },
        orderBy: { scheduledAt: "asc" },
        take: 20,
      }),
      prisma.draft.findMany({
        where: { organizationId, status: "SUGGESTED" },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      prisma.notification.findMany({
        where: { organizationId, read: false },
        take: 5,
      }),
      prisma.brand.count({ where: { organizationId } }),
      prisma.organization.findUnique({
        where: { id: organizationId },
        select: { aiCredits: true, planId: true, activationStatus: true },
      }),
    ]);

  if (!org) {
    throw new Error("Organization not found");
  }

  const planLimits =
    PLAN_LIMITS[org.planId as keyof typeof PLAN_LIMITS] ?? PLAN_LIMITS.FREE;

  return {
    scheduledPosts,
    suggestedDrafts,
    notifications,
    brandCount,
    aiCredits: org.aiCredits ?? 0,
    maxCredits: planLimits.credits,
    maxBrands: planLimits.brands,
  };
});

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user?.orgId) {
    redirect("/onboarding");
  }

  const organizationId = session.user.orgId;

  let initialData;
  try {
    await ensureStarterCreditsIfEligible(organizationId);
    initialData = await getDashboardData(organizationId);
  } catch {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <DashboardClient initialData={initialData} />
    </div>
  );
}
