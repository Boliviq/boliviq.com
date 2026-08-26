import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DistressDisclaimer } from "@/components/distress/disclaimer";
import { DistressSignalBadges } from "@/components/distress/signals";
import { ScoreBreakdown } from "@/components/distress/score-breakdown";
import {
  getDistressedPropertyFn,
  addDistressedToCrmFn,
  toggleDistressWatchlistFn,
  runDistressAiFn,
} from "@/lib/distress.functions";
import { currency } from "@/lib/format";
import { SUBTYPE_LABELS, type DistressSubtype } from "@/lib/distress/taxonomy";

export const Route = createFileRoute("/_authenticated/distressed-opportunities/$id")({
  component: DistressedPropertyDetailPage,
});

const AI_REQUESTS = [
  "explain_distress",
  "foreclosure_timeline",
  "acquisition_strategy",
  "investor_offer",
  "rehab_estimate",
  "arv_estimate",
  "liens_debt",
  "auction_opportunity",
  "owner_outreach",
  "cold_call_script",
  "text_message",
  "email",
  "direct_mail",
  "exit_strategies",
  "flip_vs_rental",
  "wholesale_vs_rehab",
  "title_risks",
  "next_foreclosure_step",
] as const;

function DistressedPropertyDetailPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getDistressedPropertyFn);
  const crmFn = useServerFn(addDistressedToCrmFn);
  const watchFn = useServerFn(toggleDistressWatchlistFn);
  const aiFn = useServerFn(runDistressAiFn);
  const [aiRequest, setAiRequest] = useState<(typeof AI_REQUESTS)[number]>("explain_distress");
  const [aiOut, setAiOut] = useState<Awaited<ReturnType<typeof runDistressAiFn>> | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["distressed-property", id],
    queryFn: () => getFn({ data: { id } }),
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading property intelligence…</div>;
  }

  const typed = data as {
    propertyJson: string;
    eventsJson: string;
    source: string;
    disclaimer: string;
  };
  const p = JSON.parse(typed.propertyJson) as Record<string, any>;
  const events = JSON.parse(typed.eventsJson) as any[];
  const activeSubtypes = events
    .filter((e) => ["active", "scheduled", "postponed"].includes(e.status))
    .map((e) => e.subtype as string);

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link to="/distressed-opportunities">
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to opportunities
          </Link>
        </Button>
        <PageHeader
          title={p.address_raw ?? p.address_normalized}
          description={`${[p.city, p.state_code].filter(Boolean).join(", ")}${p.zip ? ` ${p.zip}` : ""}${
            p.is_demo ? " · DEMO / TEST DATA" : ""
          }`}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-[#70bf2b] text-white hover:bg-[#5ea524]"
                onClick={async () => {
                  try {
                    await crmFn({ data: { canonicalPropertyId: id, stage: "watching" } });
                    toast.success("Added to CRM pipeline");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                Add to Pipeline
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await watchFn({ data: { canonicalPropertyId: id } });
                    toast.success("Watchlist updated");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Failed");
                  }
                }}
              >
                Watchlist
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/investor-os/passport/$id" params={{ id }}>
                  Property Passport
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/deal-analyzer">Deal Analyzer</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/marketplace">Find Pros</Link>
              </Button>
            </div>
          }
        />
      </div>

      <DistressDisclaimer compact />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-lg">Current Distress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <DistressSignalBadges subtypes={activeSubtypes} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreBreakdown
                title="Distress Score"
                score={p.distress_score}
                signals={p.score_signals}
              />
              <ScoreBreakdown
                title="Opportunity Score"
                score={p.opportunity_score}
                signals={null}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-lg">Financials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Est. value (ESTIMATE)" value={currency(p.estimated_value)} />
            <Row label="Est. ARV (ESTIMATE)" value={currency(p.estimated_arv)} />
            <Row label="Est. rehab (ESTIMATE)" value={currency(p.estimated_rehab)} />
            <Row label="Loan balance (ESTIMATE)" value={currency(p.loan_balance)} />
            <Row label="Delinquent taxes (FACT if sourced)" value={currency(p.delinquent_taxes)} />
            <Row label="Opening bid (FACT if sourced)" value={currency(p.opening_bid)} />
            <Row label="Est. equity (ESTIMATE)" value={currency(p.estimated_equity)} />
            <Row label="Potential spread (ESTIMATE)" value={currency(p.potential_spread)} />
            <Row label="Owner" value={p.owner_name ?? "—"} />
            <Row label="APN" value={p.apn ?? "—"} />
            <Row label="County FIPS" value={p.county_fips ?? "—"} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg">Distress Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 border-l-2 border-border pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#70bf2b]" />
                <div className="text-xs text-muted-foreground">
                  {e.filing_date ?? e.first_seen_at?.slice?.(0, 10) ?? "Date unknown"}
                </div>
                <div className="font-medium">
                  {SUBTYPE_LABELS[e.subtype as DistressSubtype] ?? e.subtype}
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    {e.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Source confidence {e.confidence_score}/100 · verification{" "}
                  {e.source_verification_status} · provider {e.provider_key}
                </div>
              </li>
            ))}
            {!events.length && (
              <li className="text-sm text-muted-foreground">No events on file.</li>
            )}
          </ol>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-lg">Source Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {events.map((e) => (
            <div key={`src-${e.id}`} className="rounded-md border px-3 py-2">
              <div className="font-medium">
                {SUBTYPE_LABELS[e.subtype as DistressSubtype] ?? e.subtype}
              </div>
              <div className="text-xs text-muted-foreground">
                Provider {e.provider_key} · record {e.source_record_id} · collected{" "}
                {e.first_seen_at?.slice?.(0, 10)} · updated {e.last_seen_at?.slice?.(0, 10)} ·
                status {e.source_verification_status}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Third-party / demo data is not government-certified unless verification_status is
                verified/active from an authoritative source.
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-[#70bf2b]" /> AI Distress Tools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Select value={aiRequest} onValueChange={(v) => setAiRequest(v as any)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AI_REQUESTS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              disabled={aiBusy}
              onClick={async () => {
                setAiBusy(true);
                try {
                  const res = await aiFn({
                    data: { canonicalPropertyId: id, request: aiRequest },
                  });
                  setAiOut(res);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "AI failed");
                } finally {
                  setAiBusy(false);
                }
              }}
            >
              Run (uses credits)
            </Button>
          </div>
          {aiOut && (
            <div className="space-y-2">
              {aiOut.claims.map((c, i) => (
                <div key={i} className="rounded-md border px-3 py-2 text-sm">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {c.kind}
                  </div>
                  <p className="whitespace-pre-wrap">{c.text}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{value}</span>
    </div>
  );
}
