/**
 * Usage limits for Unified Content Studio (plan + subscription row + analytics).
 */

import { prisma } from "@/lib/prisma";
import { getOrCreateUnifiedProfile } from "@/lib/unified-profile";
import type { UnifiedSubscriptionTier } from "@prisma/client";

export type UsageLimitsResult = {
  canGenerate: boolean;
  canSaveDraft: boolean;
  remainingCredits: number;
  remainingGenerations: number;
  remainingDrafts: number;
  plan: string;
  upgradeUrl: string;
  resetDate: string | null;
  limits: {
    maxCredits: number;
    maxGenerations: number;
    maxDrafts: number;
  };
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function tierToPlanKey(tier: UnifiedSubscriptionTier): string {
  switch (tier) {
    case "PRO":
      return "pro";
    case "BUSINESS":
      return "business";
    case "ENTERPRISE":
      return "enterprise";
    default:
      return "free";
  }
}

export function getPlanLimits(plan: string): {
  credits: number;
  generations: number;
  drafts: number;
  teamMembers: number;
} {
  const p = plan.toLowerCase();
  /** Three paid tiers: Pro < Business < Enterprise (caps and unlimited). */
  const limits: Record<
    string,
    { credits: number; generations: number; drafts: number; teamMembers: number }
  > = {
    free: { credits: 100, generations: 50, drafts: 20, teamMembers: 1 },
    pro: { credits: 2500, generations: 800, drafts: 800, teamMembers: 5 },
    business: { credits: 15000, generations: 5000, drafts: 5000, teamMembers: 25 },
    enterprise: { credits: -1, generations: -1, drafts: -1, teamMembers: -1 },
  };
  return limits[p] ?? limits.free;
}

export function getPlanConfig(plan: string): {
  credits: number;
  generations: number;
  drafts: number;
  teamMembers: number;
  features: string[];
} {
  const base = getPlanLimits(plan);
  const p = plan.toLowerCase();
  const features: Record<string, string[]> = {
    free: ["anthropic_ai", "base_chat", "base_generate", "drafts_local"],
    pro: [
      "anthropic_ai",
      "openai_chat",
      "media_studio",
      "analytics_basic",
      "advanced_ai",
      "priority_queue",
    ],
    business: [
      "anthropic_ai",
      "openai_chat",
      "media_studio",
      "analytics_advanced",
      "team_workspace",
      "sso",
    ],
    enterprise: [
      "anthropic_ai",
      "openai_chat",
      "media_studio",
      "analytics_advanced",
      "team_workspace",
      "sso",
      "sla",
      "dedicated_support",
    ],
  };
  return {
    ...base,
    features: features[p] ?? features.free,
  };
}

/** Effective plan slug for API enforcement (subscription row beats profile tier). */
export async function getUserPlanKey(userId: string): Promise<string> {
  const profile = await getOrCreateUnifiedProfile(userId);
  const sub = await prisma.unifiedSubscription.findUnique({
    where: { profileId: profile.id },
  });
  return sub?.plan?.toLowerCase() ?? tierToPlanKey(profile.subscriptionTier);
}

/** OpenAI chat (Responses API) — Pro, Business, Enterprise only. */
export function canUseOpenAiChat(plan: string): boolean {
  return isFeatureEnabled(plan, "openai_chat");
}

/** DALL·E, GPT Image edit, Whisper — Pro+ */
export function canUseMediaStudio(plan: string): boolean {
  return isFeatureEnabled(plan, "media_studio");
}

export async function checkUsageLimits(userId: string): Promise<UsageLimitsResult> {
  const profile = await getOrCreateUnifiedProfile(userId);
  const sub = await prisma.unifiedSubscription.findUnique({
    where: { profileId: profile.id },
  });

  const planKey =
    sub?.plan?.toLowerCase() ?? tierToPlanKey(profile.subscriptionTier);
  const defaults = getPlanLimits(planKey);

  const maxCredits =
    sub?.monthlyCreditsLimit ?? defaults.credits;
  const maxGenerations =
    sub?.aiGenerationsLimit ?? defaults.generations;
  const maxDrafts =
    sub?.draftStorageLimit ?? defaults.drafts;

  const periodStart =
    sub?.currentPeriodStart ?? startOfMonth(new Date());
  const resetDate =
    sub?.currentPeriodEnd?.toISOString() ?? null;

  const [generationCount, draftCount] = await Promise.all([
    prisma.unifiedAnalyticsEvent.count({
      where: {
        profileId: profile.id,
        eventName: {
          in: [
            "content_generation",
            "image_generation",
            "unified_chat_message",
          ],
        },
        timestamp: { gte: periodStart },
      },
    }),
    prisma.unifiedStudioDraft.count({
      where: { profileId: profile.id },
    }),
  ]);

  const unlimitedGen = maxGenerations < 0;
  const unlimitedDrafts = maxDrafts < 0;

  const remainingGenerations = unlimitedGen
    ? Number.POSITIVE_INFINITY
    : Math.max(0, maxGenerations - generationCount);
  const remainingDrafts = unlimitedDrafts
    ? Number.POSITIVE_INFINITY
    : Math.max(0, maxDrafts - draftCount);

  const remainingCredits = profile.unifiedCredits;

  const canGenerate =
    unlimitedGen || generationCount < maxGenerations;
  const canSaveDraft =
    unlimitedDrafts || draftCount < maxDrafts;

  return {
    canGenerate,
    canSaveDraft,
    remainingCredits,
    remainingGenerations: Number.isFinite(remainingGenerations)
      ? remainingGenerations
      : 999999,
    remainingDrafts: Number.isFinite(remainingDrafts)
      ? remainingDrafts
      : 999999,
    plan: planKey,
    upgradeUrl: "/unified/pricing",
    resetDate,
    limits: {
      maxCredits: maxCredits < 0 ? 999999 : maxCredits,
      maxGenerations: maxGenerations < 0 ? 999999 : maxGenerations,
      maxDrafts: maxDrafts < 0 ? 999999 : maxDrafts,
    },
  };
}

export function isFeatureEnabled(plan: string, feature: string): boolean {
  const config = getPlanConfig(plan);
  return config.features.includes(feature);
}

export function getPlanDisplayName(plan: string): string {
  const names: Record<string, string> = {
    free: "Starter",
    pro: "Pro",
    business: "Business",
    enterprise: "Enterprise",
  };
  return names[plan.toLowerCase()] ?? "Unknown";
}
