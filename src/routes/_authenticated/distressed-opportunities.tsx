import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AlertTriangle, Filter, Map as MapIcon, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { DistressDisclaimer } from "@/components/distress/disclaimer";
import { DistressedPropertyCard } from "@/components/distress/property-card";
import {
  searchDistressedPropertiesFn,
  saveDistressSearchFn,
  toggleDistressWatchlistFn,
  addDistressedToCrmFn,
  runDistressAiFn,
} from "@/lib/distress.functions";
import { SUBTYPE_LABELS } from "@/lib/distress/taxonomy";

export const Route = createFileRoute("/_authenticated/distressed-opportunities")({
  component: DistressedOpportunitiesPage,
});

const FILTER_SUBTYPES = [
  "auction_scheduled",
  "notice_of_default",
  "reo",
  "tax_delinquent",
  "tax_lien",
  "condemned",
  "code_violation",
  "unsafe_structure",
  "demolition_order",
  "abandoned_property",
  "vacant",
  "zombie_foreclosure",
  "land_bank",
] as const;

const MAP_LAYERS = [
  { id: "foreclosure", label: "Foreclosure" },
  { id: "tax", label: "Tax delinquent" },
  { id: "condemned", label: "Condemned" },
  { id: "vacant", label: "Vacant" },
  { id: "code", label: "Code violation" },
  { id: "government", label: "Government owned" },
  { id: "auction", label: "Auction" },
] as const;

