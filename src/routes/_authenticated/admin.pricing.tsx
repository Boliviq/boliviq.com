import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ShieldAlert, DollarSign, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { plans } from "@/lib/plans";
import { getPlanPricingSettings, savePlanPricingSettings } from "@/lib/plan-prices.functions";
import { getStripeEnvironment, isPaymentsConfigured } from "@/lib/stripe";
import type { PlanPriceRow } from "@/lib/plan-catalog";

export const Route = createFileRoute("/_authenticated/admin/pricing")({
  component: AdminPricingGate,
});

function AdminPricingGate() {
  const { userId, loading } = useCurrentUser();
  const { data: isAdmin, isLoading } = useQuery({
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

  if (loading || isLoading) return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Only administrators can view plan pricing settings. Saving is limited to the master admin.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AdminPricing />;
}

function AdminPricing() {
  const loadFn = useServerFn(getPlanPricingSettings);
  const saveFn = useServerFn(savePlanPricingSettings);
  const qc = useQueryClient();
  const [rows, setRows] = useState<PlanPriceRow[]>([]);
  const [syncStripe, setSyncStripe] = useState(true);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-plan-prices"],
    queryFn: () => loadFn({ data: {} }),
  });

  useEffect(() => {
    if (data?.rows) setRows(data.rows);
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      saveFn({
        data: {
          environment: getStripeEnvironment(),
          syncStripe,
          rows,
        },
      }),
    onSuccess: (res) => {
      setRows(res.rows);
      qc.invalidateQueries({ queryKey: ["plan-prices"] });
      qc.invalidateQueries({ queryKey: ["admin-plan-prices"] });
      const errors = res.stripeResults?.filter((item) => item.status === "error") ?? [];
      if (errors.length) {
        toast.error("Prices saved, but some Stripe updates failed.", {
          description: errors.map((item) => `${item.lookupKey}: ${item.message}`).join(" · "),
        });
        return;
      }
      toast.success(res.stripeSynced ? "Plan prices saved and synced to Stripe." : "Plan prices saved.");
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Could not save prices.");
    },
  });

  const byTier = useMemo(() => Object.fromEntries(plans.map((plan) => [plan.tier, plan])), []);

  function update(tier: string, patch: Partial<PlanPriceRow>) {
    setRows((current) => current.map((row) => (row.tier === tier ? { ...row, ...patch } : row)));
  }

  const canEdit = !!data?.isMasterAdmin;

  return (
    <>
      <PageHeader
        title="Plan pricing"
        description="Master admin settings for every Boliviq plan price. Changes update the public pricing page, billing, and (optionally) Stripe lookup keys."
      />
      <div className="space-y-6 p-4 sm:p-8">
        {!canEdit && (
          <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
            You can review prices, but only the master admin can change them.
          </div>
        )}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <CardTitle>Catalog prices (USD)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading || !rows.length ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading prices…
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 text-left">Plan</th>
                      <th className="py-2 text-left">Monthly</th>
                      <th className="py-2 text-left">Annual</th>
                      <th className="py-2 text-left">Extra seat / mo</th>
                      <th className="py-2 text-left">Stripe lookup keys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const plan = byTier[row.tier];
                      const locked = row.tier === "free";
                      return (
                        <tr key={row.tier} className="border-t align-top">
                          <td className="py-3 pr-3">
                            <div className="font-medium">{plan?.name ?? row.tier}</div>
                            <div className="text-xs text-muted-foreground">{plan?.tagline}</div>
                          </td>
                          <td className="py-3 pr-3">
                            <Label className="sr-only">Monthly {row.tier}</Label>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              disabled={!canEdit || locked}
                              value={row.monthly}
                              onChange={(e) => update(row.tier, { monthly: Number(e.target.value) || 0 })}
                              className="w-28"
                            />
                          </td>
                          <td className="py-3 pr-3">
                            <Label className="sr-only">Annual {row.tier}</Label>
                            <Input
                              type="number"
                              min={0}
                              step="1"
                              disabled={!canEdit || locked}
                              value={row.annual}
                              onChange={(e) => update(row.tier, { annual: Number(e.target.value) || 0 })}
                              className="w-28"
                            />
                          </td>
                          <td className="py-3 pr-3">
                            {plan?.includedSeats ? (
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                disabled={!canEdit}
                                value={row.extra_seat_monthly ?? 0}
                                onChange={(e) => update(row.tier, { extra_seat_monthly: Number(e.target.value) || 0 })}
                                className="w-28"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3">
                            {plan?.priceMonthly ? (
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className="w-fit font-mono text-[10px]">{plan.priceMonthly}</Badge>
                                <Badge variant="outline" className="w-fit font-mono text-[10px]">{plan.priceYearly}</Badge>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">No Stripe price (free)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={syncStripe} onCheckedChange={setSyncStripe} disabled={!canEdit || !isPaymentsConfigured()} />
                Update Stripe prices for {getStripeEnvironment()} mode
              </label>
              <Button onClick={() => save.mutate()} disabled={!canEdit || save.isPending || isLoading}>
                {save.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save prices
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Saving with Stripe sync creates a new Stripe price and transfers the lookup key. Existing subscribers stay on their current Stripe price until they change plans.
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
