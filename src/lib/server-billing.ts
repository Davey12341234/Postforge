import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { BillingAlertPayload } from "@/lib/billing-usage-hints";

/** Shown in-app after Stripe `invoice.payment_failed` until cleared by `invoice.paid` or successful checkout. */
export type PaymentAlert = {
  at: string;
  invoiceId: string | null;
  attemptCount: number | null;
};

export type ServerBillingRecord = {
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  paymentAlert: PaymentAlert | null;
};

const DATA_DIR = join(process.cwd(), ".data");
const BILLING_FILE = join(DATA_DIR, "billing.json");

function defaultBilling(): ServerBillingRecord {
  return {
    customerId: null,
    subscriptionId: null,
    status: null,
    priceId: null,
    paymentAlert: null,
  };
}

export function readServerBilling(): ServerBillingRecord {
  if (!existsSync(BILLING_FILE)) {
    return defaultBilling();
  }
  try {
    const raw = readFileSync(BILLING_FILE, "utf-8");
    const p = JSON.parse(raw) as Partial<ServerBillingRecord>;
    let paymentAlert: PaymentAlert | null = null;
    if (p.paymentAlert && typeof p.paymentAlert === "object") {
      const a = p.paymentAlert as Partial<PaymentAlert>;
      if (typeof a.at === "string") {
        paymentAlert = {
          at: a.at,
          invoiceId: typeof a.invoiceId === "string" ? a.invoiceId : null,
          attemptCount: typeof a.attemptCount === "number" ? a.attemptCount : null,
        };
      }
    }
    return {
      customerId: typeof p.customerId === "string" ? p.customerId : null,
      subscriptionId: typeof p.subscriptionId === "string" ? p.subscriptionId : null,
      status: typeof p.status === "string" ? p.status : null,
      priceId: typeof p.priceId === "string" ? p.priceId : null,
      paymentAlert,
    };
  } catch {
    return defaultBilling();
  }
}

export function writeServerBilling(next: ServerBillingRecord): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BILLING_FILE, JSON.stringify(next, null, 2), "utf-8");
}

export function recordPaymentFailure(alert: PaymentAlert): void {
  const prev = readServerBilling();
  writeServerBilling({ ...prev, paymentAlert: alert });
}

export function clearPaymentAlert(): void {
  const prev = readServerBilling();
  if (!prev.paymentAlert) return;
  writeServerBilling({ ...prev, paymentAlert: null });
}

/** Client-safe banner for failed renewal (no Stripe ids). */
export function formatBillingAlertForClient(b: ServerBillingRecord): BillingAlertPayload | null {
  if (!b.paymentAlert) return null;
  const a = b.paymentAlert;
  const extra = a.attemptCount != null ? ` (attempt ${a.attemptCount})` : "";
  return {
    kind: "payment_failed",
    at: a.at,
    attemptCount: a.attemptCount,
    message: `Subscription payment failed${extra}. Update your payment method in Manage billing.`,
  };
}
