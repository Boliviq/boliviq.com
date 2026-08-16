import { isPaymentsConfigured, getStripePublishableKey } from "@/lib/stripe";

export function PaymentTestModeBanner() {
  if (!isPaymentsConfigured()) {
    return (
      <div className="w-full bg-destructive/10 border-b border-destructive/30 px-4 py-2 text-center text-sm text-destructive">
        Production checkout is not configured. Complete payments go-live to accept real payments.
      </div>
    );
  }
  if (getStripePublishableKey().startsWith("pk_test_")) {
    return (
      <div className="w-full bg-warning/10 border-b border-warning/30 px-4 py-2 text-center text-sm text-warning-foreground">
        All payments in the preview are in <strong>test mode</strong> — use card <code>4242 4242 4242 4242</code> to try checkout.
      </div>
    );
  }
  return null;
}
