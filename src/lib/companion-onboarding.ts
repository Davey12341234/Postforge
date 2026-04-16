/**
 * Life-coach / AI companion onboarding copy — not billing.
 * Shown on the welcome (empty chat) screen. Full narrative: docs/BabyGPT-Onboarding-Paths-Spec.md
 */

export const COMPANION_WELCOME_LEAD =
  "BabyGPT is built to be an AI companion: quick help when you need it, and space to think clearly about your life and goals. Start with the questions below, or jump in with a mode prefix.";

/** Seven intro questions — connect and understand before heavy strategy. */
export const INTRO_SEVEN_QUESTIONS: string[] = [
  "Why are you here right now — what made you open this chat?",
  "What are we hoping to figure out together; what would “this helped” look like?",
  "What have you already tried, and what patterns feel conditioned or repeated?",
  "What sucks the most about how things stand — where’s it stuck or heavy?",
  "How urgent is this: deadlines, stakes, or pressure if nothing changes?",
  "Who else is affected by how this turns out (team, family, customers, future you)?",
  "How should I talk with you — preferred tone and format: direct vs gentle, brief vs deep, examples vs steps?",
];

/** Deeper journey (mountaintop arc) — after rapport, when you want vision / letter work. */
export const JOURNEY_SEVEN_QUESTIONS: string[] = [
  "What’s one thing you’re really hoping I can help you with?",
  "What’s your mountaintop — that big thing you’re ultimately working toward?",
  "If you woke up tomorrow and your life was exactly how you want it, what would that perfect day look like?",
  "What are the things you love doing so much that time just disappears?",
  "What’s the one habit you know would change everything if you actually stuck with it?",
  "When you’re finally on that mountaintop, what does a perfect day there actually feel like?",
  "What’s one thing about you that I should never forget?",
];

/** Lead a message with one line so the model stays in that mode. */
export const MESSAGE_MODE_PREFIXES: { id: string; label: string; prefix: string; hint: string }[] = [
  {
    id: "fact",
    label: "Fact search",
    prefix: "Fact search:",
    hint: "Verifiable info, sources, dates; say when uncertain.",
  },
  {
    id: "clarity",
    label: "Clarity",
    prefix: "Clarity mode:",
    hint: "Define terms, remove ambiguity, confirm before advice.",
  },
  {
    id: "discover",
    label: "Discover",
    prefix: "Discover mode:",
    hint: "Widen options; no forced early answer.",
  },
  {
    id: "precision",
    label: "Precision",
    prefix: "Precision mode:",
    hint: "Decisions, criteria, one next step.",
  },
  {
    id: "perspective",
    label: "Perspective",
    prefix: "Perspective mode:",
    hint: "Stakeholders, tradeoffs, alternate frames.",
  },
];

/** Short product controls reminder (not billing). */
export const CORE_CONTROLS_SUMMARY =
  "Header bar: model, Thinking, Two models (dual stream), Agent, and Quantum (Kolmogorov, Holographic, DNA, Adiabatic). Power templates set several at once.";
