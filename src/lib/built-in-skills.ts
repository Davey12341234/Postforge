import type { Skill } from "./skill-model";

export const BUILT_IN_SKILLS: Skill[] = [
  {
    id: "prd",
    name: "Write a PRD",
    description: "Turn a rough idea into a structured product requirements document with goals and risks.",
    prompt:
      "Write a concise PRD with: problem, goals, non-goals, users, user stories, metrics, rollout risks, open questions.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "review",
    name: "Code Review",
    description: "Review code for correctness, edge cases, security, and readability with actionable notes.",
    prompt:
      "Perform a thorough code review. Call out bugs, security issues, performance, tests to add, and suggest refactors.",
    category: "Engineering",
    builtIn: true,
  },
  {
    id: "eli5",
    name: "Explain Like I'm 5",
    description: "Explain complex topics using simple analogies and short sentences.",
    prompt: "Explain the topic as if to a curious beginner. Use analogies, avoid jargon, keep it short.",
    category: "Learning",
    builtIn: true,
  },
  {
    id: "debate",
    name: "Debate Both Sides",
    description: "Argue both sides fairly, then give a balanced takeaway.",
    prompt:
      "Present the strongest case FOR and AGAINST. Then summarize tradeoffs and what you'd recommend and why.",
    category: "Reasoning",
    builtIn: true,
  },
  {
    id: "summarize",
    name: "Summarize",
    description: "Summarize long text into bullets with key claims and unknowns.",
    prompt:
      "Summarize with: key points, assumptions, risks, and a tight executive summary at the top.",
    category: "Writing",
    builtIn: true,
  },
  {
    id: "tutorial",
    name: "Create Tutorial",
    description: "Create a step-by-step tutorial with prerequisites and checkpoints.",
    prompt:
      "Write a tutorial with prerequisites, numbered steps, expected outputs, troubleshooting, and next steps.",
    category: "Learning",
    builtIn: true,
  },
  {
    id: "brainstorm",
    name: "Brainstorm",
    description: "Generate diverse ideas, constraints, and evaluation criteria.",
    prompt:
      "Brainstorm options, include constraints, rank by impact/effort, and propose 3 next experiments.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "debug",
    name: "Debug This",
    description: "Systematically debug errors with hypotheses and minimal repro steps.",
    prompt:
      "Debug systematically: restate symptoms, hypotheses, quick checks, likely root cause, fix, and validation steps.",
    category: "Engineering",
    builtIn: true,
  },
  {
    id: "risk",
    name: "Risk Review",
    description: "Identify operational and product risks with mitigations.",
    prompt: "List risks (likelihood/impact), mitigations, monitoring signals, and rollback plans.",
    category: "Product",
    builtIn: true,
  },
  {
    id: "rewrite",
    name: "Polish Writing",
    description: "Improve clarity, tone, and structure without changing meaning.",
    prompt: "Rewrite for clarity and tone. Keep meaning. Note important caveats if any.",
    category: "Writing",
    builtIn: true,
  },
];
