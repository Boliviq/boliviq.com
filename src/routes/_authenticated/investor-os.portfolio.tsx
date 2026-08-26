import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getPortfolioCommandFn } from "@/lib/investor-os.functions";
import { currency, pct } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investor-os/portfolio")({
  component: PortfolioCommandPage,
});

function PortfolioCommandPage() {
  const fn = useServerFn(getPortfolioCommandFn);
  const { data, isLoading } = useQuery({
    queryKey: ["investor-os-portfolio"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading portfolio…</div>;
  }

  const r = data.rollup;

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Portfolio Command Center"
        description="Owned assets stay on the same property record — no duplicate recreations after closing."
      />
      {data.is_demo ? (
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          DEMO portfolio derived from canonical demo properties
        </Badge>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Properties", r.propertyCount],
          ["Estimated value", currency(r.estimatedValue)],
          ["Debt", currency(r.debt)],
          ["Equity", currency(r.equity)],
          ["Monthly gross", currency(r.monthlyGrossIncome)],
          ["Monthly net CF", currency(r.monthlyNetCashFlow)],
          ["Rehabs", r.rehabs],
          ["Vacant", r.vacant],
        ].map(([label, value]) => (
          <Card key={label as string}>
            <CardContent className="p-4">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {label as string}
              </div>
              <div className="mt-1 font-display text-xl font-semibold tabular-nums">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI portfolio insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.insights.map((i: any, idx: number) => (
            <div key={idx} className="rounded-md border px-3 py-2">
              <Badge variant="outline" className="mb-1">
                {i.kind}
              </Badge>
              <p className="text-muted-foreground">{i.text}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-3">
        {data.assets.map((a: any) => (
          <Card key={a.id}>
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
              <div>
                <Link
                  to="/investor-os/passport/$id"
                  params={{ id: a.canonical_property_id }}
                  className="font-medium hover:underline"
                >
                  {a.address ?? a.canonical_property_id}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {[a.city, a.state_code].filter(Boolean).join(", ")} · {a.status}
                  {a.is_demo ? " · DEMO" : ""}
                </div>
                <div className="mt-1 text-sm tabular-nums text-muted-foreground">
                  Value {currency(a.metrics.value)} · Equity {currency(a.metrics.equity)} · CF{" "}
                  {currency(a.metrics.cashFlow)} · Cap {pct(a.metrics.capRate * 100)}
                </div>
              </div>
              <Badge variant="secondary">{a.status}</Badge>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
