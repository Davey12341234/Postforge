import type { PlanId } from "@/lib/plans";

/**
 * When `NEXT_PUBLIC_PLAN_PRICE_*_USD` is unset, these USD/month anchors are used so the Plans modal
 * always shows amounts (same defaults as `.env.local.example`). Set env in production to match Stripe.
 */
const DEFAULT_LIST_PRICE_USD: Record<Exclude<PlanId, "free">, number> = {
  starter: 12,
  pro: 24,
  team: 69,
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

/** e.g. "$12/mo" — always a dollar amount for paid tiers (env or default). */
export function formatPlanMoneyHeadline(planId: PlanId): string {
  if (planId === "free") return "$0";
  const cents = getMonthlyUsdCents(planId);
  if (cents === null) return "Price on checkout";
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

/** True when env explicitly sets the tier (for "set your public prices" warnings in Stripe mode). */
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
