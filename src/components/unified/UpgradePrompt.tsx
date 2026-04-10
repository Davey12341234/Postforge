"use client";

import Link from "next/link";

export type UpgradePromptType =
  | "generation_limit"
  | "draft_limit"
  | "feature_gate"
  | "credits";

const COPY: Record<
  UpgradePromptType,
  { title: string; description: string; icon: string; benefits: string[]; cta: string }
> = {
  generation_limit: {
    title: "You’ve hit your generation limit",
    description:
      "Upgrade to keep creating with higher monthly caps and priority throughput.",
    icon: "⚡",
    benefits: [
      "More AI generations per billing period",
      "Higher unified credit allowance",
      "Unlock Pro analytics",
    ],
    cta: "View plans & upgrade",
  },
  draft_limit: {
    title: "Draft storage is full",
    description: "Free plans cap saved drafts. Upgrade for larger libraries.",
    icon: "📝",
    benefits: ["More cloud drafts", "Better organization", "Team-ready limits"],
    cta: "Upgrade storage",
  },
  feature_gate: {
    title: "This feature needs Pro",
    description: "Your current plan doesn’t include this capability yet.",
    icon: "🔒",
    benefits: ["Advanced workflows", "Batch tools", "Priority support"],
    cta: "Unlock features",
  },
  credits: {
    title: "Not enough credits",
    description: "Add credits or upgrade to continue using AI features.",
    icon: "💎",
    benefits: ["Larger credit pools", "Predictable billing", "Scale with usage"],
    cta: "Add credits / upgrade",
  },
};

export default function UpgradePrompt({
  type,
  onDismiss,
}: {
  type: UpgradePromptType;
  onDismiss?: () => void;
}) {
  const msg = COPY[type];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600" />

        <div className="pt-2 text-center">
          <div className="mb-3 text-4xl" aria-hidden>
            {msg.icon}
          </div>
          <h2 className="text-xl font-bold text-white">{msg.title}</h2>
          <p className="mt-2 text-sm text-zinc-400">{msg.description}</p>
        </div>

        <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-950/30 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-200">
            With a paid plan
          </p>
          <ul className="space-y-2 text-sm text-zinc-300">
            {msg.benefits.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="text-emerald-400">✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 space-y-2">
          <Link
            href="/unified/pricing"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-center text-sm font-semibold text-white hover:from-indigo-500 hover:to-violet-500"
          >
            {msg.cta}
            <span aria-hidden>→</span>
          </Link>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2 text-sm text-zinc-500 hover:text-zinc-300"
            >
              Maybe later
            </button>
          )}
        </div>

        <p className="mt-4 border-t border-zinc-800 pt-4 text-center text-xs text-zinc-600">
          Checkout is processed by Stripe. Configure keys in production.
        </p>
      </div>
    </div>
  );
}
