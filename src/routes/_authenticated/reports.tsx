import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { Printer, FileDown, Sparkles, AlertTriangle, CheckCircle2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableRow, TableHead, TableHeader } from "@/components/ui/table";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  analyzeFlip, analyzeRental, analyzeBrrrr, dealScore, scoreBand,
  fmtMoney, fmtPct, mao,
} from "@/lib/deal-calc";
import { toast } from "sonner";

const searchSchema = z.object({
  property: z.string().optional(),
  arv: z.coerce.number().optional(),
  price: z.coerce.number().optional(),
  rehab: z.coerce.number().optional(),
  score: z.coerce.number().optional(),
});

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({ meta: [
    { title: "Deal Reports — Boliviq" },
    { name: "description", content: "Printable investor deal summary with strategy comparison, rehab, and offers." },
  ]}),
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  component: ReportsPage,
});

function ReportsPage() {
  const { userId } = useCurrentUser();
  const search = Route.useSearch();

  const { data: property } = useQuery({
    queryKey: ["report-property", search.property],
    enabled: !!search.property,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("*").eq("id", search.property!).maybeSingle();
      return data;
    },
  });

  const price = search.price ?? property?.list_price ?? 285000;
  const arv = search.arv ?? property?.arv ?? 395000;
  const rehab = search.rehab ?? property?.rehab_estimate ?? 42000;
  const sqft = property?.sqft ?? 1500;

  const flip = useMemo(() => analyzeFlip({
    purchasePrice: price, rehab, arv, closingBuyPct: 2, closingSellPct: 1,
    holdingMonths: 4, monthlyHolding: 650, financingCost: 6000, sellingCostsPct: 6,
  }), [price, rehab, arv]);

  const rental = useMemo(() => analyzeRental({
    purchasePrice: price, rehab, downPct: 25, ratePct: 7.25, loanYears: 30,
    monthlyRent: property?.monthly_rent ?? 2100, vacancyPct: 5,
    taxesAnnual: 4200, insuranceAnnual: 1800,
    maintenancePct: 8, mgmtPct: 8, utilitiesMonthly: 0, hoaMonthly: 0, capexPct: 5,
  }), [price, rehab, property]);

  const brrrr = useMemo(() => analyzeBrrrr({
    purchasePrice: price, rehab, closingCosts: price * 0.02 + 6000, arv,
    refiLtvPct: 75, refiRatePct: 7.5, refiYears: 30,
    monthlyRent: property?.monthly_rent ?? 2100, monthlyOpex: rental.opex,
  }), [price, rehab, arv, property, rental.opex]);

  const score = useMemo(() => dealScore({
    arv, purchasePrice: price, rehab,
    flipNetProfit: flip.netProfit, flipRoi: flip.roi,
    monthlyCashFlow: rental.cashFlow, capRate: rental.capRate,
  }), [arv, price, rehab, flip, rental]);

  const overallScore = search.score ?? score.overall;
  const band = scoreBand(overallScore);

  const address = property ? `${property.address}, ${property.city} ${property.state} ${property.zip ?? ""}` : "Sample Property";

  const offerTarget = mao(arv, rehab, 0.7, 35000, price * 0.02 + 6000);
  const offerConservative = mao(arv, rehab, 0.65, 35000, price * 0.02 + 6000);
  const offerMax = mao(arv, rehab, 0.75, 25000, price * 0.02 + 6000);

  const handlePrint = () => window.print();
  const handlePdf = () => toast("PDF export coming soon", { description: "Use Print → Save as PDF for now." });

  return (
    <div className="flex flex-col">
      <div className="print:hidden">
        <PageHeader
          title="Deal Report"
          description="Printable investor summary. Perfect for lender packets and JV partners."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePdf}><FileDown className="mr-2 h-4 w-4" />PDF (soon)</Button>
              <Button size="sm" onClick={handlePrint}><Printer className="mr-2 h-4 w-4" />Print</Button>
            </div>
          }
        />
      </div>

      <div className="mx-auto w-full max-w-[900px] p-4 sm:p-8 print:p-0">
        {/* Report sheet */}
        <div className="rounded-xl border bg-card p-8 shadow-sm print:border-0 print:shadow-none">
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-primary">Boliviq</div>
              <h1 className="mt-2 font-display text-3xl font-bold">{address}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {property?.property_type ?? "Single family"} · {property?.beds ?? 3} bd · {property?.baths ?? 2} ba · {sqft.toLocaleString()} sqft · Built {property?.year_built ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preliminary score</div>
              <div className="mt-1 text-5xl font-bold tabular-nums font-display">{overallScore}</div>
              <Badge variant={band.tone === "success" ? "default" : "secondary"} className="mt-2">{band.label}</Badge>
            </div>
          </div>

          {/* Photo */}
          {property?.image_url && (
            <div className="mt-6 overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={property.image_url} alt={address} className="h-64 w-full object-cover" />
            </div>
          )}

          {/* Snapshot */}
          <Section title="Snapshot">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi label="Purchase price" value={fmtMoney(price)} />
              <Kpi label="Estimated rehab" value={fmtMoney(rehab)} />
              <Kpi label="ARV" value={fmtMoney(arv)} />
              <Kpi label="Equity spread" value={fmtMoney(arv - price - rehab)} good={arv - price - rehab > 0} />
            </div>
          </Section>

          {/* Assumptions */}
          <Section title="Assumptions">
            <Table>
              <TableBody>
                <Row k="Closing costs (buy)" v="2.0% of purchase" />
                <Row k="Closing costs (sell)" v="1.0% of ARV" />
                <Row k="Commissions" v="6.0% of ARV" />
                <Row k="Holding period" v="4 months at $650/mo" />
                <Row k="Financing" v={`${fmtMoney(6000)} points/interest`} />
                <Row k="Rental down payment" v="25% at 7.25% APR, 30 years" />
                <Row k="Vacancy / management / maintenance / CapEx" v="5% / 8% / 8% / 5%" />
                <Row k="BRRRR refinance" v="75% LTV at 7.5% APR" />
              </TableBody>
            </Table>
          </Section>

          {/* Comps */}
          <Section title="Comparable sales">
            <Table>
              <TableHeader><TableRow><TableHead>Comp</TableHead><TableHead>Distance</TableHead><TableHead>Sqft</TableHead><TableHead className="text-right">Sold</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>408 Oak St</TableCell><TableCell>0.1 mi</TableCell><TableCell>1,480</TableCell><TableCell className="text-right tabular-nums">{fmtMoney(388000)}</TableCell></TableRow>
                <TableRow><TableCell>521 Oak St</TableCell><TableCell>0.2 mi</TableCell><TableCell>1,510</TableCell><TableCell className="text-right tabular-nums">{fmtMoney(402000)}</TableCell></TableRow>
                <TableRow><TableCell>112 Elm Ave</TableCell><TableCell>0.4 mi</TableCell><TableCell>1,440</TableCell><TableCell className="text-right tabular-nums">{fmtMoney(395000)}</TableCell></TableRow>
              </TableBody>
            </Table>
            <p className="mt-2 text-xs text-muted-foreground">Comps are illustrative until MLS is connected.</p>
          </Section>

          {/* Rehab */}
          <Section title="Rehab budget">
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total rehab estimate</span>
                <span className="text-xl font-semibold tabular-nums">{fmtMoney(rehab)}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Approximately {fmtMoney(rehab / Math.max(sqft, 1))} per sqft. Line-item breakdown available in the Deal Analyzer.
              </p>
            </div>
          </Section>

          {/* Strategy comparison */}
          <Section title="Strategy comparison">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">Net / Cash flow</TableHead>
                  <TableHead className="text-right">Return</TableHead>
                  <TableHead className="text-right">Key metric</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Fix & Flip</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(flip.netProfit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(flip.roi)} ROI</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(flip.margin)} margin</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Rental</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(rental.cashFlow)}/mo</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(rental.cashOnCash)} CoC</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(rental.capRate)} cap</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">BRRRR</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(brrrr.monthlyCashFlow)}/mo</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtPct(brrrr.cashOnCash)} CoC</TableCell>
                  <TableCell className="text-right tabular-nums">{fmtMoney(brrrr.cashLeft)} left in</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Section>

          {/* Offers */}
          <Section title="Offer recommendation">
            <div className="grid gap-3 sm:grid-cols-3">
              <OfferCard label="Conservative" value={offerConservative} sub="65% MAO" />
              <OfferCard label="Target" value={offerTarget} sub="70% MAO" highlight />
              <OfferCard label="Maximum" value={offerMax} sub="75% MAO" />
            </div>
          </Section>

          {/* Score breakdown + risks */}
          <Section title="Deal score breakdown">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Sub-scores</div>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between"><span className="text-muted-foreground">Profit potential</span><span className="tabular-nums font-medium">{score.profitScore}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Rental performance</span><span className="tabular-nums font-medium">{score.rentalScore}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Rehab risk</span><span className="tabular-nums font-medium">{score.rehabRiskScore}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Market confidence</span><span className="tabular-nums font-medium">{score.marketConfidenceScore}</span></li>
                  <li className="flex justify-between"><span className="text-muted-foreground">Seller motivation</span><span className="tabular-nums font-medium">{score.sellerMotivationScore}</span></li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><AlertTriangle className="h-4 w-4 text-amber-500" /> Risks</div>
                <ul className="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
                  {rehab > arv * 0.25 && <li>Rehab exceeds 25% of ARV — execution risk elevated.</li>}
                  {flip.netProfit < 20000 && <li>Thin flip margin — limited room for cost overruns.</li>}
                  {rental.dscr < 1.1 && <li>DSCR under 1.10 may not qualify for DSCR loans.</li>}
                  <li>Comps and rehab must be verified locally.</li>
                </ul>
                <div className="mt-3 flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Projected profit</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Flip: <strong className="text-foreground">{fmtMoney(flip.netProfit)}</strong> · Rental annual: <strong className="text-foreground">{fmtMoney(rental.annualCashFlow)}</strong>
                </p>
              </div>
            </div>
          </Section>

          <Alert className="mt-6 print:mt-4">
            <AlertDescription className="text-xs">
              All figures are estimates generated from user-provided inputs and rule-based calculations. Not financial or investment advice.
              Verify ARV, rehab, and closing costs with local professionals before making an offer.
            </AlertDescription>
          </Alert>

          <div className="mt-6 border-t pt-4 text-center text-xs text-muted-foreground">
            Prepared by Boliviq · {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 print:mt-6 print:break-inside-avoid">
      <h2 className="mb-3 font-display text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

function Kpi({ label, value, good }: { label: string; value: string; good?: boolean }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-lg font-semibold tabular-nums ${good === true ? "text-emerald-600 dark:text-emerald-400" : good === false ? "text-destructive" : ""}`}>{value}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <TableRow><TableCell className="text-muted-foreground">{k}</TableCell><TableCell className="text-right">{v}</TableCell></TableRow>;
}

function OfferCard({ label, value, sub, highlight }: { label: string; value: number; sub: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary bg-primary/5" : ""}>
      <CardHeader className="pb-1"><CardTitle className="text-sm">{label}</CardTitle></CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{fmtMoney(Math.max(0, value))}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
