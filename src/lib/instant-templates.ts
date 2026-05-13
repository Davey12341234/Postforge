import type { PlanId } from "@/lib/plans";
import type { ModelTier } from "@/lib/types";

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro", "team"];

export function planRank(id: PlanId): number {
  const i = PLAN_ORDER.indexOf(id);
  return i === -1 ? 0 : i;
}

export type PowerTemplate = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  /** Minimum plan required to apply full settings */
  minPlan: PlanId;
  apply: {
    model: ModelTier;
    thinking: boolean;
    agentMode: boolean;
    schrodinger: boolean;
    quantum: { kolmogorov: boolean; holographic: boolean; dna: boolean; adiabatic: number };
    draft: string;
  };
};

export const POWER_TEMPLATES: PowerTemplate[] = [
  {
    id: "quick",
    title: "Quick answer",
    description: "Fastest path — Flash, no extras",
    emoji: "⚡",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: false,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "",
    },
  },
  {
    id: "explain-simple",
    title: "Explain simply",
    description: "Plain language + thinking stream",
    emoji: "💡",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Explain this in simple terms with one analogy:\n\n",
    },
  },
  {
    id: "deep-dive",
    title: "Deep dive",
    description: "Plus model + thinking + context folding",
    emoji: "🧭",
    minPlan: "starter",
    apply: {
      model: "glm-4-plus",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Give a structured deep dive with headings:\n\nTopic: ",
    },
  },
  {
    id: "debug-code",
    title: "Debug my code",
    description: "Plus + Agent + router",
    emoji: "🐛",
    minPlan: "starter",
    apply: {
      model: "glm-4-plus",
      thinking: true,
      agentMode: true,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Debug this code. List likely bugs, then minimal fixes:\n\n```\n\n```",
    },
  },
  {
    id: "doc-long",
    title: "Long document",
    description: "Long context + thinking",
    emoji: "📄",
    minPlan: "pro",
    apply: {
      model: "glm-4-long",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Summarize and extract action items from the following:\n\n",
    },
  },
  {
    id: "flagship",
    title: "Flagship reasoning",
    description: "GLM-4 + Agent + DNA style lock",
    emoji: "🚀",
    minPlan: "pro",
    apply: {
      model: "glm-4",
      thinking: true,
      agentMode: true,
      schrodinger: false,
      quantum: { kolmogorov: true, holographic: true, dna: true, adiabatic: 0.65 },
      draft: "Solve step-by-step with explicit assumptions:\n\n",
    },
  },
  {
    id: "schrodinger-race",
    title: "Two-model race",
    description: "Dual-model stream (Pro+)",
    emoji: "🔀",
    minPlan: "pro",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: true,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "Two perspectives on:\n\n",
    },
  },
  {
    id: "rewrite-pro",
    title: "Polish & tighten",
    description: "Air + holographic folding",
    emoji: "✍️",
    minPlan: "starter",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: true, dna: false, adiabatic: 0.5 },
      draft: "Rewrite for clarity and rhythm without changing meaning:\n\n",
    },
  },
  {
    id: "brainstorm",
    title: "Brainstorm",
    description: "Creative expansion — Air + thinking",
    emoji: "🌟",
    minPlan: "starter",
    apply: {
      model: "glm-4-air",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: true, dna: false, adiabatic: 0.45 },
      draft: "Brainstorm 10 distinct ideas for:\n\n",
    },
  },
  {
    id: "quiz-me",
    title: "Quiz me",
    description: "Learn mode — Flash + thinking",
    emoji: "❓",
    minPlan: "free",
    apply: {
      model: "glm-4-flash",
      thinking: true,
      agentMode: false,
      schrodinger: false,
      quantum: { kolmogorov: false, holographic: false, dna: false, adiabatic: 0.5 },
      draft: "After explaining, give me 3 quick self-check questions on:\n\n",
    },
  },
];
