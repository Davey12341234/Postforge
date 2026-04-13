export type FaqEntry = { id: string; keywords: string[]; title: string; body: string };

/** Static FAQ chunks for semantic-style matching (token overlap; no vector DB). */
export const BILLING_FAQ: FaqEntry[] = [
  {
    id: "cancel",
    keywords: ["cancel", "unsubscribe", "stop", "subscription", "end"],
    title: "Cancel or change plan",
    body: "Open Manage billing in the Plans modal to use the Stripe Customer Portal. There you can cancel, update payment methods, and download invoices. After canceling a paid plan, the app syncs to Free on the next webhook update.",
  },
  {
    id: "charge",
    keywords: ["charge", "charged", "bill", "invoice", "receipt", "payment", "why"],
    title: "Charges and receipts",
    body: "Subscription amounts are set by your Stripe Price and any tax at checkout. Stripe emails receipts when enabled in your Dashboard. Use Manage billing to see invoices and payment methods.",
  },
  {
    id: "failed",
    keywords: ["failed", "declined", "card", "past_due", "past due", "retry"],
    title: "Failed payment",
    body: "If a renewal fails, update your card in Manage billing. Stripe retries automatically on a schedule you configure in the Dashboard. The app may show an alert until payment succeeds.",
  },
  {
    id: "credits",
    keywords: ["credit", "credits", "balance", "usage", "month"],
    title: "Credits vs subscription",
    body: "Your plan sets which models and features you can use. Credits are spent per successful reply (see the composer preview). Monthly credit grants accrue according to server wallet rules in gated mode.",
  },
  {
    id: "refund",
    keywords: ["refund", "money back", "dispute"],
    title: "Refunds",
    body: "Refund policy is set by you as the merchant. Stripe supports refunds and disputes in the Dashboard. BabyGPT does not decide refund eligibility automatically.",
  },
  {
    id: "tax",
    keywords: ["tax", "vat", "gst", "sales tax", "automatic tax"],
    title: "Tax and VAT",
    body: "If STRIPE_CHECKOUT_AUTO_TAX is enabled and Stripe Tax is configured in your Dashboard, Checkout can calculate tax from the customer address. Otherwise totals follow your Stripe Price and regional rules you set in Stripe.",
  },
  {
    id: "upgrade",
    keywords: ["upgrade", "downgrade", "change plan", "switch plan", "different plan"],
    title: "Change or upgrade plan",
    body: "Use Subscribe with Stripe on a higher tier to start Checkout for that price. To downgrade or cancel, open Manage billing (Stripe Customer Portal) and pick a different subscription action.",
  },
  {
    id: "privacy",
    keywords: ["privacy", "data", "storage", "where", "retention"],
    title: "Data and privacy",
    body: "Chats and credits can live in this browser (localStorage) or on the server when BABYGPT_APP_PASSWORD is set. Community posts in this app are in-memory on the server and reset on restart. No separate cloud sync unless you add it.",
  },
  {
    id: "coupon",
    keywords: ["coupon", "promo", "code", "discount", "promotion"],
    title: "Coupons and promotions",
    body: "Stripe Checkout has allow_promotion_codes enabled when configured. Users can enter valid Stripe promotion codes on the hosted checkout page if you create them in the Stripe Dashboard.",
  },
  {
    id: "team",
    keywords: ["team", "business", "seats", "multiple users"],
    title: "Team plan",
    body: "Team is a subscription tier in this app with higher monthly credits and model access. It is still a single shared login unless you build multi-user accounts. Seat-based billing would require additional Stripe products and app logic.",
  },
  {
    id: "onboarding-chase-hughes",
    keywords: [
      "chase",
      "hughes",
      "huges",
      "method",
      "inspired",
      "framework",
      "elicitation",
      "onboarding",
      "letter",
      "mountaintop",
    ],
    title: "Chase Hughes–inspired onboarding (product direction)",
    body:
      "The onboarding flow uses behavior-aware, elicitation-style questioning sometimes associated with Chase Hughes’ work on clarity—not a licensed course. Full copy (opening hooks, 7 questions, reactions, skip, 6 paths, rituals, safety) is in docs/BabyGPT-Onboarding-Paths-Spec.md. The shipped chat UI is still a general assistant until that wizard is built.",
  },
  {
    id: "onboarding-seven-ordered",
    keywords: [
      "seven",
      "7",
      "questions",
      "order",
      "mountaintop",
      "perfect",
      "day",
      "habit",
      "forget",
      "help",
      "flow",
    ],
    title: "Seven onboarding questions (proposed order)",
    body:
      "(1) What's one thing you're really hoping I can help you with? (2) What's your mountaintop — that big thing you're ultimately working toward? (3) If you woke up tomorrow and your life was exactly how you want it, what would that perfect day look like? (4) What are the things you love doing so much that time just disappears? (5) What's the one habit you know would change everything if you actually stuck with it? (6) When you're finally on that mountaintop, what does a perfect day there actually feel like? (7) What's one thing about you that I should never forget? Principle: Q2 is the commitment question (mountaintop early). See the spec doc for dropout and rationale.",
  },
  {
    id: "onboarding-opening-hooks",
    keywords: ["opening", "hook", "opener", "curiosity", "value", "edge", "generic"],
    title: "Onboarding opening line — sharper hooks",
    body:
      "Problems with a generic warm opener: it doesn't earn 7 deep questions; 'most people' can sound preachy; vague futures lack urgency. Test variants: curiosity gap ('7 questions — most people can't answer Q3 honestly'); value upfront (letter from future you, 2 minutes, keep forever); anti-marketing (sign up vs 7 questions that change your week); direct (7 quick questions, then never again). Best openers: specific reward, named cost, reason to start now. Full table in docs/BabyGPT-Onboarding-Paths-Spec.md.",
  },
  {
    id: "onboarding-reactions",
    keywords: ["reaction", "warm", "mirror", "validate", "survey", "twist"],
    title: "Micro-reactions after each answer",
    body:
      "Avoid hollow praise. Each reaction should mirror their words, reveal a layer they didn't state, and tee up the next question. Examples: Q1 → name their thread; Q2 → 'that's a coordinate'; Q3 → 'notice what's missing — that's the gap'; Q4 → 'fuel gauge' for flow activities; Q5 → barrier to doing the habit; Q6 → 'finish line'; Q7 → 'written in ink.' Full good/bad table in the spec doc.",
  },
  {
    id: "onboarding-skip-letter",
    keywords: ["skip", "bounce", "enough", "letter", "conversion", "q3", "q4"],
    title: "Skip option — still get the letter",
    body:
      "After Q3 or Q4, offer: 'That's enough for me to start. We can go deeper anytime.' If they choose it, still generate the Letter from partial answers (less specific, still emotional). Don't let users exit onboarding with nothing—letter is the conversion artifact.",
  },
  {
    id: "paths-six-quick-fire",
    keywords: [
      "paths",
      "path",
      "quick",
      "fire",
      "deep",
      "talk",
      "future",
      "self",
      "mirror",
      "clarity",
      "anchor",
      "daily",
    ],
    title: "Six paths (incl. Quick Fire)",
    body:
      "Quick Fire — fast answers, no ceremony, many times daily ('I need a thing'). Deep Talk — full context, 1–2x daily. Future Self — talk to achieved-you, weekly. Life Mirror — mood reflection, daily. Clarity Engine — decisions, weekly. Daily Anchor — short check-in + habit, daily. Quick Fire prevents losing trivial tasks to other chat apps; it can still use light context (e.g. mountaintop) when relevant.",
  },
  {
    id: "daily-anchor-spec",
    keywords: ["streak", "mood", "emoji", "forgiveness", "pattern", "weekly"],
    title: "Daily Anchor — beyond streaks",
    body:
      "Use 5 emoji for mood (not 10). Add one-sentence AI tie to mountaintop. Show streak subtly; after 7 days show weekly mood pattern. If they miss a day, pause streak with gentle nudge—don't punish. Value the check-in itself, not only the counter.",
  },
  {
    id: "future-self-ritual",
    keywords: ["ritual", "time", "capsule", "archive", "mountaintop", "animation"],
    title: "Future Self — ritual design",
    body:
      "Differentiate from normal chat: entry transition; Future Self opens first using context; tone is perspective ('what I wish I'd known') not commands; optional time capsules (30/90/365 days); end each session with a paragraph saved to a 'Letters from the Mountaintop' archive so value compounds.",
  },
  {
    id: "clarity-four-cards",
    keywords: ["decision", "cards", "spread", "mirror", "scale", "consequence", "anchor", "101010"],
    title: "Clarity Engine — 4-card spread",
    body:
      "Named framework: Mirror (what does mountaintop say about this?), Scale (gain/loss), Consequence (10 min / 10 mo / 10 yr per option), Anchor (what would the person you're becoming choose?). Teaches a repeatable habit—not vague 'help me choose.'",
  },
  {
    id: "life-mirror-safety",
    keywords: ["safety", "crisis", "therapy", "spiral", "reflect", "redirect", "resource"],
    title: "Life Mirror — safety guardrails",
    body:
      "Reflect → Redirect → Resource. Validate, then agency ('one small thing today'), then resources if distress cues. Don't diagnose; position as thinking partner. Weekly summaries bias to growth. Crisis/self-harm language triggers warm, non-robotic escalation with resources.",
  },
  {
    id: "realignment-ninety",
    keywords: ["realignment", "90", "days", "evolve", "profile", "changed"],
    title: "90-day realignment",
    body:
      "Onboarding answers shouldn't freeze forever. Every ~90 days or on theme shift, offer 3 questions: mountaintop still true? what changed? anything new to never forget? Keeps the AI a mirror of who you're becoming, not a museum.",
  },
  {
    id: "ten-improvements-summary",
    keywords: ["improvements", "roadmap", "retention", "dropout", "conversion"],
    title: "Ten onboarding/path improvements (index)",
    body:
      "(1) Sharper opener (2) Reorder Qs — mountaintop Q2 (3) Reactions that reveal (4) Skip + letter (5) Quick Fire path (6) Daily Anchor depth (7) Future Self ritual (8) Clarity 4-card (9) Life Mirror safety (10) Realignment. Details: docs/BabyGPT-Onboarding-Paths-Spec.md.",
  },
  {
    id: "five-core-features",
    keywords: [
      "five",
      "5",
      "features",
      "deep",
      "think",
      "thinking",
      "focus",
      "template",
      "templates",
      "power",
      "schrodinger",
      "agent",
      "quantum",
      "kolmogorov",
      "holographic",
      "dna",
      "adiabatic",
    ],
    title: "Five core controls (Thinking, templates, Schrödinger, Agent, Quantum)",
    body:
      "(1) Thinking — chain-of-thought when supported; thinking canvas. (2) Power templates — one tap sets model + toggles. (3) Schrödinger — dual-model race (Pro+). (4) Agent — tool loop (plan-gated). (5) Quantum — Kolmogorov, Holographic, DNA, Adiabatic in the Quantum menu.",
  },
];

