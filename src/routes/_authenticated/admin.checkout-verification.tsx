import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { PageHeader } from "@/components/page-header";
import { PaymentTestModeBanner } from "@/components/payment-test-mode-banner";
import { StripeEmbeddedCheckout } from "@/components/stripe-embedded-checkout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  createBoliviqCheckout,
  runCheckoutVerification,
  validateCheckoutSessionConfig,
} from "@/lib/billing.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { CHECKOUT_BUILD_ID } from "@/lib/checkout-config";

export const Route = createFileRoute("/_authenticated/admin/checkout-verification")({
  component: Gate,
});

function Gate() {
  const { userId, loading } = useCurrentUser();
  const { data, isLoading } = useQuery({
    queryKey: ["is-admin", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  if (loading || isLoading)
    return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!data) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Checkout verification is restricted to admins and all diagnostic server calls enforce
            the same role.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <CheckoutVerification />;
}

function StatusBadge({ status }: { status: string }) {
  const Icon =
    status === "PASS" || status === "READY"
      ? CheckCircle2
      : status === "WARNING"
        ? AlertTriangle
        : XCircle;
  const tone =
    status === "PASS" || status === "READY"
      ? "text-success"
      : status === "WARNING"
        ? "text-warning"
        : "text-destructive";
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${tone}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

function CheckoutVerification() {
  const currentEnv = getStripeEnvironment();
  const [env, setEnv] = useState<"sandbox" | "live">(currentEnv);
  const [report, setReport] = useState<Awaited<ReturnType<typeof runCheckoutVerification>> | null>(
    null,
  );
  const [selected, setSelected] = useState<{
    planTier: string;
    interval: "month" | "year";
    label: string;
  } | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [livePhrase, setLivePhrase] = useState("");
  const runVerification = useServerFn(runCheckoutVerification);
  const validateConfig = useServerFn(validateCheckoutSessionConfig);
  const createCheckout = useServerFn(createBoliviqCheckout);
  const appUrl = useMemo(
    () => (typeof window === "undefined" ? "https://boliviq.com" : window.location.origin),
    [],
  );

  async function runAll() {
    setBusy("all");
    try {
      const res = await runVerification({ data: { environment: env, applicationUrl: appUrl } });
      setReport(res);
      toast[res.overall === "READY" ? "success" : "warning"](
        `Checkout verification: ${res.overall}`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed.");
    } finally {
      setBusy(null);
    }
  }

  async function dryValidate(planTier: string, interval: "month" | "year") {
    setBusy(`${planTier}-${interval}-dry`);
    try {
      const res = await validateConfig({
        data: { planTier, interval, returnUrl: `${appUrl}/billing?checkout=success` },
      });
      toast[res.status === "PASS" ? "success" : "error"](`Session config ${res.status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Validation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function initCheckout(planTier: string, interval: "month" | "year", label: string) {
    if (env === "live") {
      if (livePhrase !== "LIVE CHECKOUT TEST") {
        toast.error("Type LIVE CHECKOUT TEST before creating a live checkout session.");
        return;
      }
      const ok = window.confirm(
        `Create a LIVE checkout initialization for ${label}? Do not submit payment unless you intend to charge.`,
      );
      if (!ok) return;
    } else {
      const ok = window.confirm(
        `Create a TEST checkout initialization for ${label}? This only opens Stripe card entry; do not submit payment.`,
      );
      if (!ok) return;
    }
    setBusy(`${planTier}-${interval}-checkout`);
    setSelected({ planTier, interval, label });
    setClientSecret(null);
    try {
      const res = await createCheckout({
        data: {
          planTier,
          interval,
          environment: env,
          returnUrl: `${appUrl}/billing?checkout=success`,
        },
      });
      if ("ok" in res && res.ok === false) {
        toast.error(res.error || res.message);
        return;
      }
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      if ("clientSecret" in res && res.clientSecret) {
        setClientSecret(res.clientSecret);
        toast.success("Client secret returned. Embedded card-entry panel is mounting.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Checkout initialization failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Checkout Verification"
        description="Admin-only diagnostics for Boliviq Stripe checkout initialization."
      />
      <PaymentTestModeBanner />
      <div className="space-y-6 p-4 sm:p-8">
        <Card className="border-primary/40">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle>Run full pre-checkout verification</CardTitle>
            </div>
            <div className="inline-flex rounded-md border p-0.5 text-xs">
              {(["sandbox", "live"] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setEnv(item)}
                  className={`rounded px-3 py-1 ${env === item ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {item === "sandbox" ? "TEST" : "LIVE"}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={runAll} disabled={busy === "all"}>
                {busy === "all" ? "Running…" : "Run full verification"}
              </Button>
              <Badge variant={report?.overall === "READY" ? "default" : "outline"}>
                {report?.overall ?? "NOT RUN"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                Local checkout build: <code>{CHECKOUT_BUILD_ID}</code>
              </span>
            </div>
            {env === "live" && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3">
                <div className="font-semibold text-destructive">
                  Live checkout initialization is guarded.
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Type the exact phrase before creating a live checkout session. Never submit
                  payment from this panel unless intentionally testing a live charge.
                </p>
                <Input
                  className="mt-2 max-w-sm"
                  value={livePhrase}
                  onChange={(e) => setLivePhrase(e.target.value)}
                  placeholder="LIVE CHECKOUT TEST"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {report && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Deployment status</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <Info label="Frontend build" value={report.frontendBuildId} />
                <Info label="Checkout server build" value={report.checkoutServerBuildId} />
                <Info
                  label="Edge function build"
                  value={report.edgeFunctionBuildId ?? "not used"}
                />
                <Info label="Environment" value={report.deployedEnvironment} />
                <Info label="Stripe mode" value={report.stripeMode} />
                <Info label="Stripe SDK" value={report.stripeSdkVersion} />
                <Info label="Stripe API" value={report.stripeApiVersion} />
                <Info label="Return URL" value={report.checkoutReturnUrl} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Environment checks</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {report.environmentChecks.map((item) => (
                  <div
                    key={item.key}
                    className="flex flex-col gap-1 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="font-medium">{item.key}</div>
                      <div className="text-xs text-muted-foreground">{item.detail}</div>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Plan, price, and session configuration checks</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-xs">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="p-2 text-left">Plan</th>
                      <th className="p-2 text-left">Lookup key</th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2 text-left">Price</th>
                      <th className="p-2 text-left">Session config</th>
                      <th className="p-2 text-left">Static wiring</th>
                      <th className="p-2 text-left">ui_mode</th>
                      <th className="p-2 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.plans.map((row) => (
                      <tr key={`${row.planTier}-${row.interval}`} className="border-t align-top">
                        <td className="p-2 font-medium">
                          {row.planName}
                          <div className="text-muted-foreground">{row.interval}</div>
                        </td>
                        <td className="p-2 font-mono">{row.lookupKey}</td>
                        <td className="p-2 text-right tabular-nums">
                          ${row.expectedAmount}
                          <div className="text-muted-foreground">
                            found {row.amount == null ? "—" : `$${row.amount}`}
                          </div>
                        </td>
                        <td className="p-2">
                          <StatusBadge status={row.priceStatus} />
                        </td>
                        <td className="p-2">
                          <StatusBadge status={row.sessionConfigStatus} />
                          <div className="mt-1 text-muted-foreground">
                            return_url {String(row.returnUrlPresent)} · success_url{" "}
                            {String(row.successUrlPresent)}
                          </div>
                        </td>
                        <td className="p-2">
                          <StatusBadge status={row.staticConfigStatus} />
                          <div className="mt-1 text-muted-foreground">
                            auth {String(row.authEnforced)} · duplicate guard{" "}
                            {String(row.duplicateProtectionEnabled)} · webhook{" "}
                            {String(row.webhookMappingRecognizes)}
                          </div>
                        </td>
                        <td className="p-2 font-mono">{row.uiMode}</td>
                        <td className="p-2">
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busy === `${row.planTier}-${row.interval}-dry`}
                              onClick={() => dryValidate(row.planTier, row.interval)}
                            >
                              Validate no-charge config
                            </Button>
                            <Button
                              size="sm"
                              disabled={busy === `${row.planTier}-${row.interval}-checkout`}
                              onClick={() =>
                                initCheckout(
                                  row.planTier,
                                  row.interval,
                                  `${row.planName} ${row.interval}`,
                                )
                              }
                            >
                              Test checkout initialization
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent safe checkout errors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {!report.recentErrors.length && (
                  <div className="text-muted-foreground">
                    No recent checkout initialization errors recorded on this server instance.
                  </div>
                )}
                {report.recentErrors.map((err, index) => (
                  <div key={`${err.timestamp}-${index}`} className="rounded-md border p-3">
                    <div className="font-medium">
                      {err.timestamp} · {err.handler} · {err.planName ?? err.planTier}{" "}
                      {err.interval}
                    </div>
                    <div className="text-muted-foreground">
                      env {err.environment} · type {err.stripeErrorType ?? "—"} · code{" "}
                      {err.stripeErrorCode ?? "—"} · param {err.stripeErrorParam ?? "—"} · req{" "}
                      {err.maskedRequestId ?? "—"} · build {err.buildId}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <Dialog
        open={!!clientSecret}
        onOpenChange={(open) => {
          if (!open) setClientSecret(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {env === "sandbox" ? "TEST MODE" : "LIVE MODE"} checkout initialization
              {selected ? ` · ${selected.label}` : ""}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Card-entry fields should appear below. Do not submit payment from automated
              verification.
            </p>
          </DialogHeader>
          {clientSecret && <StripeEmbeddedCheckout clientSecret={clientSecret} />}
          <Button variant="outline" onClick={() => setClientSecret(null)}>
            Close test panel
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-mono text-xs">{value}</div>
    </div>
  );
}
