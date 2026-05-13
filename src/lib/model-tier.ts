import type { ModelTier } from "@/lib/types";

const TIERS: readonly ModelTier[] = [
  "glm-4-flash",
  "glm-4-air",
  "glm-4-plus",
  "glm-4-long",
  "glm-4",
] as const;

export function isModelTier(s: unknown): s is ModelTier {
  return typeof s === "string" && (TIERS as readonly string[]).includes(s);
}

export function parseModelTierBody(body: { model?: unknown }): ModelTier | null {
  return isModelTier(body.model) ? body.model : null;
}
