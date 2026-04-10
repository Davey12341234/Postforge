import { prisma } from "@/lib/prisma";
import { DEFAULT_MISSION_DEFINITIONS } from "@/lib/unified-gamification";
import { computeLevelFromXp } from "@/lib/unified-gamification";

function randomReferralCode(userId: string): string {
  const part = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `INV-${part || "USER"}-${rnd}`;
}

export async function getOrCreateUnifiedProfile(userId: string) {
  const existing = await prisma.unifiedStudioProfile.findUnique({
    where: { userId },
    include: { missions: { orderBy: { createdAt: "asc" } } },
  });
  if (existing) {
    await ensureReferralRow(userId);
    return existing;
  }

  const profile = await prisma.unifiedStudioProfile.create({
    data: {
      userId,
      missions: {
        create: DEFAULT_MISSION_DEFINITIONS.map((m) => ({
          missionKey: m.key,
          title: m.title,
          description: m.description,
          target: m.target,
          xpReward: m.xpReward,
        })),
      },
    },
    include: { missions: { orderBy: { createdAt: "asc" } } },
  });

  await ensureReferralRow(userId);
  return profile;
}

async function ensureReferralRow(userId: string): Promise<void> {
  const found = await prisma.unifiedReferral.findFirst({
    where: { referrerUserId: userId },
  });
  if (found) return;
  for (let i = 0; i < 5; i++) {
    const code = randomReferralCode(userId + i);
    try {
      await prisma.unifiedReferral.create({
        data: { referrerUserId: userId, referralCode: code },
      });
      return;
    } catch {
      /* unique collision */
    }
  }
}

export async function applyXpAndLevel(
  profileId: string,
  addXp: number,
): Promise<{ xpTotal: number; level: number }> {
  const p = await prisma.unifiedStudioProfile.findUnique({
    where: { id: profileId },
  });
  if (!p) throw new Error("Profile not found");
  const xpTotal = p.xpTotal + addXp;
  const level = computeLevelFromXp(xpTotal);
  await prisma.unifiedStudioProfile.update({
    where: { id: profileId },
    data: { xpTotal, level },
  });
  return { xpTotal, level };
}
