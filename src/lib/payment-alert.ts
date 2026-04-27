/** Persisted when Stripe `invoice.payment_failed` fires; cleared on paid checkout or `invoice.paid`. */
export type PaymentAlert = {
  at: string;
  invoiceId: string | null;
  attemptCount: number | null;
};
