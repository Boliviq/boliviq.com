import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PassportActionBar } from "@/components/investor-os/passport-action-bar";
import { ProvenanceBadge } from "@/components/investor-os/provenance-badge";
import {
  getPropertyPassportFn,
  draftOutreachFn,
  matchBuyersFn,
  matchFundingFn,
} from "@/lib/investor-os.functions";
import { addDistressedToCrmFn, toggleDistressWatchlistFn } from "@/lib/distress.functions";
import { currency, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investor-os/passport/$id")({
  component: PropertyPassportPage,
});

function Metric({
  label,
  value,
  classification,
  source,
}: {
  label: string;
  value: string;
  classification?: string;
  source?: string;
}) {
  return (
    <div className="rounded-md border px-3 py-2">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold tabular-nums">{value}</div>
      <div className="mt-1">
        <ProvenanceBadge classification={classification} source={source} />
      </div>
    </div>
  );
}

function PropertyPassportPage() {
  const { id } = Route.useParams();
  const passportFn = useServerFn(getPropertyPassportFn);
  const outreachFn = useServerFn(draftOutreachFn);
  const buyersFn = useServerFn(matchBuyersFn);
  const fundingFn = useServerFn(matchFundingFn);
  const crmFn = useServerFn(addDistressedToCrmFn);
  const watchFn = useServerFn(toggleDistressWatchlistFn);

  const [channel, setChannel] = useState<
    "sms" | "email" | "phone" | "ai_call" | "direct_mail" | "postcard"
  >("sms");
  const [outreach, setOutreach] = useState<any>(null);
  const [buyers, setBuyers] = useState<any>(null);
  const [funding, setFunding] = useState<any>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["property-passport", id],
    queryFn: () => passportFn({ data: { id } }),
  });

  const p = data?.property as Record<string, any> | undefined;
  const recommended = data?.exits?.recommended;
  const flip = useMemo(
    () => data?.exits?.results?.find((r: any) => r.strategy === "fix_and_flip"),
    [data],
  );

  if (isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Building Property Passport…</div>;
  }
  if (error || !data || !p) {
    return (
      <div className="space-y-3 p-6">
        <p className="text-sm text-destructive">Property not found.</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/investor-os">Back to Investor OS</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/investor-os">
            <ArrowLeft className="mr-1 h-4 w-4" /> Investor OS
          </Link>
        </Button>
        <PageHeader
          title={p.address_raw ?? p.address_normalized}
          description={`${[p.city, p.state_code].filter(Boolean).join(", ")}${p.zip ? ` ${p.zip}` : ""}${
            p.is_demo ? " · DEMO / TEST DATA" : ""
          }`}
          action={<PassportActionBar propertyId={id} compact />}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Estimated value"
          value={currency(p.estimated_value)}
          classification="estimate"
          source="Boliviq valuation"
        />
        <Metric
          label="ARV"
          value={currency(p.estimated_arv)}
          classification="estimate"
          source="Boliviq ARV model"
        />
        <Metric
          label="Est. equity"
          value={currency(p.estimated_equity)}
          classification="estimate"
          source={`${pct((p.equity_pct ?? 0) * 100, 0)} equity`}
        />
        <Metric
          label="Taxes due"
          value={currency(p.delinquent_taxes)}
          classification={p.is_demo ? "demo" : "provider_data"}
          source="Tax / distress source"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Distress score"
          value={String(p.distress_score ?? "—")}
          classification="estimate"
          source="Distress Score v1"
        />
        <Metric
          label="Opportunity score"
          value={String(p.opportunity_score ?? "—")}
          classification="estimate"
          source="Opportunity Score v1"
        />
        <Metric
          label="Est. rehab"
          value={currency(p.estimated_rehab ?? data.construction?.grandTotal)}
          classification="estimate"
          source="Construction intelligence"
        />
        <Metric
          label="Recommended exit"
          value={recommended?.label ?? "—"}
          classification="ai_inference"
          source={
            flip ? `Flip profit ${currency(Number(flip.metrics?.netProfit ?? 0))}` : "Exit engine"
          }
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(p.active_subtypes ?? []).map((s: string) => (
          <Badge key={s} variant="secondary">
            {s.replaceAll("_", " ")}
          </Badge>
        ))}
        {p.absentee_owner ? <Badge variant="outline">Absentee owner</Badge> : null}
        {p.is_demo ? (
          <Badge variant="outline" className="border-warning/50 bg-warning/10 text-warning">
            DEMO DATA
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await watchFn({ data: { canonicalPropertyId: id } });
            toast.success("Watchlist updated");
          }}
        >
          Watch
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={async () => {
            await crmFn({ data: { canonicalPropertyId: id } });
            toast.success("Added to CRM pipeline");
          }}
        >
          Add to CRM
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/distressed-opportunities/$id" params={{ id }}>
            Distress detail
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {[
            ["overview", "Overview"],
            ["financials", "Financials"],
            ["risk", "Risk"],
            ["exits", "Exits"],
            ["construction", "Construction"],
            ["zoning", "Permits & Zoning"],
            ["outreach", "Outreach"],
            ["buyers", "Buyers"],
            ["funding", "Funding"],
            ["activity", "Activity"],
          ].map(([v, label]) => (
            <TabsTrigger key={v} value={v} id={v}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Property identity</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">APN</div>
                  <div>{p.apn ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">County FIPS</div>
                  <div>{p.county_fips ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div>{p.property_type ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Beds / baths / sqft</div>
                  <div>
                    {p.beds ?? "—"} / {p.baths ?? "—"} / {p.sqft ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Year built</div>
                  <div>{p.year_built ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Coordinates</div>
                  <div className="tabular-nums">
                    {p.latitude ?? "—"}, {p.longitude ?? "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Ownership</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <div className="text-muted-foreground">Owner</div>
                  <div>{p.owner_name ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Type</div>
                  <div>{p.owner_type ?? "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Occupancy</div>
                  <div>{p.occupancy_status ?? (p.owner_occupied ? "owner" : "—")}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ownership duration</div>
                  <div>
                    {p.ownership_duration_months != null
                      ? `${p.ownership_duration_months} mo (est.)`
                      : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <p className="text-xs text-muted-foreground">{data.disclaimer}</p>
        </TabsContent>

        <TabsContent value="financials">
          <Card>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric
                label="Loan balance (est.)"
                value={currency(p.loan_balance)}
                classification="estimate"
              />
              <Metric
                label="Opening bid"
                value={currency(p.opening_bid)}
                classification="estimate"
              />
              <Metric
                label="Potential spread"
                value={currency(p.potential_spread)}
                classification="estimate"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risk" className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge
              className={
                data.risk.overallLevel === "red"
                  ? "bg-destructive"
                  : data.risk.overallLevel === "yellow"
                    ? "bg-amber-500"
                    : "bg-emerald-600"
              }
            >
              {data.risk.overallLevel.toUpperCase()} · score {data.risk.riskScore}
            </Badge>
            <span className="text-xs text-muted-foreground">{data.risk.scoreVersion}</span>
          </div>
          <div className="space-y-2">
            {data.risk.signals.map((s: any) => (
              <Card key={s.key}>
                <CardContent className="flex flex-wrap items-start justify-between gap-2 p-4">
                  <div>
                    <div className="font-medium">
                      {s.level.toUpperCase()}: {s.label}
                    </div>
                    <p className="text-sm text-muted-foreground">{s.detail}</p>
                  </div>
                  <ProvenanceBadge classification={s.provenance} source={s.sourceLabel} />
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{data.risk.disclaimer}</p>
        </TabsContent>

        <TabsContent value="exits" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Assumptions are editable in Deal Analyzer. Current engine inputs: purchase{" "}
            {currency(data.exits.assumptions.purchasePrice)}, rehab{" "}
            {currency(data.exits.assumptions.rehab)}, ARV {currency(data.exits.assumptions.arv)}.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {data.exits.results.map((r: any) => (
              <Card
                key={r.strategy}
                className={recommended?.strategy === r.strategy ? "border-[#70bf2b]" : undefined}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{r.label}</span>
                    <Badge variant="outline">score {r.score}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>{r.summary}</p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    {Object.entries(r.metrics)
                      .slice(0, 6)
                      .map(([k, v]) => (
                        <div key={k}>
                          {k}: {typeof v === "number" ? currency(v) : String(v ?? "—")}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="construction" id="construction" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Rehab estimate {currency(data.construction.grandTotal)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <span>Materials {currency(data.construction.materialsTotal)}</span>
                <span>Labor {currency(data.construction.laborTotal)}</span>
                <span>Contingency {currency(data.construction.contingencyAmount)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Timeline: {data.construction.timelineWeeksMin}–{data.construction.timelineWeeksMax}{" "}
                weeks · {String(data.construction.assumptions?.note ?? "")}
              </p>
              <ProvenanceBadge
                classification={data.construction.provenance}
                source="Construction AI"
              />
              <div className="divide-y">
                {data.construction.scopeOfWork.map((li: any) => (
                  <div key={li.category} className="flex justify-between py-2">
                    <div>
                      <div className="font-medium capitalize">
                        {li.category.replaceAll("_", " ")}
                      </div>
                      <div className="text-xs text-muted-foreground">{li.description}</div>
                    </div>
                    <div className="tabular-nums">{currency(li.materials + li.labor)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contractor bids (DEMO)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.bids.map((b: any) => (
                <div
                  key={b.contractor_name}
                  className="flex flex-wrap items-center justify-between gap-2 border-b py-2 last:border-0"
                >
                  <div>
                    <div className="font-medium">{b.contractor_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.timeline_weeks} weeks · {b.scope_exclusions}
                    </div>
                  </div>
                  <div className="font-display text-lg tabular-nums">{currency(b.price)}</div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground">
                Boliviq does not auto-select a contractor.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zoning" className="space-y-3">
          <Card>
            <CardContent className="space-y-2 p-4 text-sm">
              <div>
                Zoning: <strong>{data.zoning.zoning_code}</strong> — {data.zoning.zoning_label} (
                {data.zoning.certainty})
              </div>
              <p className="text-muted-foreground">
                Permitted: {(data.zoning.permitted_uses ?? []).join(", ")} · Lot{" "}
                {data.zoning.lot_dimensions}
              </p>
              {data.zoning.hidden_opportunity_note ? (
                <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
                  <div className="font-medium">Possible hidden opportunity</div>
                  <p className="text-muted-foreground">{data.zoning.hidden_opportunity_note}</p>
                </div>
              ) : null}
              <p className="text-xs text-muted-foreground">{data.disclaimers?.zoning}</p>
              <ProvenanceBadge
                classification={data.zoning.certainty}
                source={data.zoning.source_label}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Permits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {data.permits.map((pm: any) => (
                <div
                  key={pm.permit_number}
                  className="flex justify-between border-b py-2 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {pm.permit_type} · {pm.permit_number}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pm.status} · {pm.filed_at}
                      {pm.is_demo ? " · DEMO" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="outreach" id="outreach" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["phone", "ai_call", "sms", "email", "direct_mail", "postcard"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={async () => {
                const res = await outreachFn({
                  data: { canonicalPropertyId: id, channel },
                });
                setOutreach(res);
              }}
            >
              Draft outreach
            </Button>
          </div>
          {outreach ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <Textarea readOnly value={outreach.draft.body} className="min-h-[140px]" />
                <p className="text-xs text-muted-foreground">{outreach.draft.complianceNote}</p>
                <p className="text-xs text-muted-foreground">{outreach.disclaimer}</p>
                {outreach.suppressed?.suppressed ? (
                  <Badge variant="destructive">Suppressed — {outreach.suppressed.reason}</Badge>
                ) : null}
                {outreach.upgradeHint ? (
                  <Badge variant="outline" className="border-warning/50 text-warning">
                    {outreach.upgradeHint}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="buyers" className="space-y-3">
          <Button
            size="sm"
            onClick={async () => {
              const res = await buyersFn({ data: { canonicalPropertyId: id } });
              setBuyers(res);
            }}
          >
            Find buyers
          </Button>
          {buyers ? (
            <div className="space-y-2">
              {buyers.matches.slice(0, 10).map((m: any) => (
                <Card key={m.buyer.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <div className="font-medium">{m.buyer.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.reasons?.join(" · ")}
                        {m.buyer.is_demo ? " · DEMO" : ""}
                      </div>
                    </div>
                    <Badge>Match {m.match_score}</Badge>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground">{buyers.privacyNote}</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="funding" className="space-y-3">
          <Button
            size="sm"
            onClick={async () => {
              const purchase = Number(data.exits.assumptions.purchasePrice);
              const rehab = Number(data.exits.assumptions.rehab);
              const arv = Number(data.exits.assumptions.arv);
              const res = await fundingFn({
                data: {
                  canonicalPropertyId: id,
                  purchasePrice: purchase,
                  rehab,
                  arv,
                  loanRequest: Math.round((purchase + rehab) * 0.9),
                  exitStrategy: recommended?.strategy ?? "flip",
                  state: p.state_code ?? "TN",
                  experienceDeals: 3,
                  borrowerCredit: 700,
                },
              });
              setFunding(res);
            }}
          >
            Match funding
          </Button>
          {funding ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Package: purchase {currency(funding.package.purchase_price)} · rehab{" "}
                {currency(funding.package.rehab)} · ARV {currency(funding.package.arv)} · loan{" "}
                {currency(funding.package.loan_request)}
              </p>
              {funding.matches.map((m: any) => (
                <Card key={m.lender.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
                    <div>
                      <div className="font-medium">{m.lender.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.lender.rate_note} · {m.lender.points_note} · {m.lender.close_days_note}
                      </div>
                      <div className="text-xs text-muted-foreground">{m.reasons?.join(" · ")}</div>
                    </div>
                    <Badge>Score {m.match_score}</Badge>
                  </CardContent>
                </Card>
              ))}
              <p className="text-xs text-muted-foreground">{funding.disclaimer}</p>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="space-y-3 p-4">
              {data.timeline.map((t: any, i: number) => (
                <div key={i} className="flex gap-3 border-b pb-3 last:border-0">
                  <div className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
                    {String(t.event_at).slice(0, 10)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.title}</div>
                    <ProvenanceBadge classification={t.provenance} source={t.source_label} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
