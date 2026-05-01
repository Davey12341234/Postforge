import type { CreditsStateV1 } from "@/lib/credits-store";
import { PLANS } from "@/lib/plans";

export type UsageHint = { kind: string; message: string };

/** JSON from GET /api/credits when a renewal failed (client-safe). */
export type BillingAlertPayload = {
  kind: "payment_failed";
  at: string;
  message: string;
  attemptCount: number | null;
};

/** Lightweight heuristics for in-app guidance (no ML). */
export function computeUsageHints(wallet: CreditsStateV1): UsageHint[] {
  const hints: UsageHint[] = [];
  const monthly = PLANS[wallet.planId].monthlyCredits;
  const threshold = Math.max(30, Math.floor(monthly * 0.15));
  if (wallet.balance < threshold) {
    hints.push({
      kind: "low_credits",
      message: `Balance is low (${wallet.balance} credits). Larger models and thinking modes use more credits per reply; consider upgrading or spacing sends until your monthly refresh.`,
    });
  }
  return hints;
}
