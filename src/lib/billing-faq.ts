export type FaqEntry = { id: string; keywords: string[]; title: string; body: string };

/** Stripe / subscription FAQ only — life-coach onboarding lives in src/lib/companion-onboarding.ts + WelcomeScreen. */
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
    body: "Refund policy is set by you as the merchant. Stripe supports refunds and disputes in the Dashboard. bbGPT does not decide refund eligibility automatically.",
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
];

/** Chips for Plans modal — subscription and payment help only. */
export const BILLING_SUGGESTED_QUESTIONS: string[] = [
  "How do I cancel my subscription?",
  "Why was I charged?",
  "What if my payment failed?",
  "How do credits work?",
  "How do I change my plan?",
  "Is tax included?",
  "How is my data stored?",
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

/** Returns top billing FAQ entries by simple overlap score (deterministic, fast). */
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
