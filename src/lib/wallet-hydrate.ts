import type { CreditsStateV1 } from "@/lib/credits-store";
import { DEFAULT_PLAN, FIRST_VISIT_CREDIT_BONUS, PLANS, type PlanId } from "@/lib/plans";

export function walletMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function defaultWalletState(): CreditsStateV1 {
  return {
    version: 1,
    planId: DEFAULT_PLAN,
    balance: 0,
    accrualMonth: walletMonthKey(),
    welcomeApplied: false,
  };
}

export function parseWalletJson(raw: string): CreditsStateV1 {
  try {
    const p = JSON.parse(raw) as CreditsStateV1;
    if (p?.version !== 1) return defaultWalletState();
    return {
      ...defaultWalletState(),
      ...p,
      planId: (p.planId ?? DEFAULT_PLAN) as PlanId,
      balance: typeof p.balance === "number" && p.balance >= 0 ? Math.floor(p.balance) : 0,
      accrualMonth: typeof p.accrualMonth === "string" ? p.accrualMonth : walletMonthKey(),
      welcomeApplied: Boolean(p.welcomeApplied),
    };
  } catch {
    return defaultWalletState();
  }
}

/** Monthly accrual + welcome — mirrors client `hydrateCredits`. */
export function hydrateServerWallet(state: CreditsStateV1): CreditsStateV1 {
  const next = { ...state };
  const m = walletMonthKey();
  const monthly = PLANS[next.planId].monthlyCredits;
  if (next.accrualMonth !== m) {
    next.balance += monthly;
    next.accrualMonth = m;
  }
  if (!next.welcomeApplied) {
    next.balance += FIRST_VISIT_CREDIT_BONUS;
    next.welcomeApplied = true;
  }
  return next;
}
