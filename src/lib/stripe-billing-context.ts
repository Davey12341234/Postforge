import { getStripe } from "@/lib/stripe-client";
import type { ServerBillingRecord } from "@/lib/server-billing";

/**
 * Read-only Stripe facts for billing copilot / support (no secrets).
 * Best-effort: upcoming invoice may be unavailable if the customer has no subscription.
 */
export async function buildStripeBillingFacts(billing: ServerBillingRecord): Promise<{
  facts: string;
  error?: string;
}> {
  if (!billing.customerId) {
    return { facts: "", error: "No Stripe customer on this account yet. Subscribe once to create one." };
  }

  const stripe = getStripe();
  const lines: string[] = [];

  try {
    const c = await stripe.customers.retrieve(billing.customerId);
    if (typeof c !== "object" || ("deleted" in c && c.deleted)) {
      lines.push(`Customer ${billing.customerId} missing or deleted in Stripe.`);
    } else {
      lines.push(`Stripe customer: ${c.id}`);
      if (c.email) lines.push(`Email on file: ${c.email}`);
      if (c.name) lines.push(`Name: ${c.name}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "customer retrieve failed";
    return { facts: "", error: msg };
  }

  const subId = billing.subscriptionId;
  if (subId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subId);
      lines.push(`Subscription: ${sub.id} status=${sub.status}`);
      lines.push(`Current period end (UTC): ${new Date(sub.current_period_end * 1000).toISOString()}`);
      const price = sub.items.data[0]?.price;
      if (price?.unit_amount != null && price.currency) {
        lines.push(
          `Recurring price: ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.recurring?.interval ?? "?"}`,
        );
      }
    } catch (e) {
      lines.push(`Subscription retrieve failed: ${e instanceof Error ? e.message : "unknown"}`);
    }
  } else {
    lines.push("No subscription id stored locally (may still be syncing).");
  }

  try {
    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: billing.customerId,
    });
    const total = upcoming.total != null ? (upcoming.total / 100).toFixed(2) : "?";
    lines.push(`Upcoming invoice estimate: ${total} ${upcoming.currency?.toUpperCase() ?? ""}`.trim());
    if (upcoming.next_payment_attempt) {
      lines.push(`Next payment attempt: ${new Date(upcoming.next_payment_attempt * 1000).toISOString()}`);
    }
  } catch {
    lines.push("Upcoming invoice: not available (no renewal scheduled, incomplete setup, or one-off customer).");
  }

  return { facts: lines.join("\n") };
}
