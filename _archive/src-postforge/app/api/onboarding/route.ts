import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PLAN_LIMITS } from "@/lib/constants";
import { ensureStarterCreditsIfEligible } from "@/lib/ensure-org-credits";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  const existing = await prisma.organizationMember.findFirst({
    where: { userId },
  });
  if (existing) {
    await ensureStarterCreditsIfEligible(existing.organizationId);
    return NextResponse.json({ ok: true });
  }

  await prisma.organization.create({
    data: {
      name: "My workspace",
      aiCredits: PLAN_LIMITS.FREE.credits,
      members: {
        create: { userId, role: "OWNER" },
      },
      brands: {
        create: { name: "Default Brand" },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
