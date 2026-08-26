import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { matchFundingFn } from "@/lib/investor-os.functions";
import { currency } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investor-os/capital")({
  component: CapitalMarketplacePage,
});

function CapitalMarketplacePage() {
  const matchFn = useServerFn(matchFundingFn);
  const [purchase, setPurchase] = useState("185000");
  const [rehab, setRehab] = useState("70000");
  const [arv, setArv] = useState("365000");
  const [loan, setLoan] = useState("235000");
  const [state, setState] = useState("TN");
  const [result, setResult] = useState<any>(null);

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Capital Marketplace"
        description="Match deal packages with participating lenders. Boliviq is not the lender unless separately disclosed."
      />
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Purchase", purchase, setPurchase],
            ["Rehab", rehab, setRehab],
            ["ARV", arv, setArv],
            ["Loan request", loan, setLoan],
            ["State", state, setState],
          ].map(([label, value, setter]) => (
            <div key={label as string} className="space-y-1">
              <Label>{label as string}</Label>
              <Input
                value={value as string}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
      <Button
        className="bg-[#70bf2b] hover:bg-[#80ce38]"
        onClick={async () => {
          setResult(
            await matchFn({
              data: {
                purchasePrice: Number(purchase),
                rehab: Number(rehab),
                arv: Number(arv),
                loanRequest: Number(loan),
                exitStrategy: "fix_and_flip",
                state,
                experienceDeals: 3,
                borrowerCredit: 700,
              },
            }),
          );
        }}
      >
        Find funding matches
      </Button>
      {result ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {result.matches.length} potential funding matches
            {result.is_demo ? " · DEMO lenders" : ""}
          </p>
          {result.upgradeHint ? (
            <Badge variant="outline" className="border-warning/50 text-warning">
              {result.upgradeHint}
            </Badge>
          ) : null}
          {result.matches.map((m: any) => (
            <Card key={m.lender.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <div className="font-medium">{m.lender.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Max LTC {(m.lender.max_ltc * 100).toFixed(0)}% · Max ARV{" "}
                    {(m.lender.max_arv_pct * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Rate: {m.lender.rate_note} · Points: {m.lender.points_note} · Close:{" "}
                    {m.lender.close_days_note}
                  </div>
                  <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                    {m.reasons.map((r: string) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2 text-right">
                  <Badge>Score {m.match_score}</Badge>
                  <div>
                    <Button size="sm" variant="outline" disabled>
                      Request terms
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
        </div>
      ) : null}
    </div>
  );
}
