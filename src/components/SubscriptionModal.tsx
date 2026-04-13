"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import type { UsageHint } from "@/lib/billing-usage-hints";
import { FIRST_VISIT_CREDIT_BONUS, PLANS, type PlanId } from "@/lib/plans";
import { formatPlanMoneyHeadline, planPriceConfigured } from "@/lib/plan-pricing-display";
import { BILLING_FAQ, BILLING_SUGGESTED_QUESTIONS } from "@/lib/billing-faq";

export type StripeBillingInfo = {
  configured: boolean;
  customerId: string | null;
  subscriptionStatus: string | null;
};

export function SubscriptionModal({
  open,
  currentPlanId,
  balance,
  onClose,
  onSelectPlan,
  serverCredits = false,
  stripeBilling = null,
  onCheckout,
  onManageBilling,
  usageHints = [],
}: {
  open: boolean;
  currentPlanId: PlanId;
  balance: number;
  onClose: () => void;
  onSelectPlan: (id: PlanId) => void | Promise<void>;
  /** Server wallet from /api/credits (gate on). */
  serverCredits?: boolean;
  /** Present when credits API returned stripe payload. */
  stripeBilling?: StripeBillingInfo | null;
  onCheckout?: (id: Exclude<PlanId, "free">) => void | Promise<void>;
  onManageBilling?: () => void | Promise<void>;
  /** Heuristic hints from GET /api/credits (low credits, payment retry, etc.). */
  usageHints?: UsageHint[];
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [copilotQ, setCopilotQ] = useState("");
  const [copilotA, setCopilotA] = useState<string | null>(null);
  const [copilotBusy, setCopilotBusy] = useState(false);
  const [supportQ, setSupportQ] = useState("");
  const [supportA, setSupportA] = useState<string | null>(null);
  const [supportBusy, setSupportBusy] = useState(false);
  const [trText, setTrText] = useState("");
  const [trLocale, setTrLocale] = useState("Japanese");
  const [trOut, setTrOut] = useState<string | null>(null);
  const [trBusy, setTrBusy] = useState(false);
  const [faqPick, setFaqPick] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCopilotA(null);
    setSupportA(null);
    setTrOut(null);
    setFaqPick(null);
  }, [open]);

  useDialogA11y(open, dialogRef, onClose);

  if (!open) return null;

  const stripeMode = Boolean(serverCredits && stripeBilling?.configured);
  const missingPublicPrices = stripeMode && (["starter", "pro", "team"] as const).some((id) => !planPriceConfigured(id));

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div
        ref={dialogRef}
        className="w-full max-w-4xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl ring-1 ring-white/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="babygpt-plans-title"
      >
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-900 px-5 py-4">
          <div>
            <div id="babygpt-plans-title" className="text-sm font-semibold text-zinc-100">
              Plans & credits
            </div>
            <p className="mt-1 max-w-xl text-xs text-zinc-500">
              {stripeMode ? (
                <>
                  Paid tiers use <span className="text-zinc-300">Stripe Checkout</span> — you&apos;ll confirm tax,
                  currency, and the final total on Stripe&apos;s page. The table below is your public list price (set{" "}
                  <span className="font-mono text-zinc-400">NEXT_PUBLIC_PLAN_PRICE_*_USD</span>) plus monthly credits
                  included in-app.
                </>
              ) : (
                <>
                  Credits estimate cost per reply (models, thinking, agent, and dual-model modes). Your plan unlocks
                  which models and features you can use. Without a gated deploy, plan and balance stay in this browser
                  for development.
                </>
              )}
            </p>
            {missingPublicPrices && stripeMode ? (
              <p className="mt-2 text-[11px] text-amber-400/90">
                Set <span className="font-mono">NEXT_PUBLIC_PLAN_PRICE_STARTER_USD</span>,{" "}
                <span className="font-mono">PRO</span>, and <span className="font-mono">TEAM</span> so list prices show
                here (Checkout still shows Stripe&apos;s authoritative amount).
              </p>
            ) : null}
            {serverCredits && !stripeBilling?.configured ? (
              <p className="mt-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] leading-snug text-amber-100/95">
                <span className="font-semibold text-amber-50">No Subscribe / Pay button?</span> Paid checkout only
                appears after the server has <span className="font-mono text-amber-200/90">STRIPE_SECRET_KEY</span> set
                (Vercel → Environment Variables → Production). Until then, the modal shows{" "}
                <span className="italic">Use this plan</span> and the server accepts plan changes without payment (dev /
                staging). Add Stripe keys + <span className="font-mono">STRIPE_PRICE_*</span> price IDs, redeploy, then
                use <span className="italic">Subscribe with Stripe</span>.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {stripeMode && stripeBilling?.customerId && onManageBilling ? (
              <button
                type="button"
                className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-white"
                onClick={() => void onManageBilling()}
              >
                Manage billing
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 ring-1 ring-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="border-b border-zinc-900 bg-zinc-950/90 px-5 py-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Price breakdown (USD)</div>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[11px] text-zinc-400">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-1.5 pr-2 font-medium">Plan</th>
                  <th className="py-1.5 pr-2 font-medium">List price</th>
                  <th className="py-1.5 font-medium">Credits / month</th>
                </tr>
              </thead>
              <tbody>
                {(Object.keys(PLANS) as PlanId[]).map((id) => {
                  const p = PLANS[id];
                  return (
                    <tr key={id} className="border-b border-zinc-800/80 last:border-0">
                      <td className="py-2 pr-2 text-zinc-200">{p.label}</td>
                      <td className="py-2 pr-2 font-mono text-emerald-300/95">{formatPlanMoneyHeadline(id)}</td>
                      <td className="py-2 font-mono text-zinc-300">{p.monthlyCredits.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[10px] text-zinc-600">
            {stripeMode ? (
              <>
                Subscription charges are processed by Stripe. Per-message credits are drawn from your wallet after each
                successful reply (see composer preview).
              </>
            ) : (
              <>
                List prices default to $12 / $24 / $69 per month when{" "}
                <span className="font-mono text-zinc-400">NEXT_PUBLIC_PLAN_PRICE_*_USD</span> is not set — override to
                match your Stripe recurring prices.
              </>
            )}
          </p>
          <p className="mt-2 text-[10px] text-zinc-500">
            Reference only: ChatGPT Plus is often ~$20/mo — not a feature comparison. Set{" "}
            <span className="font-mono text-zinc-400">NEXT_PUBLIC_PLAN_PRICE_*_USD</span> for exact public list prices.
          </p>
        </div>

        <div className="border-b border-zinc-900 bg-zinc-950/80 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
            <span>
              Balance: <span className="font-mono text-cyan-300">{balance.toLocaleString()}</span> credits
            </span>
            <span>
              Active plan: <span className="text-zinc-200">{PLANS[currentPlanId].label}</span>
            </span>
            {stripeMode && stripeBilling?.subscriptionStatus ? (
              <span>
                Stripe:{" "}
                <span className="font-mono text-zinc-300">{stripeBilling.subscriptionStatus}</span>
              </span>
            ) : null}
            {!serverCredits ? (
              <span className="text-zinc-600">
                One-time welcome: +{FIRST_VISIT_CREDIT_BONUS} credits on first local setup (per browser)
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4">
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            const active = id === currentPlanId;
            const paid = id !== "free";

            let primary: ReactNode;
            if (!stripeMode) {
              primary = (
                <button
                  type="button"
                  disabled={active}
                  onClick={() => onSelectPlan(id)}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-semibold ${
                    active
                      ? "cursor-default bg-zinc-800 text-zinc-500"
                      : "bg-zinc-100 text-zinc-950 hover:bg-white"
                  }`}
                >
                  {active ? "Current" : "Use this plan"}
                </button>
              );
            } else if (paid) {
              primary = (
                <button
                  type="button"
                  disabled={active || !onCheckout}
                  onClick={() => {
                    if (active || !onCheckout) return;
                    void onCheckout(id);
                  }}
                  className={`mt-4 w-full rounded-xl py-2 text-xs font-semibold ${
                    active
                      ? "cursor-default bg-zinc-800 text-zinc-500"
                      : "bg-zinc-100 text-zinc-950 hover:bg-white"
                  }`}
                >
                  {active ? "Current" : "Subscribe with Stripe"}
                </button>
              );
            } else {
              primary =
                active ? (
                  <button
                    type="button"
                    disabled
                    className="mt-4 w-full cursor-default rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-500"
                  >
                    Current
                  </button>
                ) : (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] leading-snug text-zinc-500">
                      To use Free, cancel any paid subscription in the billing portal (Stripe syncs your plan).
                    </p>
                    {stripeBilling?.customerId && onManageBilling ? (
                      <button
                        type="button"
                        onClick={() => void onManageBilling()}
                        className="w-full rounded-xl bg-zinc-800 py-2 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700"
                      >
                        Open billing portal
                      </button>
                    ) : (
                      <p className="text-[10px] text-zinc-600">
                        No active Stripe subscription on this account — pick a paid tier above to subscribe.
                      </p>
                    )}
                  </div>
                );
            }

            return (
              <div
                key={id}
                className={`flex flex-col rounded-2xl border p-4 ${
                  active ? "border-cyan-500/40 bg-cyan-500/5 ring-1 ring-cyan-500/20" : "border-zinc-800 bg-zinc-950/40"
                }`}
              >
                <div className="text-sm font-semibold text-zinc-100">{p.label}</div>
                <div className="mt-1 text-[11px] text-zinc-500">{p.subtitle}</div>
                <div className="mt-2 text-base font-semibold text-emerald-300/95">{formatPlanMoneyHeadline(id)}</div>
                <div className="mt-1 text-xs text-zinc-400">
                  <span className="font-mono text-zinc-200">{p.monthlyCredits.toLocaleString()}</span> credits / month
                </div>
                <ul className="mt-3 flex-1 space-y-1.5 text-[11px] text-zinc-500">
                  <li>
                    Models: <span className="text-zinc-300">{p.allowedModels.join(", ")}</span>
                  </li>
                  <li>
                    Agent: {p.features.agent ? <span className="text-emerald-400">yes</span> : <span className="text-zinc-600">no</span>}
                    {" · "}
                    Schrödinger:{" "}
                    {p.features.schrodinger ? <span className="text-emerald-400">yes</span> : <span className="text-zinc-600">no</span>}
                  </li>
                  <li>
                    Quantum: K {p.features.kolmogorov ? "✓" : "—"} · H {p.features.holographic ? "✓" : "—"} · DNA{" "}
                    {p.features.dna ? "✓" : "—"}
                  </li>
                </ul>
                {primary}
              </div>
            );
          })}
        </div>

        <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
          <div className="text-xs font-semibold text-zinc-200">Billing & subscription help</div>
          <p className="mt-1 text-[11px] leading-snug text-zinc-500">
            Topics below are about payments, credits, and your plan — not life-coach onboarding (that lives on the home
            screen when you have no messages). For AI-paraphrased help, use Search FAQ. For Stripe-specific account
            details when signed in, use Ask copilot.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {BILLING_FAQ.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => setFaqPick((p) => (p === e.id ? null : e.id))}
                className={`rounded-full px-3 py-1.5 text-[11px] font-medium ring-1 transition-colors ${
                  faqPick === e.id
                    ? "bg-cyan-900/40 text-cyan-100 ring-cyan-700"
                    : "bg-zinc-900 text-zinc-300 ring-zinc-800 hover:bg-zinc-800"
                }`}
              >
                {e.title}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-medium uppercase tracking-wide text-zinc-500">Suggested questions</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {BILLING_SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setSupportQ(q);
                  setFaqPick(null);
                }}
                className="rounded-lg bg-zinc-900/80 px-2.5 py-1.5 text-left text-[10px] leading-snug text-zinc-400 ring-1 ring-zinc-800 hover:text-zinc-200"
              >
                {q}
              </button>
            ))}
          </div>
          {faqPick ? (
            <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-3 text-[11px] leading-relaxed text-zinc-300">
              <div className="font-semibold text-zinc-100">{BILLING_FAQ.find((x) => x.id === faqPick)?.title}</div>
              <p className="mt-2">{BILLING_FAQ.find((x) => x.id === faqPick)?.body}</p>
            </div>
          ) : null}
        </div>

        {serverCredits ? (
          <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
            <div className="text-xs font-semibold text-zinc-200">Account billing assistant</div>
            <p className="mt-1 text-[11px] leading-snug text-zinc-500">
              Copilot reads Stripe data for this login. Not legal or tax advice.
            </p>
            {usageHints.length > 0 ? (
              <ul className="mt-3 list-inside list-disc space-y-1 text-[11px] text-zinc-400">
                {usageHints.map((h) => (
                  <li key={`${h.kind}-${h.message.slice(0, 40)}`}>{h.message}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 space-y-2">
              <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                Your subscription (Stripe-backed)
              </label>
              <textarea
                value={copilotQ}
                onChange={(e) => setCopilotQ(e.target.value)}
                placeholder="e.g. When does my current period renew?"
                rows={2}
                className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
              />
              <button
                type="button"
                disabled={copilotBusy || !copilotQ.trim()}
                onClick={async () => {
                  setCopilotBusy(true);
                  setCopilotA(null);
                  try {
                    const res = await fetch("/api/billing/copilot", {
                      method: "POST",
                      credentials: "include",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ question: copilotQ.trim() }),
                    });
                    const data = (await res.json()) as { answer?: string; error?: string };
                    if (!res.ok) {
                      setCopilotA(data.error ?? "Could not reach billing assistant.");
                      return;
                    }
                    setCopilotA(data.answer ?? "");
                  } catch {
                    setCopilotA("Network error.");
                  } finally {
                    setCopilotBusy(false);
                  }
                }}
                className="rounded-lg bg-cyan-900/40 px-3 py-1.5 text-xs font-semibold text-cyan-100 ring-1 ring-cyan-800/80 hover:bg-cyan-900/55 disabled:opacity-40"
              >
                {copilotBusy ? "Thinking…" : "Ask copilot"}
              </button>
              {copilotA ? (
                <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                  {copilotA}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="border-t border-zinc-900 bg-zinc-950/90 px-5 py-4">
          <div className="text-xs font-semibold text-zinc-200">AI billing FAQ search</div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Paraphrases matched help articles. Works without login when the app has no password gate.
          </p>
          <div className="mt-4 space-y-2">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Search billing FAQ
            </label>
            <textarea
              value={supportQ}
              onChange={(e) => setSupportQ(e.target.value)}
              placeholder="e.g. How do I cancel?"
              rows={2}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <button
              type="button"
              disabled={supportBusy || !supportQ.trim()}
              onClick={async () => {
                setSupportBusy(true);
                setSupportA(null);
                try {
                  const res = await fetch("/api/billing/support", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query: supportQ.trim() }),
                  });
                  const data = (await res.json()) as { answer?: string; error?: string };
                  if (!res.ok) {
                    setSupportA(data.error ?? "FAQ search failed.");
                    return;
                  }
                  setSupportA(data.answer ?? "");
                } catch {
                  setSupportA("Network error.");
                } finally {
                  setSupportBusy(false);
                }
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-40"
            >
              {supportBusy ? "Searching…" : "Search FAQ"}
            </button>
            {supportA ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                {supportA}
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-2 border-t border-zinc-900 pt-4">
            <label className="block text-[10px] font-medium uppercase tracking-wide text-zinc-500">
              Translate UI text (localization)
            </label>
            <input
              type="text"
              value={trLocale}
              onChange={(e) => setTrLocale(e.target.value)}
              placeholder="Target language or locale"
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <textarea
              value={trText}
              onChange={(e) => setTrText(e.target.value)}
              placeholder="English string to translate"
              rows={2}
              className="w-full resize-y rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-cyan-700 focus:outline-none"
            />
            <button
              type="button"
              disabled={trBusy || !trText.trim()}
              onClick={async () => {
                setTrBusy(true);
                setTrOut(null);
                try {
                  const res = await fetch("/api/billing/translate", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: trText.trim(), targetLocale: trLocale.trim() || "Spanish" }),
                  });
                  const data = (await res.json()) as { translation?: string; error?: string };
                  if (!res.ok) {
                    setTrOut(data.error ?? "Translation failed.");
                    return;
                  }
                  setTrOut(data.translation ?? "");
                } catch {
                  setTrOut("Network error.");
                } finally {
                  setTrBusy(false);
                }
              }}
              className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 ring-1 ring-zinc-700 hover:bg-zinc-700 disabled:opacity-40"
            >
              {trBusy ? "Translating…" : "Translate"}
            </button>
            {trOut ? (
              <p className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-[11px] leading-relaxed text-zinc-300">
                {trOut}
              </p>
            ) : null}
          </div>
        </div>

        <div className="border-t border-zinc-900 px-5 py-3 text-[11px] text-zinc-600">
          Higher tiers unlock larger models and heavier modes; each send still spends credits from your balance so usage
          stays predictable.
        </div>
      </div>
    </div>
  );
}
