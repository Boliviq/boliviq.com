import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listTransactionsFn } from "@/lib/investor-os.functions";
import { currency, dateShort } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/investor-os/transactions")({
  component: TransactionsPage,
});

function TransactionsPage() {
  const fn = useServerFn(listTransactionsFn);
  const { data, isLoading } = useQuery({
    queryKey: ["investor-os-transactions"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) {
    return <div className="p-6 text-sm text-muted-foreground">Loading transactions…</div>;
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <PageHeader
        title="Transaction Command Center"
        description="Under-contract deals stay attached to the same property and CRM record through closing."
      />
      {data.source === "demo" ? (
        <Badge variant="outline" className="border-warning/40 bg-warning/10 text-warning">
          DEMO transaction timeline
        </Badge>
      ) : null}
      {(data as any).upgradeHint ? (
        <Badge variant="outline" className="border-warning/50 text-warning">
          {(data as any).upgradeHint}
        </Badge>
      ) : null}

      {data.transactions.map((tx: any) => (
        <Card key={tx.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              <span>
                {tx.address ? (
                  <Link
                    to="/investor-os/passport/$id"
                    params={{ id: tx.canonical_property_id }}
                    className="hover:underline"
                  >
                    {tx.address}
                  </Link>
                ) : (
                  tx.id
                )}
              </span>
              <Badge className="capitalize">{tx.phase?.replaceAll("_", " ")}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tx.alert ? (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
                <div className="font-medium">Transaction alert</div>
                <p className="text-muted-foreground">{tx.alert}</p>
              </div>
            ) : null}
            <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <div className="text-muted-foreground">Purchase</div>
                <div className="tabular-nums">{currency(tx.purchase_price)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Earnest</div>
                <div className="tabular-nums">{currency(tx.earnest_money)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Inspection deadline</div>
                <div>{dateShort(tx.inspection_deadline)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Closing</div>
                <div>{dateShort(tx.closing_date)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Title</div>
                <div>{tx.title_company ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Lender</div>
                <div>{tx.lender_name ?? "—"}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Timeline</div>
              {(tx.transaction_milestones ?? []).map((m: any, i: number) => (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant={m.status === "completed" ? "default" : "outline"}>
                    {m.status}
                  </Badge>
                  <span>{m.title}</span>
                  <span className="text-xs text-muted-foreground">{dateShort(m.due_at)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
