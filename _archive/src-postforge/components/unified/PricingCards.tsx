"use client";

import { useState } from "react";

const PLANS = [
  {
    id: "pro" as const,
    name: "Pro",
    price: "$29",
    period: "/month",
    blurb: "Best for creators shipping weekly content.",
    features: [
      "Higher generation limits",
      "Priority AI responses",
      "Analytics snapshot",
    ],
    highlight: true,
  },
  {
    id: "business" as const,
    name: "Business",
    price: "$99",
    period: "/month",
    blurb: "Teams and growing brands.",
    features: ["Team-ready limits", "Advanced analytics", "Shared workspace"],
    highlight: false,
  },
  {
    id: "enterprise" as const,
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "SLA, security review, and custom terms.",
    features: ["Dedicated support", "Custom contract", "Optional on-prem"],
    highlight: false,
  },
];

const FAQ = [
  {
    q: "Can I change plans anytime?",
    a: "Upgrades apply on the next successful checkout. Downgrades follow your Stripe subscription rules.",
  },
  {
    q: "What if I run out of credits?",
    a: "Free and paid limits reset each billing period. You can upgrade or add packs when we enable them.",
  },
  {
    q: "Is my data secure?",
    a: "Content stays in your workspace. Use HTTPS in production and restrict API keys.",
  },
];

export default function PricingCards() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(planId: (typeof PLANS)[number]["id"]) {
    setError(null);
    setLoading(planId);
    try {
      const res = await fetch("/api/unified/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, mode: "subscription" }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Checkout failed");
      }
      if (data.url && typeof data.url === "string") {
        window.location.href = data.url;
        return;
      }
      throw new Error(
        "No checkout URL returned. Set STRIPE_SECRET_KEY and STRIPE_PRICE_* for this plan.",
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Checkout error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-zinc-100 sm:text-4xl">
          Simple pricing
        </h1>
        <p className="mt-3 text-zinc-400">
          Secure checkout powered by Stripe. Configure{" "}
          <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-sm">
            STRIPE_PRICE_*
          </code>{" "}
          in production.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-3 text-center text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`flex flex-col rounded-2xl border p-6 ${
              plan.highlight
                ? "border-indigo-500/50 bg-indigo-950/20 shadow-lg shadow-indigo-500/10"
                : "border-zinc-800 bg-zinc-900/40"
            }`}
          >
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white">{plan.name}</h2>
              <p className="mt-1 text-sm text-zinc-500">{plan.blurb}</p>
            </div>
            <div className="mb-6 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-white">
                {plan.price}
              </span>
              <span className="text-sm text-zinc-500">{plan.period}</span>
            </div>
            <ul className="mb-8 flex-1 space-y-2 text-sm text-zinc-300">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void startCheckout(plan.id)}
              className={`w-full rounded-xl py-3 text-sm font-semibold transition-colors ${
                plan.highlight
                  ? "bg-indigo-600 text-white hover:bg-indigo-500"
                  : "border border-zinc-700 bg-zinc-800 text-white hover:bg-zinc-700"
              } disabled:opacity-50`}
            >
              {loading === plan.id ? "Redirecting…" : `Choose ${plan.name}`}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-14 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8">
        <h2 className="mb-8 text-center text-2xl font-bold text-white">
          FAQ
        </h2>
        <div className="space-y-6">
          {FAQ.map((item) => (
            <div
              key={item.q}
              className="border-b border-zinc-800 pb-6 last:border-0 last:pb-0"
            >
              <h3 className="font-semibold text-zinc-100">{item.q}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {item.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 text-center text-xs text-zinc-600">
        Payments subject to Stripe availability in your region.
      </p>
    </div>
  );
}
