import type { PlanId } from "@/lib/plans";

/**
 * Public marketing/list prices (USD / month) — must match what you configure in Stripe Products.
 * Set in `.env.local` so the Plans modal can show money next to each tier without calling Stripe from the browser.
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
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number.parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

/** e.g. "$12/mo" or "Set price in env" when missing (paid tiers only). */
export function formatPlanMoneyHeadline(planId: PlanId): string {
  if (planId === "free") return "$0";
  const cents = getMonthlyUsdCents(planId);
  if (cents === null) return "Price on checkout";
  if (cents === 0) return "$0";
  return `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}/mo`;
}

export function planPriceConfigured(planId: PlanId): boolean {
  if (planId === "free") return true;
  return getMonthlyUsdCents(planId) !== null;
}