/** Short prompts shown as chips — match FAQ keywords for search. */
export const BILLING_SUGGESTED_QUESTIONS: string[] = [
  "How do I cancel my subscription?",
  "Why was I charged?",
  "What if my payment failed?",
  "How do credits work?",
  "How do I change my plan?",
  "Is tax included?",
  "What are the seven onboarding questions in order?",
  "What are the six paths including Quick Fire?",
  "How does skip after question 3 or 4 still give the letter?",
  "What is the Chase Hughes–inspired onboarding framework?",
  "How do Thinking, Power templates, and Quantum work together?",
];

function tokenize(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1),
  );
}

/** Returns top FAQ entries by simple overlap score (deterministic, fast). */
export function matchBillingFaq(query: string, limit = 4): FaqEntry[] {
  const q = tokenize(query);
  if (q.size === 0) return BILLING_FAQ.slice(0, limit);
  const scored = BILLING_FAQ.map((e) => {
    const kw = new Set(e.keywords.flatMap((k) => Array.from(tokenize(k))));
    let score = 0;
    for (const t of q) {
      if (kw.has(t)) score += 3;
      if (e.title.toLowerCase().includes(t)) score += 2;
      if (e.body.toLowerCase().includes(t)) score += 1;
    }
    return { e, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.filter((x) => x.score > 0).slice(0, limit).map((x) => x.e);
}
