import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runOpportunityRadarFn } from "@/lib/investor-os.functions";
import { currency } from "@/lib/format";
import { PassportActionBar } from "@/components/investor-os/passport-action-bar";

export const Route = createFileRoute("/_authenticated/investor-os/radar")({
  component: OpportunityRadarPage,
});

function OpportunityRadarPage() {
  const radarFn = useServerFn(runOpportunityRadarFn);
  const [name, setName] = useState("Nashville MSA buy box");
  const [acquisitionMax, setAcquisitionMax] = useState("300000");
  const [arvMin, setArvMin] = useState("400000");
  const [rehabMax, setRehabMax] = useState("100000");
  const [profitMin, setProfitMin] = useState("60000");
  const [equityPctMin, setEquityPctMin] = useState("30");
  const [digest, setDigest] = useState<"instant" | "daily" | "weekly" | "none">("daily");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Opportunity Radar"
        description="Define a buy box once. Boliviq ranks matching opportunities across distressed, marketplace, and DEMO catalog sources."
      />

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1 sm:col-span-2 lg:col-span-3">
            <Label>Buy box name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Acquisition max</Label>
            <Input value={acquisitionMax} onChange={(e) => setAcquisitionMax(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>ARV min</Label>
            <Input value={arvMin} onChange={(e) => setArvMin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Rehab max</Label>
            <Input value={rehabMax} onChange={(e) => setRehabMax(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Min projected profit</Label>
            <Input value={profitMin} onChange={(e) => setProfitMin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Min equity %</Label>
            <Input value={equityPctMin} onChange={(e) => setEquityPctMin(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Alert digest</Label>
            <Select value={digest} onValueChange={(v) => setDigest(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">Instant</SelectItem>
                <SelectItem value="daily">Daily digest</SelectItem>
                <SelectItem value="weekly">Weekly digest</SelectItem>
                <SelectItem value="none">None</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        className="bg-[#70bf2b] hover:bg-[#80ce38]"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            const criteria = {
              market: "Nashville MSA",
              state: "TN",
              radiusMiles: 75,
              propertyTypes: ["residential", "sfr"],
              acquisitionMax: Number(acquisitionMax),
              arvMin: Number(arvMin),
              rehabMax: Number(rehabMax),
              profitMin: Number(profitMin),
              equityPctMin: Number(equityPctMin) / 100,
              distressPreferred: true,
            };
            setResult(
              await radarFn({
                data: {
                  name,
                  criteriaJson: JSON.stringify(criteria),
                  alertDigest: digest,
                },
              }),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Scanning…" : "Run radar"}
      </Button>

      {result ? (
        <div className="space-y-3">
          {result.upgradeHint ? (
            <Badge variant="outline" className="border-warning/50 text-warning">
              {result.upgradeHint}
            </Badge>
          ) : null}
          <p className="text-sm text-muted-foreground">
            {result.matches.length} matches · alerts: {result.alertDigest}
          </p>
          {result.matches.map((m: any) => (
            <Card key={m.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Badge className="mb-1">Match {m.match_score}</Badge>
                    <Link
                      to="/investor-os/passport/$id"
                      params={{ id: m.id }}
                      className="block font-display text-lg font-semibold hover:underline"
                    >
                      {m.address_raw}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      Acq {currency(m.opening_bid ?? m.estimated_value)} · ARV{" "}
                      {currency(m.estimated_arv)} · Rehab {currency(m.estimated_rehab)}
                    </div>
                  </div>
                </div>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {(m.reasons ?? []).map((r: string) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <PassportActionBar propertyId={m.id} compact />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
