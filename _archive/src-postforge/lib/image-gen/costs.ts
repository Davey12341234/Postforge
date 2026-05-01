import type { Dalle3Quality, Dalle3Size } from "@/lib/image-gen/types";

/**
 * Unified credit cost for DALL·E 3 (aligns with docs/IMAGE-GENERATION-SPEC.md tiers).
 * Standard 1024²-style generations: 15 credits; HD / large: 30 credits.
 */
export function dalle3CreditCost(
  _size: Dalle3Size,
  quality: Dalle3Quality,
): number {
  if (quality === "hd") return 30;
  return 15;
}

/** GPT Image edit (inpaint / variation) — aligned with generate tiering. */
export function gptImageEditCreditCost(): number {
  return 20;
}
