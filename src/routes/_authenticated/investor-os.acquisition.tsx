import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { runAcquisitionAgentFn } from "@/lib/investor-os.functions";
import { currency } from "@/lib/format";
import { PassportActionBar } from "@/components/investor-os/passport-action-bar";

export const Route = createFileRoute("/_authenticated/investor-os/acquisition")({
  component: AcquisitionAgentPage,
});

const DEFAULT_PROMPT = `Find single-family properties within 75 miles of Nashville with:
ARV between $300K and $600K
minimum 30% equity
rehab under $125K
distress score above 60
absentee owners preferred.`;

function AcquisitionAgentPage() {
  const runFn = useServerFn(runAcquisitionAgentFn);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="AI Acquisition Agent"
        description="Natural language → structured filters → ranked opportunities. Facts, estimates, and inferences stay labeled."
      />
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="min-h-[140px]"
      />
      <Button
        className="bg-[#70bf2b] hover:bg-[#80ce38]"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            setResult(await runFn({ data: { prompt } }));
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Searching…" : "Find matches"}
      </Button>

      {result ? (
        <div className="space-y-4">
          {result.upgradeHint ? (
            <Badge variant="outline" className="border-warning/50 text-warning">
              {result.upgradeHint}
            </Badge>
          ) : null}
          <Card>
            <CardContent className="space-y-1 p-4 text-sm">
              <div className="font-medium">{result.matches.length} matches</div>
              {result.interpretation.map((line: string, i: number) => (
                <div key={i} className="text-muted-foreground">
                  {line}
                </div>
              ))}
              <p className="text-xs text-muted-foreground">{result.claimKindsNote}</p>
            </CardContent>
          </Card>
          {result.matches.map((m: any, idx: number) => (
            <Card key={m.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                    <Link
                      to="/investor-os/passport/$id"
                      params={{ id: m.id }}
                      className="font-display text-lg font-semibold hover:underline"
                    >
                      {m.address_raw}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {[m.city, m.state_code].filter(Boolean).join(", ")} · Rank {m.rank_score} ·
                      Opp {m.opportunity_score}
                    </div>
                  </div>
                  <Badge>Opp {m.opportunity_score}</Badge>
                </div>
                <ul className="list-inside list-disc text-sm text-muted-foreground">
                  {(m.rank_reasons ?? []).map((r: string) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="text-sm tabular-nums text-muted-foreground">
                  ARV {currency(m.estimated_arv)} · Rehab {currency(m.estimated_rehab)} · Equity{" "}
                  {currency(m.estimated_equity)}
                </div>
                <PassportActionBar propertyId={m.id} compact />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