function DistressedOpportunitiesPage() {
  const searchFn = useServerFn(searchDistressedPropertiesFn);
  const saveSearchFn = useServerFn(saveDistressSearchFn);
  const watchFn = useServerFn(toggleDistressWatchlistFn);
  const crmFn = useServerFn(addDistressedToCrmFn);
  const aiFn = useServerFn(runDistressAiFn);

  const [state, setState] = useState("TN");
  const [countyFips, setCountyFips] = useState<string>("");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [subtypes, setSubtypes] = useState<string[]>([]);
  const [distressMin, setDistressMin] = useState(0);
  const [opportunityMin, setOpportunityMin] = useState(0);
  const [equityPctMin, setEquityPctMin] = useState(0);
  const [absenteeOnly, setAbsenteeOnly] = useState(false);
  const [includeDemo, setIncludeDemo] = useState(true);
  const [layers, setLayers] = useState<string[]>(MAP_LAYERS.map((l) => l.id));
  const [view, setView] = useState<"list" | "map">("list");
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [aiOpen, setAiOpen] = useState(false);
  const [aiResult, setAiResult] = useState<Awaited<ReturnType<typeof runDistressAiFn>> | null>(
    null,
  );
  const [activeId, setActiveId] = useState<string | null>(null);

  const filters = useMemo(
    () => ({
      state: state || undefined,
      countyFips: countyFips || undefined,
      city: city || undefined,
      zip: zip || undefined,
      subtypes: subtypes.length ? subtypes : undefined,
      distressScoreMin: distressMin || undefined,
      opportunityScoreMin: opportunityMin || undefined,
      equityPctMin: equityPctMin > 0 ? equityPctMin / 100 : undefined,
      absenteeOwner: absenteeOnly || undefined,
      includeDemo,
      page: 1,
      pageSize: 50,
    }),
    [
      state,
      countyFips,
      city,
      zip,
      subtypes,
      distressMin,
      opportunityMin,
      equityPctMin,
      absenteeOnly,
      includeDemo,
    ],
  );

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["distressed-search", filters],
    queryFn: () => searchFn({ data: filters }),
  });

  function toggleSubtype(s: string) {
    setSubtypes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleLayer(id: string) {
    setLayers((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      saveSearchFn({
        data: {
          name: saveName || "Untitled distressed search",
          criteriaJson: JSON.stringify(filters),
        },
      }),
    onSuccess: () => {
      toast.success("Saved search created");
      setSaveOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const properties = data?.properties ?? [];

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <PageHeader
        title="Distressed Opportunities"
        description="Nationwide multi-signal distress intelligence — foreclosure, tax, code, vacancy, and government inventory in one Boliviq record."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveOpen(true)}>
              Save search
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setView(view === "list" ? "map" : "list")}
            >
              {view === "list" ? (
                <>
                  <MapIcon className="mr-1 h-4 w-4" /> Map
                </>
              ) : (
                <>
                  <Filter className="mr-1 h-4 w-4" /> List
                </>
              )}
            </Button>
            <Button size="sm" onClick={() => refetch()} disabled={isFetching}>
              <Search className="mr-1 h-4 w-4" /> Refresh
            </Button>
          </div>
        }
      />

      <DistressDisclaimer compact />

      {data?.source === "demo_memory" && (
        <div className="flex items-start gap-2 rounded-md border border-dashed border-amber-300 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Showing labeled DEMO / TEST DATA through the production ingestion pipeline. Deploy the
          database migration and run admin demo ingestion for persisted catalog rows.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit shadow-none">
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1.5">
              <Label>State</Label>
              <Select value={state || "all"} onValueChange={(v) => setState(v === "all" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nationwide" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Nationwide</SelectItem>
                  <SelectItem value="TN">Tennessee</SelectItem>
                  <SelectItem value="FL">Florida</SelectItem>
                  <SelectItem value="TX">Texas</SelectItem>
                  <SelectItem value="CA">California</SelectItem>
                  <SelectItem value="OH">Ohio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>County FIPS</Label>
              <Select
                value={countyFips || "all"}
                onValueChange={(v) => setCountyFips(v === "all" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any county" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any county</SelectItem>
                  <SelectItem value="47187">Williamson County, TN (47187)</SelectItem>
                  <SelectItem value="47119">Maury County, TN (47119)</SelectItem>
                  <SelectItem value="47101">Lewis County, TN (47101)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
            <div className="space-y-1.5">
              <Label>ZIP</Label>
              <Input value={zip} onChange={(e) => setZip(e.target.value)} placeholder="ZIP" />
            </div>
            <div className="space-y-2">
              <Label>Distress signals</Label>
              <div className="max-h-48 space-y-2 overflow-auto pr-1">
                {FILTER_SUBTYPES.map((s) => (
                  <label key={s} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={subtypes.includes(s)}
                      onCheckedChange={() => toggleSubtype(s)}
                    />
                    {SUBTYPE_LABELS[s]}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Min distress score ({distressMin})</Label>
              <Input
                type="range"
                min={0}
                max={100}
                value={distressMin}
                onChange={(e) => setDistressMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min opportunity score ({opportunityMin})</Label>
              <Input
                type="range"
                min={0}
                max={100}
                value={opportunityMin}
                onChange={(e) => setOpportunityMin(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Min equity % ({equityPctMin})</Label>
              <Input
                type="range"
                min={0}
                max={80}
                value={equityPctMin}
                onChange={(e) => setEquityPctMin(Number(e.target.value))}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={absenteeOnly} onCheckedChange={(v) => setAbsenteeOnly(!!v)} />
              Absentee owner only
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={includeDemo} onCheckedChange={(v) => setIncludeDemo(!!v)} />
              Include demo / test data
            </label>
            <div className="space-y-2 border-t pt-3">
              <Label>Map layers</Label>
              {MAP_LAYERS.map((l) => (
                <label key={l.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={layers.includes(l.id)}
                    onCheckedChange={() => toggleLayer(l.id)}
                  />
                  {l.label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {isLoading ? "Loading…" : `${data?.total ?? 0} opportunities`}
              {data?.entitlements ? ` · plan cap ${data.entitlements.maxSearchResults}` : ""}
            </span>
            <Link to="/marketplace" className="text-[#70bf2b] hover:underline">
              Need contractors / title / lenders? Open Marketplace
            </Link>
          </div>

          {view === "map" ? (
            <Card className="shadow-none">
              <CardContent className="space-y-3 p-4">
                <div className="flex h-72 items-center justify-center rounded-md border border-dashed bg-muted/40 text-sm text-muted-foreground">
                  Map canvas with clustering — layers: {layers.join(", ") || "none"}. Points plot
                  from property lat/lng when present; select a cluster to drill into cards below.
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {properties
                    .filter((p: any) => p.latitude != null && p.longitude != null)
                    .map((p: any) => (
                      <button
                        key={p.id}
                        type="button"
                        className="rounded-md border px-3 py-2 text-left text-sm hover:border-[#70bf2b]"
                        onClick={() => setActiveId(p.id)}
                      >
                        <div className="font-medium">{p.address_raw ?? p.address_normalized}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.latitude}, {p.longitude} · distress {p.distress_score}
                        </div>
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4">
            {properties.map((p: any) => (
              <DistressedPropertyCard
                key={p.id}
                property={p}
                onSave={() => {
                  setSaveName(
                    `${p.city ?? "Market"} ${p.active_subtypes?.[0] ?? "distress"}`.slice(0, 80),
                  );
                  setSaveOpen(true);
                }}
                onWatch={async () => {
                  try {
                    const res = await watchFn({ data: { canonicalPropertyId: p.id } });
                    toast.success(res.watching ? "Added to watchlist" : "Removed from watchlist");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Watchlist failed");
                  }
                }}
                onPipeline={async () => {
                  try {
                    await crmFn({ data: { canonicalPropertyId: p.id, stage: "watching" } });
                    toast.success("Added to CRM pipeline");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "CRM import failed");
                  }
                }}
                onAi={async () => {
                  setActiveId(p.id);
                  try {
                    const res = await aiFn({
                      data: { canonicalPropertyId: p.id, request: "explain_distress" },
                    });
                    setAiResult(res);
                    setAiOpen(true);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "AI analysis failed");
                  }
                }}
              />
            ))}
            {!isLoading && properties.length === 0 && (
              <Card className="shadow-none">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  No distressed properties match these filters.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save distressed search</DialogTitle>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(e) => setSaveName(e.target.value)}
            placeholder="e.g. Middle Tennessee Foreclosures"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiOpen} onOpenChange={setAiOpen}>
        <DialogContent className="max-h-[80vh] overflow-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>AI analysis {activeId ? `· ${aiResult?.title}` : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {(aiResult?.claims ?? []).map((c, i) => (
              <div key={i} className="rounded-md border px-3 py-2">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {c.kind}
                </div>
                <p>{c.text}</p>
              </div>
            ))}
            {aiResult?.disclaimer && (
              <p className="text-xs text-muted-foreground">{aiResult.disclaimer}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
