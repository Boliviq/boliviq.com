import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-header";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, CreditCard, Info, PartyPopper, Sparkles, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { validateCoupon, type ValidatedCoupon } from "@/lib/coupons.functions";
import { createBoliviqCheckout, createBoliviqPortalSession } from "@/lib/billing.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";

import { plans, AI_MAX_DISCLAIMER, type Plan } from "@/lib/plans";

export const Route = createFileRoute("/_authenticated/billing")({
  component: Billing,
});

type Receipt = { plan: string; amount: number; discount: number; total: number; couponCode: string | null; source: "stripe" | "grant" };

function Billing() {
  const [annual, setAnnual] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ coupon: ValidatedCoupon; discount: number; total: number; plan: string; amount: number } | null>(null);
  const [validating, setValidating] = useState(false);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<{ title: string; message: string; detail?: string; retryPlan?: Plan } | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const validateFn = useServerFn(validateCoupon);
  const checkoutFn = useServerFn(createBoliviqCheckout);
  const portalFn = useServerFn(createBoliviqPortalSession);
  const [openingPortal, setOpeningPortal] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmTimedOut, setConfirmTimedOut] = useState(false);
  const { userId } = useCurrentUser();
  const qc = useQueryClient();


  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      const raw = sessionStorage.getItem("boliviq:last-receipt");
      if (raw) {
        try { setReceipt({ ...JSON.parse(raw), source: "stripe" }); } catch {}
        sessionStorage.removeItem("boliviq:last-receipt");
      } else {
        setReceipt({ plan: "your plan", amount: 0, discount: 0, total: 0, couponCode: null, source: "stripe" });
      }
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      url.searchParams.delete("session_id");
      window.history.replaceState({}, "", url.toString());
      // Poll for the webhook to write the subscription row (~24s).
      setConfirming(true);
      setConfirmTimedOut(false);
      let attempts = 0;
      const iv = setInterval(async () => {
        attempts += 1;
        await qc.invalidateQueries({ queryKey: ["subscription", userId] });
        if (attempts >= 12) { clearInterval(iv); setConfirming(false); setConfirmTimedOut(true); }
      }, 2000);
      return () => clearInterval(iv);
    }
    if (params.get("checkout") === "canceled") {
      toast.info("Checkout canceled. Nothing was charged.");
      const url = new URL(window.location.href);
      url.searchParams.delete("checkout");
      window.history.replaceState({}, "", url.toString());
    }
  }, [qc, userId]);

  async function openPortal() {
    setOpeningPortal(true);
    try {
      const res = await portalFn({ data: { returnUrl: `${window.location.origin}/billing`, environment: getStripeEnvironment() } });
      if ("error" in res) { toast.error(res.error); return; }
      window.open(res.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open billing portal.");
    } finally {
      setOpeningPortal(false);
    }
  }


  const { data: subscription } = useQuery({
    queryKey: ["subscription", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const currentPlan = (subscription as any)?.plan ?? "Free";
  const currentStatus = (subscription as any)?.status ?? "trial";

  async function applyCoupon(planName: string, amount: number) {
    if (!couponInput.trim()) { toast.error("Enter a coupon code."); return; }
    if (applied) { toast.error("Remove the current coupon first."); return; }
    setValidating(true);
    try {
      const res = await validateFn({ data: { code: couponInput.trim(), plan: planName, amount } });
      if (!res.ok) { toast.error(res.error); return; }
      setApplied({ coupon: res.coupon, discount: res.discount, total: res.total, plan: planName, amount });
      toast.success(`Coupon "${res.coupon.code}" applied — $${res.discount.toFixed(2)} off.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not validate coupon.");
    } finally {
      setValidating(false);
    }
  }

  async function checkout(plan: Plan) {
    if (!plan.priceMonthly || !plan.priceYearly) return;
    if (!isPaymentsConfigured()) {
      toast.error("Payments are not configured for this build.");
      return;
    }
    const amount = annual ? plan.annual : plan.monthly;
    const appliedHere = applied && applied.plan === plan.name;

    setCheckingOut(plan.name);
    setCheckoutError(null);
    try {
      const res = await checkoutFn({
        data: {
          planTier: plan.tier,
          interval: annual ? "year" : "month",
          couponCode: appliedHere ? applied!.coupon.code : undefined,
          returnUrl: `${window.location.origin}/billing?checkout=success`,
          environment: getStripeEnvironment(),
        },
      });

      if ("ok" in res && res.ok === false) {
        const raw = (res.error || res.message || "").toString();
        const isUiMode = /ui_mode|embedded_page|\bembedded\b/i.test(raw);
        const isDuplicate = res.code === "CHECKOUT_DUPLICATE_SUBSCRIPTION";
        const isMissingPrice = res.code === "CHECKOUT_PRICE_NOT_FOUND";
        const title = isUiMode
          ? "Checkout is temporarily unavailable"
          : isDuplicate
            ? "You already have an active subscription"
            : isMissingPrice
              ? "This plan isn't available yet"
              : "We couldn't open secure checkout";
        const message = isUiMode
          ? "Stripe rejected the checkout configuration for this plan. No payment was taken. Please try again in a moment — if this keeps happening, contact support and mention the reference below."
          : isDuplicate
            ? "Open Manage Billing to change plans or update your payment method instead of starting a second subscription."
            : isMissingPrice
              ? "The site owner hasn't finished configuring this plan in Stripe yet. Try a different plan or contact support."
              : "No payment was taken. Please try again — if this keeps happening, contact support with the reference below.";
        const detailParts = [
          res.requestId ? `ref ${res.requestId}` : null,
          res.adminDetail?.stripeErrorType ? `type ${res.adminDetail.stripeErrorType}` : null,
          res.adminDetail?.stripeErrorCode ? `code ${res.adminDetail.stripeErrorCode}` : null,
          res.adminDetail?.stripeErrorParam ? `param ${res.adminDetail.stripeErrorParam}` : null,
        ].filter(Boolean);
        setCheckoutError({
          title,
          message,
          detail: detailParts.length ? detailParts.join(" · ") : undefined,
          retryPlan: isDuplicate || isMissingPrice ? undefined : plan,
        });
        toast.error(title, { description: message });
        return;
      }
      if ("error" in res) {
        setCheckoutError({ title: "Checkout failed", message: res.error, retryPlan: plan });
        toast.error(res.error);
        return;
      }

      const receiptData: Receipt = {
        plan: plan.name,
        amount,
        discount: appliedHere ? applied!.discount : 0,
        total: appliedHere ? applied!.total : amount,
        couponCode: appliedHere ? applied!.coupon.code : null,
        source: "stripe",
      };

      if ("granted" in res && res.granted) {
        setApplied(null);
        setCouponInput("");
        qc.invalidateQueries({ queryKey: ["subscription", userId] });
        setReceipt({ ...receiptData, couponCode: res.couponCode ?? receiptData.couponCode, source: "grant" });
        return;
      }

      if ("clientSecret" in res && res.clientSecret) {
        sessionStorage.setItem("boliviq:last-receipt", JSON.stringify(receiptData));
        setClientSecret(res.clientSecret);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Checkout failed.";
      setCheckoutError({ title: "We couldn't open secure checkout", message, retryPlan: plan });
      toast.error(message);
    } finally {
      setCheckingOut(null);
    }
  }

  return (
    <>
      <PageHeader title="Billing & subscription" description="Manage your Boliviq plan, payment method, and invoices." />
      <PaymentTestModeBanner />
      <div className="space-y-6 p-4 sm:p-8">

        <div className="rounded-lg border border-success/40 bg-success/10 p-4 text-sm flex gap-2">
          <Info className="h-5 w-5 shrink-0 text-success" />
          <div>
            <div className="font-medium text-foreground">Powered by Stripe</div>
            <div className="text-muted-foreground">Coupons applied here are validated in Boliviq, then redeemed automatically at Stripe checkout.</div>
          </div>
        </div>

        {checkoutError && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <div className="font-medium text-foreground">{checkoutError.title}</div>
            <div className="mt-1 text-muted-foreground">{checkoutError.message}</div>
            {checkoutError.detail && (
              <div className="mt-2 font-mono text-xs text-muted-foreground">{checkoutError.detail}</div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {checkoutError.retryPlan && (
                <Button size="sm" onClick={() => checkoutError.retryPlan && checkout(checkoutError.retryPlan)}>
                  Try again
                </Button>
              )}
              {(subscription as any)?.stripe_customer_id && !String((subscription as any).stripe_customer_id).startsWith("boliviq_grant_") && (
                <Button size="sm" variant="outline" onClick={openPortal} disabled={openingPortal}>
                  {openingPortal ? "Opening…" : "Manage Billing"}
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setCheckoutError(null)}>Dismiss</Button>
              <a href="/support" className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium">Contact support</a>
            </div>
          </div>
        )}

        {confirming && (
          <div className="rounded-lg border border-primary/40 bg-primary/10 p-4 text-sm">
            Confirming your subscription with Stripe…
          </div>
        )}

        {confirmTimedOut && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
            <div className="font-medium text-foreground">Payment confirmation is taking longer than expected.</div>
            <div className="text-muted-foreground">Your payment likely succeeded — Stripe just hasn't confirmed to Boliviq yet. Refresh in a moment, or open Manage Billing to verify.</div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setConfirmTimedOut(false); qc.invalidateQueries({ queryKey: ["subscription", userId] }); }}>Refresh</Button>
              <Button size="sm" onClick={openPortal} disabled={openingPortal}>{openingPortal ? "Opening…" : "Manage Billing"}</Button>
            </div>
          </div>
        )}


        {currentStatus === "past_due" && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
            <div className="font-medium text-foreground">Payment failed</div>
            <div className="text-muted-foreground">Your last payment didn't go through. Update your payment method to keep your access.</div>
            <Button size="sm" className="mt-2" onClick={openPortal} disabled={openingPortal}>{openingPortal ? "Opening…" : "Manage Billing"}</Button>
          </div>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Current subscription</CardTitle>
            <Badge variant="secondary">{currentStatus}</Badge>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs uppercase text-muted-foreground">Plan</div>
              <div className="mt-1 text-lg font-semibold">{currentPlan}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Renewal</div>
              <div className="mt-1 text-lg font-semibold">{(subscription as any)?.current_period_end ? new Date((subscription as any).current_period_end).toLocaleDateString() : "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase text-muted-foreground">Coupon</div>
              <div className="mt-1 text-lg font-semibold">{(subscription as any)?.coupon_code ?? "—"}</div>
            </div>
          </CardContent>
          {(subscription as any)?.stripe_customer_id && !String((subscription as any).stripe_customer_id).startsWith("boliviq_grant_") && (
            <div className="px-6 pb-6">
              <Button variant="outline" onClick={openPortal} disabled={openingPortal}>
                {openingPortal ? "Opening…" : "Manage Billing"}
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">Opens Stripe's secure portal to update payment method, view invoices, or cancel.</p>
            </div>
          )}
        </Card>


        <Card>
          <CardHeader><CardTitle>Usage this period</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Usage tracking is being configured. Live per-account metering (properties, AI credits, reports) will appear here once the backend is enabled.</p>
          </CardContent>
        </Card>


        <div>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Change your plan</h2>
              <p className="text-sm text-muted-foreground">Upgrade or downgrade any time. Changes prorate automatically.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border bg-card p-1">
              <button onClick={() => setAnnual(false)} className={`rounded-full px-3 py-1 text-xs font-medium ${!annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Monthly</button>
              <button onClick={() => setAnnual(true)} className={`rounded-full px-3 py-1 text-xs font-medium ${annual ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Annual · save ~20%</button>
            </div>
          </div>
          <Card className="mt-4">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-success" /><CardTitle className="text-base">Have a coupon?</CardTitle></div>
            </CardHeader>
            <CardContent>
              {applied ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-success/40 bg-success/10 p-3 text-sm">
                  <div>
                    <div className="font-medium">{applied.coupon.code} applied to {applied.plan}</div>
                    <div className="text-muted-foreground">${applied.amount.toFixed(2)} − ${applied.discount.toFixed(2)} = <strong className="text-foreground">${applied.total.toFixed(2)}</strong></div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => { setApplied(null); setCouponInput(""); }}><X className="mr-1 h-4 w-4" />Remove</Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input placeholder="Enter coupon code" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} className="sm:max-w-xs" />
                  <p className="text-xs text-muted-foreground sm:self-center">Click "Apply coupon" on a plan to preview the discount before checkout.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => {
              const price = annual ? p.annual : p.monthly;
              const suffix = annual ? "/yr" : "/mo";
              const isCurrent = p.name === currentPlan;
              const appliedHere = applied && applied.plan === p.name;
              const busy = checkingOut === p.name;
              return (
                <Card key={p.tier} className={p.aiMax ? "border-primary/40 ring-2 ring-primary/20" : p.highlight ? "border-success ring-2 ring-success/30" : ""}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">{p.name}</div>
                      {p.aiMax ? (
                        <Badge className="bg-primary text-primary-foreground"><Sparkles className="mr-1 h-3 w-3" />AI Max</Badge>
                      ) : p.badge ? (
                        <Badge className="bg-success text-success-foreground">{p.badge}</Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 font-display text-2xl font-bold">
                      {appliedHere ? (
                        <>
                          <span className="text-muted-foreground line-through mr-2 text-lg">${price}</span>
                          ${applied!.total.toFixed(2)}
                          <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
                        </>
                      ) : (
                        <>${price}<span className="text-sm font-normal text-muted-foreground">{suffix}</span></>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{p.tagline}</p>
                    {p.seatNote && <p className="mt-1 text-xs text-muted-foreground">{p.seatNote}</p>}
                    {appliedHere && <div className="mt-1 text-xs text-success">Save ${applied!.discount.toFixed(2)} with {applied!.coupon.code}</div>}
                    <ul className="mt-3 space-y-1.5 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${p.aiMax ? "text-primary" : "text-success"}`} />{f}</li>
                      ))}
                    </ul>
                    <div className="mt-4 flex flex-col gap-2">
                      {!isCurrent && !applied && couponInput.trim() && price > 0 && (
                        <Button variant="outline" onClick={() => applyCoupon(p.name, price)} disabled={validating}>
                          {validating ? "Validating…" : "Apply coupon"}
                        </Button>
                      )}
                      <Button
                        className="w-full"
                        variant={p.highlight || p.aiMax ? "default" : "outline"}
                        disabled={isCurrent || busy || !p.priceMonthly}
                        onClick={() => checkout(p)}
                      >
                        {isCurrent ? "Current plan" : !p.priceMonthly ? "Free" : busy ? "Opening…" : appliedHere ? `Checkout ($${applied!.total.toFixed(2)})` : `Choose ${p.name}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <div className="mt-3 text-center text-xs text-muted-foreground">{AI_MAX_DISCLAIMER}</div>
        </div>

        <Card>
          <CardHeader><CardTitle>Payment method & invoices</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 rounded-md border p-3 text-sm">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div className="text-muted-foreground">Payment methods and invoices are managed inside Stripe checkout. After your first paid subscription, receipts are emailed automatically.</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!clientSecret} onOpenChange={(o) => { if (!o) { setClientSecret(null); qc.invalidateQueries({ queryKey: ["subscription", userId] }); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Complete checkout</DialogTitle></DialogHeader>
          {clientSecret && <StripeEmbeddedCheckout clientSecret={clientSecret} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!receipt} onOpenChange={(o) => { if (!o) setReceipt(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
              <PartyPopper className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">
              {receipt?.source === "grant" ? "You're all set!" : "Payment successful!"}
            </DialogTitle>
            <p className="text-center text-sm text-muted-foreground">
              {receipt?.source === "grant"
                ? `Your ${receipt?.plan} plan is active — thanks for being with Boliviq.`
                : `Welcome to Boliviq ${receipt?.plan} — a receipt is on the way to your inbox.`}
            </p>
          </DialogHeader>
          {receipt && (
            <div className="mt-2 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Order summary</div>
              <div className="flex justify-between py-1">
                <span>{receipt.plan} plan</span>
                <span>${receipt.amount.toFixed(2)}</span>
              </div>
              {receipt.couponCode && (
                <div className="flex justify-between py-1 text-success">
                  <span className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" />Coupon {receipt.couponCode}</span>
                  <span>−${receipt.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="mt-2 flex justify-between border-t pt-2 font-semibold">
                <span>Total</span>
                <span>${receipt.total.toFixed(2)}</span>
              </div>
              {receipt.couponCode && receipt.discount > 0 && (
                <div className="mt-2 text-center text-xs text-success">
                  You saved ${receipt.discount.toFixed(2)} with {receipt.couponCode} 🎉
                </div>
              )}
            </div>
          )}
          <Button className="mt-2 w-full" onClick={() => setReceipt(null)}>Done</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UsageBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{value} / {max}</span>
      </div>
      <Progress value={pct} className="mt-2" />
    </div>
  );
}
