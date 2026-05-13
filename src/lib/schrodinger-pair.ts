import type { ModelTier } from "@/lib/types";

const DEFAULT_COUNTERPART: Record<ModelTier, ModelTier> = {
  "glm-4-flash": "glm-4-air",
  "glm-4-air": "glm-4-flash",
  "glm-4-plus": "glm-4-air",
  "glm-4-long": "glm-4-plus",
  "glm-4": "glm-4-long",
};

/** Prefer flash ↔ air when plan allows both (distinct race when primary has no other tier). */
const PAIR_FALLBACK: ModelTier[] = ["glm-4-flash", "glm-4-air"];

/**
 * Picks a distinct second model for dual-stream "race" mode.
 * If the default counterpart is not on the user's plan, picks another allowed tier ≠ primary.
 */
export function schrodingerPair(
  primary: ModelTier,
  allowedModels: readonly ModelTier[],
): { modelA: ModelTier; modelB: ModelTier } {
  const preferred = DEFAULT_COUNTERPART[primary];
  if (allowedModels.includes(preferred) && preferred !== primary) {
    return { modelA: primary, modelB: preferred };
  }
  const other = allowedModels.find((m) => m !== primary);
  if (other) {
    return { modelA: primary, modelB: other };
  }
  const [a, b] = PAIR_FALLBACK;
  if (allowedModels.includes(a) && allowedModels.includes(b)) {
    return primary === a ? { modelA: a, modelB: b } : { modelA: b, modelB: a };
  }
  return { modelA: primary, modelB: primary };
}
