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
    id: "chase-hughes-spark",
    keywords: [
      "chase",
      "hughes",
      "huges",
      "spark",
      "method",
      "inspired",
      "framework",
      "elicitation",
    ],
    title: "Chase Hughes–inspired Spark method",
    body:
      "BabyGPT’s Spark flow combines two layers: (1) seven intro questions to connect and understand you (see “Seven intro questions”), (2) seven Spark planning questions to lock the task, then Power templates and the Quantum bar so model, thinking, and tools match the job. Inspired by behavior-aware clarity work; implemented in-app—not an external course.",
  },
  {
    id: "intro-connect-seven",
    keywords: [
      "intro",
      "introduction",
      "connect",
      "connection",
      "rapport",
      "understand",
      "user",
      "you",
      "relationship",
      "empathy",
      "seven",
      "7",
      "questions",
    ],
    title: "Seven intro questions (connect & understand you)",
    body:
      "Ask these first in a fresh chat—or paste them before your main ask—so the model grounds in who you are and what matters emotionally and practically (different from the seven Spark task questions): (1) In your own words, what made you open this chat today? (2) What would make this conversation feel like a win when we’re done? (3) What have you already tried or ruled out? (4) What feels most unclear, stuck, or tense right now? (5) How urgent is this, and what deadline or pressure exists—if any? (6) Who else is affected by the outcome (team, family, customers)? (7) How do you like answers delivered—brief vs deep, direct vs gentle, with examples vs steps?",
  },
  {
    id: "search-inquiry-five",
    keywords: [
      "search",
      "mode",
      "styles",
      "style",
      "clarity",
      "discover",
      "precision",
      "perspective",
      "ground",
      "inquiry",
      "five",
      "5",
    ],
    title: "Five inquiry styles for search (incl. Clarity mode)",
    body:
      "These are short prefixes you can type at the start of a message (or paste into Plans → AI billing FAQ search) to steer how the assistant searches for understanding—not Cmd+K conversation search. (1) Clarity mode — “Clarity mode:” then your topic: mirror back what you heard, define terms, remove ambiguity before giving advice. (2) Discover mode — “Discover mode:” explore causes, options, and unknowns without forcing an early answer. (3) Precision mode — “Precision mode:” force decisions, criteria, constraints, and a single next step. (4) Perspective mode — “Perspective mode:” map stakeholders, tradeoffs, and alternate frames. (5) Ground-truth mode — “Ground-truth mode:” separate facts vs assumptions, ask what evidence would change the plan.",
  },
  {
    id: "spark-seven-questions",
    keywords: [
      "seven",
      "7",
      "questions",
      "spark",
      "checklist",
      "prompt",
      "one",
      "two",
      "three",
      "four",
      "five",
      "six",
    ],
    title: "The seven Spark task questions (1–7)",
    body:
      "Use after the intro connection questions when you are ready to define the work. Paste into the composer before the main ask: (1) What outcome do you need by the end of this session? (2) Who is the audience or decision-maker? (3) What hard constraints apply (time, tone, length, privacy)? (4) What does a “good enough” answer look like? (5) What context, links, or data should the model assume? (6) What risks, edge cases, or objections matter? (7) What deliverable shape do you want (bullets, essay, code, table, plan)? Pair with a Power template to lock model + toggles, then edit the draft line.",
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
    title: "Five core controls (deep think, focus, and quantum stack)",
    body:
      "(1) Thinking — chain-of-thought / extended reasoning when the provider supports it; streams to the thinking canvas. (2) Focus — use Power templates (composer “Power templates”) to set model, Thinking, Schrödinger, Agent, and Quantum flags in one tap so you concentrate on the prompt. (3) Schrödinger — two models race; the app keeps the stronger reply (Pro+). (4) Agent — tool-using loop for web/calculator-style tasks (plan-gated). (5) Quantum — Kolmogorov router, Holographic context folding, Eigenresponse/DNA style lock, and Adiabatic morph slider inside the Quantum menu (each tier unlocks pieces per plan).",
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
  "What is the Chase Hughes–inspired Spark method?",
  "What are the seven intro connection questions?",
  "What are the five inquiry styles including Clarity mode?",
  "What are the seven Spark task questions?",
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
