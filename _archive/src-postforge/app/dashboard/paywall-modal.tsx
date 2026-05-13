"use client";

import { PLAN_LIMITS } from "@/lib/constants";
import type { PlanLimitKey } from "@/lib/constants";

const LIMIT_LABELS: Record<PlanLimitKey, string> = {
  brands: "Brands",
  credits: "AI credits",
  seats: "Seats",
  analyticsRetentionDays: "Analytics retention (days)",
  connectedAccounts: "Connected accounts",
  monthlyAiRuns: "AI runs / month",
  scheduledPosts: "Scheduled posts",
};

export default function PaywallModal({
  isOpen,
  onClose,
  limitHit,
}: {
  isOpen: boolean;
  onClose: () => void;
  limitHit: PlanLimitKey;
}) {
  if (!isOpen) return null;

  const free = PLAN_LIMITS.FREE;
  const pro = PLAN_LIMITS.PRO;
  const label = LIMIT_LABELS[limitHit] ?? limitHit;
  const freeVal = free[limitHit];
  const proVal = pro[limitHit];

  const rows: { key: PlanLimitKey; label: string }[] = (
    Object.keys(free) as PlanLimitKey[]
  ).map((key) => ({
    key,
    label: LIMIT_LABELS[key],
  }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-900 p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <h2
            id="paywall-title"
            className="text-2xl font-bold text-white"
          >
            Limit reached
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-2xl leading-none text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <p className="mb-6 text-zinc-300">
          You hit your plan limit on{" "}
          <span className="font-semibold text-emerald-400">{label}</span> (Free{" "}
          <span className="tabular-nums text-white">{String(freeVal)}</span> →
          Pro{" "}
          <span className="tabular-nums text-emerald-300">{String(proVal)}</span>
          ).
        </p>

        <div className="mb-6 overflow-hidden rounded-xl border border-zinc-700">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-700 bg-zinc-800/80">
                <th className="px-4 py-3 font-semibold text-zinc-300">Feature</th>
                <th className="px-4 py-3 font-semibold text-zinc-400">Free</th>
                <th className="px-4 py-3 font-semibold text-emerald-400">Pro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ key, label: rowLabel }) => (
                <tr
                  key={key}
                  className={`border-b border-zinc-800 last:border-b-0 ${key === limitHit ? "bg-emerald-500/10" : ""}`}
                >
                  <td className="px-4 py-2.5 text-zinc-300">{rowLabel}</td>
                  <td className="px-4 py-2.5 tabular-nums text-zinc-400">
                    {String(free[key])}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums text-white">
                    {String(pro[key])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mb-4 text-center text-xs text-zinc-500">
          Highlighted row matches the limit you just hit.
        </p>

        <button
          type="button"
          className="w-full rounded-lg bg-emerald-500 py-3 font-bold text-zinc-950 hover:bg-emerald-400"
        >
          Upgrade to Pro — $29/mo
        </button>
      </div>
    </div>
  );
}
