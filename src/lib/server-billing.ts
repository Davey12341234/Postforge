import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

import type { BillingAlertPayload } from "@/lib/billing-usage-hints";
import { getDataDir } from "@/lib/data-dir";
import { isPostgresPersistenceEnabled } from "@/lib/persistence-env";
import type { PaymentAlert } from "@/lib/payment-alert";
import { dbReadBilling, dbWriteBilling, findClerkIdByStripeCustomerId } from "@/lib/site-wallet-store";
import { getDefaultWalletClerkId } from "@/lib/site-wallet-user";
import { getWalletClerkIdFromRequest } from "@/lib/session-server";
import type { ServerBillingRecord } from "@/lib/server-billing-record";

import type { NextRequest } from "next/server";

export type { PaymentAlert } from "@/lib/payment-alert";
export type { ServerBillingRecord } from "@/lib/server-billing-record";

const DATA_DIR = getDataDir();
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

function readServerBillingFile(): ServerBillingRecord {
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

function writeServerBillingFile(next: ServerBillingRecord): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BILLING_FILE, JSON.stringify(next, null, 2), "utf-8");
}

async function clerkIdFromRequestMaybe(req?: NextRequest): Promise<string> {
  if (!req) return getDefaultWalletClerkId();
  return getWalletClerkIdFromRequest(req);
}

export async function readServerBilling(req?: NextRequest): Promise<ServerBillingRecord> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    return dbReadBilling(clerkId);
  }
  return readServerBillingFile();
}

export async function writeServerBilling(next: ServerBillingRecord, req?: NextRequest): Promise<void> {
  if (isPostgresPersistenceEnabled()) {
    const clerkId = await clerkIdFromRequestMaybe(req);
    await dbWriteBilling(clerkId, next);
    return;
  }
  writeServerBillingFile(next);
}

export async function recordPaymentFailure(alert: PaymentAlert, req?: NextRequest): Promise<void> {
  const prev = await readServerBilling(req);
  await writeServerBilling({ ...prev, paymentAlert: alert }, req);
}

export async function clearPaymentAlert(req?: NextRequest): Promise<void> {
  const prev = await readServerBilling(req);
  if (!prev.paymentAlert) return;
  await writeServerBilling({ ...prev, paymentAlert: null }, req);
}

/** Clears payment alert for the wallet row tied to this Stripe customer (Postgres multi-tenant). */
export async function clearPaymentAlertForStripeCustomer(customerId: string | null): Promise<void> {
  if (!isPostgresPersistenceEnabled() || !customerId) {
    await clearPaymentAlert();
    return;
  }
  const clerkId = await findClerkIdByStripeCustomerId(customerId);
  if (!clerkId) {
    await clearPaymentAlert();
    return;
  }
  const prev = await dbReadBilling(clerkId);
  await dbWriteBilling(clerkId, { ...prev, paymentAlert: null });
}

/** Records payment failure alert on the correct wallet row when possible. */
export async function recordPaymentFailureForStripeCustomer(
  customerId: string | null,
  alert: PaymentAlert,
): Promise<void> {
  if (!isPostgresPersistenceEnabled() || !customerId) {
    await recordPaymentFailure(alert);
    return;
  }
  const clerkId = await findClerkIdByStripeCustomerId(customerId);
  if (!clerkId) {
    await recordPaymentFailure(alert);
    return;
  }
  const prev = await dbReadBilling(clerkId);
  await dbWriteBilling(clerkId, { ...prev, paymentAlert: alert });
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
