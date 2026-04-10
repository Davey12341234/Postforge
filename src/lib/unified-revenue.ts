/**
 * Credits, tiers, paywall helpers — Unified Content Studio.
 */

export type UnifiedTier = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export const TIER_LIMITS: Record<
  UnifiedTier,
  { monthlyCredits: number; maxDrafts: number; canBatch: boolean }
> = {
  FREE: { monthlyCredits: 100, maxDrafts: 10, canBatch: false },
  PRO: { monthlyCredits: 2000, maxDrafts: 200, canBatch: true },
  BUSINESS: { monthlyCredits: 15000, maxDrafts: 2000, canBatch: true },
  ENTERPRISE: { monthlyCredits: 50000, maxDrafts: 10000, canBatch: true },
};

export function canSpendCredits(
  tier: UnifiedTier,
  currentCredits: number,
  cost: number,
): boolean {
  return currentCredits >= cost && cost > 0;
}

export function chatMessageCost(tokensEstimate = 500): number {
  return Math.max(1, Math.ceil(tokensEstimate / 1000));
}

export function shouldShowPaywall(
  tier: UnifiedTier,
  credits: number,
): boolean {
  return tier === "FREE" && credits < 5;
}
