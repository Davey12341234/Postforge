import { lsKey } from "@/lib/storage";
import { DEFAULT_PLAN, FIRST_VISIT_CREDIT_BONUS, type PlanId } from "@/lib/plans";

const KEY = lsKey("credits_v1");

export interface CreditsStateV1 {
  version: 1;
  planId: PlanId;
  balance: number;
  /** YYYY-MM for monthly accrual tracking */
  accrualMonth: string;
  /** One-time welcome bonus applied */
  welcomeApplied: boolean;
}

export function creditMonthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function defaultState(): CreditsStateV1 {
  return {
    version: 1,
    planId: DEFAULT_PLAN,
    balance: 0,
    accrualMonth: creditMonthKey(),
    welcomeApplied: false,
  };
}

export function loadCreditsState(): CreditsStateV1 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const p = JSON.parse(raw) as CreditsStateV1;
    if (p?.version !== 1) return defaultState();
    return {
      ...defaultState(),
      ...p,
      planId: p.planId ?? DEFAULT_PLAN,
      balance: typeof p.balance === "number" && p.balance >= 0 ? Math.floor(p.balance) : 0,
      accrualMonth: typeof p.accrualMonth === "string" ? p.accrualMonth : creditMonthKey(),
      welcomeApplied: Boolean(p.welcomeApplied),
    };
  } catch {
    return defaultState();
  }
}

export function saveCreditsState(state: CreditsStateV1): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // quota
  }
}

/** Apply monthly grant + first-visit bonus. Import plan monthlyCredits inside caller to avoid circular deps. */
export function hydrateCredits(
  state: CreditsStateV1,
  monthlyCreditsForPlan: number,
): CreditsStateV1 {
  const next = { ...state };
  const m = creditMonthKey();
  if (next.accrualMonth !== m) {
    next.balance += monthlyCreditsForPlan;
    next.accrualMonth = m;
  }
  if (!next.welcomeApplied) {
    next.balance += FIRST_VISIT_CREDIT_BONUS;
    next.welcomeApplied = true;
  }
  return next;
}

export function setPlan(state: CreditsStateV1, planId: PlanId): CreditsStateV1 {
  return { ...state, planId };
}

export function adjustBalance(state: CreditsStateV1, delta: number): CreditsStateV1 {
  const balance = Math.max(0, state.balance + delta);
  return { ...state, balance };
}
