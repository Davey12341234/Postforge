import type { PaymentAlert } from "@/lib/payment-alert";

export type ServerBillingRecord = {
  customerId: string | null;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  paymentAlert: PaymentAlert | null;
};
