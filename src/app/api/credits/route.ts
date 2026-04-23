import { NextResponse, type NextRequest } from "next/server";
import { assertAuthorized } from "@/lib/session-server";
import { isGateEnabled } from "@/lib/server-config";
import { computeUsageHints } from "@/lib/billing-usage-hints";
import { formatBillingAlertForClient, readServerBilling } from "@/lib/server-billing";
import { readServerWallet, setServerPlan } from "@/lib/server-wallet";
import { isStripeConfigured } from "@/lib/stripe-config";
import { PLANS, type PlanId } from "@/lib/plans";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const stripePayload = async () => {
    const b = await readServerBilling();
    return {
      configured: isStripeConfigured(),
      customerId: b.customerId,
      subscriptionStatus: b.status,
    };
  };

  if (!isGateEnabled()) {
    return NextResponse.json({ source: "client" as const, stripe: await stripePayload() });
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  const w = await readServerWallet();
  const billing = await readServerBilling();
  const usageHints = [
    ...computeUsageHints(w),
    ...(billing.paymentAlert
      ? [
          {
            kind: "payment_retry",
            message:
              "Stripe retries failed renewals per your Dashboard settings. Updating your card in Manage billing fixes most issues.",
          },
        ]
      : []),
  ];
  return NextResponse.json({
    source: "server" as const,
    planId: w.planId,
    balance: w.balance,
    accrualMonth: w.accrualMonth,
    welcomeApplied: w.welcomeApplied,
    version: w.version,
    stripe: await stripePayload(),
    billingAlert: formatBillingAlertForClient(billing),
    usageHints,
  });
}

export async function POST(req: NextRequest) {
  if (!isGateEnabled()) {
    return NextResponse.json(
      { error: "Server plan sync is only available when BABYGPT_APP_PASSWORD is set." },
      { status: 400 },
    );
  }

  const denied = await assertAuthorized(req);
  if (denied) {
    return denied;
  }

  if (isStripeConfigured()) {
    return NextResponse.json(
      {
        error:
          "Plans are billed through Stripe. Use Subscribe in the app or Manage billing to change or cancel.",
      },
      { status: 403 },
    );
  }

  let body: { planId?: string };
  try {
    body = (await req.json()) as { planId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const planId = body.planId as PlanId | undefined;
  if (!planId || !(planId in PLANS)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 });
  }

  const w = await setServerPlan(planId);
  return NextResponse.json({
    source: "server" as const,
    planId: w.planId,
    balance: w.balance,
    accrualMonth: w.accrualMonth,
    welcomeApplied: w.welcomeApplied,
    version: w.version,
  });
}
