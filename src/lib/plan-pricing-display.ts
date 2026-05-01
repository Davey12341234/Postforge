import type { PlanBillingCadence, PlanId } from "@/lib/plans";

export type { PlanBillingCadence };

/**
 * When `NEXT_PUBLIC_PLAN_PRICE_*_USD` is unset, these USD/month anchors are used so the Plans modal
 * always shows amounts (same defaults as `.env.local.example`). Set env in production to match Stripe.
 */
const DEFAULT_LIST_PRICE_USD: Record<Exclude<PlanId, "free">, number> = {
  starter: 12,
  pro: 24,
  team: 69,
};

/**
 * Default annual **list** prices (USD/year) when env not set — roughly **two months free**
 * vs paying the monthly list price × 12 (Starter 12×10=120, etc.).
 */
const DEFAULT_ANNUAL_LIST_PRICE_USD: Record<Exclude<PlanId, "free">, number> = {
  starter: 120,
  pro: 240,
  team: 690,
};

function centsFromUsdString(raw: string | undefined): number | null {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/**
 * Public marketing/list prices (USD / month) — must match what you configure in Stripe Products.
 * Env overrides; otherwise built-in defaults above.
 */
export function getMonthlyUsdCents(planId: PlanId): number | null {
  if (planId === "free") return 0;
  const raw =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_PLAN_PRICE_STARTER_USD
      : planId === "pro"
        ? process.env.NEXT_PUBLIC_PLAN_PRICE_PRO_USD
        : planId === "team"
          ? process.env.NEXT_PUBLIC_PLAN_PRICE_TEAM_USD
          : undefined;
  const fromEnv = centsFromUsdString(raw);
  if (fromEnv !== null) return fromEnv;
  return Math.round(DEFAULT_LIST_PRICE_USD[planId as Exclude<PlanId, "free">] * 100);
}

/** Public annual list prices (USD / year). Env overrides; otherwise defaults above. */
export function getAnnualUsdCents(planId: PlanId): number | null {
  if (planId === "free") return 0;
  const raw =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD
      : planId === "pro"
        ? process.env.NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD
        : planId === "team"
          ? process.env.NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD
          : undefined;
  const fromEnv = centsFromUsdString(raw);
  if (fromEnv !== null) return fromEnv;
  return Math.round(DEFAULT_ANNUAL_LIST_PRICE_USD[planId as Exclude<PlanId, "free">] * 100);
}

/** e.g. "$12/mo" or "$120/yr" — paid tiers always show a dollar amount (env or default). */
export function formatPlanMoneyHeadline(planId: PlanId, cadence: PlanBillingCadence = "monthly"): string {
  if (planId === "free") return "$0";
  const cents = cadence === "annual" ? getAnnualUsdCents(planId) : getMonthlyUsdCents(planId);
  if (cents === null) return "Price on checkout";
  if (cents === 0) return "$0";
  const dollars = cents / 100;
  const suffix = cadence === "annual" ? "/yr" : "/mo";
  return `$${dollars.toFixed(dollars % 1 === 0 ? 0 : 2)}${suffix}`;
}

/** True when env explicitly sets the tier's monthly list price (for Stripe mode hints). */
export function planPriceConfigured(planId: PlanId): boolean {
  if (planId === "free") return true;
  const raw =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_PLAN_PRICE_STARTER_USD
      : planId === "pro"
        ? process.env.NEXT_PUBLIC_PLAN_PRICE_PRO_USD
        : planId === "team"
          ? process.env.NEXT_PUBLIC_PLAN_PRICE_TEAM_USD
          : undefined;
  return centsFromUsdString(raw) !== null;
}

/** True when env explicitly sets annual list price for the tier. */
export function planAnnualPriceConfigured(planId: PlanId): boolean {
  if (planId === "free") return true;
  const raw =
    planId === "starter"
      ? process.env.NEXT_PUBLIC_PLAN_PRICE_STARTER_YEARLY_USD
      : planId === "pro"
        ? process.env.NEXT_PUBLIC_PLAN_PRICE_PRO_YEARLY_USD
        : planId === "team"
          ? process.env.NEXT_PUBLIC_PLAN_PRICE_TEAM_YEARLY_USD
          : undefined;
  return centsFromUsdString(raw) !== null;
}
