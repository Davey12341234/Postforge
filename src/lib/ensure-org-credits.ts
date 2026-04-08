import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";

/**
 * If the org still has the default 0 balance and has never recorded AI usage,
 * grant the plan's credit allowance (fixes orgs created before starter credits were seeded).
 */
export async function ensureStarterCreditsIfEligible(
  organizationId: string,
): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { aiCredits: true, planId: true },
  });
  if (!org || org.aiCredits > 0) return;

  const usageCount = await prisma.aiUsageLedger.count({
    where: { organizationId },
  });
  if (usageCount > 0) return;

  const cap =
    PLAN_LIMITS[org.planId as keyof typeof PLAN_LIMITS]?.credits ??
    PLAN_LIMITS.FREE.credits;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { aiCredits: cap },
  });
}
