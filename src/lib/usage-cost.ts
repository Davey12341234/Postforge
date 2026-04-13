import type { PlanDefinition } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

export type SendMode = "chat" | "agent" | "schrodinger";

export interface SendCostInput {
  model: ModelTier;
  thinking: boolean;
  mode: SendMode;
  /** Community AI debate (separate API). */
  debate?: boolean;
}

/** Credit weights — tune relative to monthly plan pools in `plans.ts`. */
function modelWeight(model: ModelTier): number {
  switch (model) {
    case "glm-4-flash":
      return 1;
    case "glm-4-air":
      return 1;
    case "glm-4-plus":
      return 2;
    case "glm-4-long":
      return 3;
    case "glm-4":
      return 4;
    default:
      return 1;
  }
}

/**
 * Estimated credits for one successful generation (charged after the stream completes).
 */
/** Community panel: AI debate calls a separate route; fixed weight for budgeting. */
export const COMMUNITY_DEBATE_COST = 6;

export function estimateSendCredits(input: SendCostInput): number {
  let w = modelWeight(input.model);
  if (input.thinking) w += 2;
  if (input.mode === "agent") w += 6;
  if (input.mode === "schrodinger") w += 8;
  if (input.debate) w += 5;
  return Math.max(1, w);
}

/** Line items for UI (Cost preview). Omits zero rows. */
export function estimateSendCreditsBreakdown(input: SendCostInput): {
  lines: { label: string; credits: number }[];
  total: number;
} {
  const lines: { label: string; credits: number }[] = [];
  const base = modelWeight(input.model);
  lines.push({ label: `Model (${input.model})`, credits: base });
  if (input.thinking) lines.push({ label: "Thinking", credits: 2 });
  if (input.mode === "agent") lines.push({ label: "Agent loop", credits: 6 });
  if (input.mode === "schrodinger") lines.push({ label: "Schrödinger", credits: 8 });
  if (input.debate) lines.push({ label: "Debate", credits: 5 });
  return { lines, total: estimateSendCredits(input) };
}

export function describeCost(input: SendCostInput, credits: number): string {
  const bits: string[] = [];
  bits.push(`${input.model}`);
  if (input.thinking) bits.push("thinking");
  if (input.mode === "agent") bits.push("agent");
  if (input.mode === "schrodinger") bits.push("Schrödinger");
  if (input.debate) bits.push("debate");
  return `${credits} credits (${bits.join(" · ")})`;
}

/** Whether the current plan permits this combination (before credits). */
export function planPermitsSend(plan: PlanDefinition, input: Omit<SendCostInput, "debate">): boolean {
  if (!plan.allowedModels.includes(input.model)) return false;
  if (input.thinking && !plan.features.thinking) return false;
  if (input.mode === "agent" && !plan.features.agent) return false;
  if (input.mode === "schrodinger" && !plan.features.schrodinger) return false;
  return true;
}
