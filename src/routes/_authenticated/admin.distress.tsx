import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ShieldAlert, Database, Activity, MapPinned, Plug, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  getDistressCoverageDashboardFn,
  seedNationalGeographyFn,
  seedTestMarketSourcesFn,
  runDemoIngestionFn,
  listCountySourcesFn,
  updateCountySourceFn,
} from "@/lib/distress-admin.functions";
import { listDistressProviderStatusFn } from "@/lib/distress.functions";

export const Route = createFileRoute("/_authenticated/admin/distress")({
  component: AdminDistressGate,
});

function AdminDistressGate() {
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

  if (loading || isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!isAdmin) {
    return (
      <div className="p-8">
        <Card className="max-w-lg">
          <CardHeader className="flex flex-row items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            National Distressed Property coverage is restricted to admins.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <AdminDistress />;
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AdminDistress() {
  const qc = useQueryClient();
  const dashFn = useServerFn(getDistressCoverageDashboardFn);
  const seedGeoFn = useServerFn(seedNationalGeographyFn);
  const seedSrcFn = useServerFn(seedTestMarketSourcesFn);
  const demoIngestFn = useServerFn(runDemoIngestionFn);
  const listSrcFn = useServerFn(listCountySourcesFn);
  const updateSrcFn = useServerFn(updateCountySourceFn);
  const providersFn = useServerFn(listDistressProviderStatusFn);

  const [category, setCategory] = useState<string>("all");
  const [verification, setVerification] = useState<string>("all");

  const { data: dash, isLoading } = useQuery({
    queryKey: ["distress-coverage"],
    queryFn: () => dashFn({ data: undefined as never }),
  });

  const { data: sources } = useQuery({
    queryKey: ["distress-sources", category, verification],
    queryFn: () =>
      listSrcFn({
        data: {
          category: category === "all" ? undefined : category,
          verification: verification === "all" ? undefined : verification,
        },
      }),
  });

  const { data: providerStatus } = useQuery({
    queryKey: ["distress-providers"],
    queryFn: () => providersFn({ data: undefined as never }),
  });

  const seedGeo = useMutation({
    mutationFn: () => seedGeoFn({ data: undefined as never }),
    onSuccess: (r) => {
      toast.success(`Seeded ${r.countiesInserted} counties / ${r.states} states`);
      qc.invalidateQueries({ queryKey: ["distress-coverage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const seedSources = useMutation({
    mutationFn: () => seedSrcFn({ data: undefined as never }),
    onSuccess: (r) => {
      toast.success(`Created ${r.created} discovered (not verified) sources`);
      qc.invalidateQueries({ queryKey: ["distress-sources"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runDemo = useMutation({
    mutationFn: () => demoIngestFn({ data: undefined as never }),
    onSuccess: (r) => {
      toast.success(
        `Demo ingestion: ${r.propertyCount} properties, ${r.eventCount} events (${r.persisted.mode})`,
      );
      qc.invalidateQueries({ queryKey: ["distress-coverage"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const m = dash?.metrics;

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <PageHeader
        title="National Distressed Property Coverage"
        description="Country → State → County → Source → Records. URL presence does not equal verified."
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/admin">Intelligence Center</Link>
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => seedGeo.mutate()} disabled={seedGeo.isPending}>
          {seedGeo.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <MapPinned className="mr-1 h-4 w-4" />
          )}
          Seed US geography
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => seedSources.mutate()}
          disabled={seedSources.isPending}
        >
          Seed TN test-market sources
        </Button>
        <Button
          size="sm"
          className="bg-[#70bf2b] text-white hover:bg-[#5ea524]"
          onClick={() => runDemo.mutate()}
          disabled={runDemo.isPending}
        >
          {runDemo.isPending ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-4 w-4" />
          )}
          Run demo ingestion
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Census counties available" value={dash?.geography.totalCounties ?? "—"} />
        <Metric label="Counties in DB" value={m?.countiesInDb ?? 0} />
        <Metric label="Active distressed props" value={m?.activeDistressed ?? 0} />
        <Metric label="Ingested today" value={m?.propertiesIngestedToday ?? 0} />
        <Metric label="Verified foreclosure sources" value={m?.verifiedForeclosureSources ?? 0} />
        <Metric label="Verified tax sources" value={m?.verifiedTaxSources ?? 0} />
        <Metric label="Verified code sources" value={m?.verifiedCodeSources ?? 0} />
        <Metric label="Counties without sources" value={m?.countiesWithoutSources ?? 0} />
        <Metric label="Actively ingesting" value={m?.activelyIngesting ?? 0} />
        <Metric label="Degraded feeds" value={m?.degradedFeeds ?? 0} />
        <Metric label="Duplicates prevented" value={m?.duplicatesPrevented ?? 0} />
        <Metric label="Ingestion errors" value={m?.ingestionErrors ?? 0} />
        <Metric label="Foreclosure events" value={m?.foreclosureCount ?? 0} />
        <Metric label="Tax delinquent" value={m?.taxDelinquentCount ?? 0} />
        <Metric label="Condemned" value={m?.condemnedCount ?? 0} />
        <Metric
          label="Vacant / gov inventory"
          value={`${m?.vacantCount ?? 0} / ${m?.governmentCount ?? 0}`}
        />
      </div>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center gap-2">
          <Plug className="h-4 w-4" />
          <CardTitle className="text-base">Provider connection status</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(providerStatus?.providers ?? dash?.providers ?? []).map((p: any) => (
            <div key={p.key} className="rounded-md border p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{p.name}</span>
                <Badge variant="outline">{p.status}</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.message}</p>
              {p.missingCredentials?.length > 0 && (
                <p className="mt-1 text-xs text-amber-700">
                  Required env: {p.missingCredentials.join(", ")}
                </p>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            <CardTitle className="text-base">County source registry</CardTitle>
          </div>
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="clerk_court">Clerk / court</SelectItem>
                <SelectItem value="tax">Tax</SelectItem>
                <SelectItem value="code">Code</SelectItem>
                <SelectItem value="condemned">Condemned</SelectItem>
                <SelectItem value="sheriff">Sheriff</SelectItem>
                <SelectItem value="land_bank">Land bank</SelectItem>
                <SelectItem value="auction">Auction</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verification} onValueChange={setVerification}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Verification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="discovered">Discovered</SelectItem>
                <SelectItem value="pending_validation">Pending validation</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="manual_only">Manual only</SelectItem>
                <SelectItem value="invalid">Invalid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {(sources?.sources ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">
              {sources?.message ??
                "No sources yet. Seed geography, then seed TN test-market sources."}
            </p>
          )}
          {(sources?.sources ?? []).map((s: any) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="text-sm">
                <div className="font-medium">{s.agency_name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.geo_counties?.name ?? "County"} · {s.source_category} · {s.url}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  <Badge variant="outline">{s.verification_status}</Badge>
                  <Badge variant="outline">{s.sync_status}</Badge>
                  {s.is_demo && <Badge variant="outline">demo registry</Badge>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      await updateSrcFn({
                        data: {
                          id: s.id,
                          verification_status: "pending_validation",
                          notes: "Moved to pending_validation by admin",
                        },
                      });
                      toast.success("Marked pending validation");
                      qc.invalidateQueries({ queryKey: ["distress-sources"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Update failed");
                    }
                  }}
                >
                  Pending
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    try {
                      await updateSrcFn({
                        data: {
                          id: s.id,
                          verification_status: "verified",
                          sync_status: "active",
                          notes: "Manually verified by admin after live check",
                        },
                      });
                      toast.success("Marked verified (admin-confirmed)");
                      qc.invalidateQueries({ queryKey: ["distress-sources"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Update failed");
                    }
                  }}
                >
                  Mark verified
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={async () => {
                    try {
                      await updateSrcFn({
                        data: { id: s.id, verification_status: "invalid" },
                      });
                      toast.success("Marked invalid");
                      qc.invalidateQueries({ queryKey: ["distress-sources"] });
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "Update failed");
                    }
                  }}
                >
                  Invalid
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center gap-2">
          <Activity className="h-4 w-4" />
          <CardTitle className="text-base">Score weights (active v1 defaults)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid max-h-64 gap-1 overflow-auto text-xs sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(dash?.defaultWeights ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-border/50 py-1">
                <span>{k}</span>
                <span className="tabular-nums">{v as number}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Tune via distress_score_weights table / updateDistressWeightsFn. Do not hard-code opaque
            scores in the UI.
          </p>
          {isLoading && <p className="text-sm text-muted-foreground">Loading dashboard…</p>}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-base">ATTOM / federal credential setup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Providers show <Badge variant="outline">not_connected</Badge> until server env vars are
            set. Never put API keys in VITE_ client variables.
          </p>
          <Input readOnly value="ATTOM_API_KEY= (server only)" />
          <Input readOnly value="HUD_API_KEY= (server only)" />
          <Input readOnly value="USDA_API_KEY= (server only)" />
          <Input readOnly value="VA_API_KEY= (server only)" />
          <Input readOnly value="FANNIE_MAE_API_KEY= (server only)" />
          <Input readOnly value="FREDDIE_MAC_API_KEY= (server only)" />
          <Input readOnly value="AUCTION_PROVIDER_API_KEY= (server only)" />
        </CardContent>
      </Card>
    </div>
  );
}
