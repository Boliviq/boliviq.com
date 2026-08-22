import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calculator, Save } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import {
  monthlyMortgage,
  capRate,
  cashOnCash,
  roi,
  mao,
  analyzeFlip,
  analyzeRental,
  analyzeBrrrr,
  analyzeWholesale,
  fmtMoney,
  fmtPct,
  num,
} from "@/lib/deal-calc";

export const Route = createFileRoute("/_authenticated/calculators")({
  head: () => ({
    meta: [
      { title: "Investor Calculators — Boliviq" },
      {
        name: "description",
        content: "Mortgage, cap rate, cash-on-cash, MAO, 70% rule, BRRRR, and more.",
      },
    ],
  }),
  component: Calculators,
});

function Calculators() {
  const { userId } = useCurrentUser();
  const [attachPropertyId, setAttachPropertyId] = useState("");

  const { data: properties } = useQuery({
    queryKey: ["calc-properties", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,address,city,state").limit(100);
      return data ?? [];
    },
  });

  const saveTo = (label: string, result: string) => {
    if (!attachPropertyId) return toast.error("Pick a property to attach the calculation to.");
    toast.success(`Saved ${label}`, {
      description: `${result} — attached in-session. Persistent save coming soon.`,
    });
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Investor Calculators"
        description="Every calculation an operator needs — save any result to a property."
        action={
          <div className="flex items-center gap-2">
            <Select value={attachPropertyId} onValueChange={setAttachPropertyId}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Attach results to property…" />
              </SelectTrigger>
              <SelectContent>
                {(properties ?? []).map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.address}, {p.city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="p-4 sm:p-8">
        <Tabs defaultValue="mortgage" className="w-full">
          <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1">
            {CALCS.map((c) => (
              <TabsTrigger
                key={c.id}
                value={c.id}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                {c.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {CALCS.map((c) => (
            <TabsContent key={c.id} value={c.id} className="mt-4">
              <c.Component onSave={(r) => saveTo(c.label, r)} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}

type CalcProps = { onSave: (result: string) => void };

function CalcShell({
  title,
  description,
  inputs,
  results,
  onSave,
}: {
  title: string;
  description: string;
  inputs: React.ReactNode;
  results: [string, string, boolean?][];
  onSave: (r: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" />
              {title}
            </CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSave(results.map(([k, v]) => `${k}: ${v}`).join(" · "))}
          >
            <Save className="mr-2 h-4 w-4" /> Save to property
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 sm:grid-cols-2">{inputs}</div>
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Results
          </div>
          <div className="space-y-2">
            {results.map(([k, v, good], i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{k}</span>
                <span
                  className={`tabular-nums font-semibold ${good === true ? "text-emerald-600 dark:text-emerald-400" : good === false ? "text-destructive" : ""}`}
                >
                  {v}
                </span>
              </div>
            ))}
          </div>
          <Separator className="my-3" />
          <p className="text-xs text-muted-foreground">Estimates only — not financial advice.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
function NI({ v, on, step = 1 }: { v: number; on: (n: number) => void; step?: number }) {
  return (
    <Input
      type="number"
      step={step}
      value={v || ""}
      onChange={(e) => on(num(e.target.value))}
      className="tabular-nums"
    />
  );
}
function MI({ v, on }: { v: number; on: (n: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        $
      </span>
      <Input
        type="number"
        value={v || ""}
        onChange={(e) => on(num(e.target.value))}
        className="pl-6 tabular-nums"
      />
    </div>
  );
}

// --- Individual calculators ---

function MortgageCalc({ onSave }: CalcProps) {
  const [p, setP] = useState(240000);
  const [r, setR] = useState(7.0);
  const [y, setY] = useState(30);
  const m = monthlyMortgage(p, r, y);
  const total = m * y * 12;
  return (
    <CalcShell
      title="Mortgage Payment"
      description="Principal + interest for a fixed-rate loan."
      onSave={onSave}
      inputs={
        <>
          <F label="Loan amount">
            <MI v={p} on={setP} />
          </F>
          <F label="Interest rate (%)">
            <NI v={r} on={setR} step={0.05} />
          </F>
          <F label="Term (years)">
            <NI v={y} on={setY} />
          </F>
        </>
      }
      results={[
        ["Monthly payment", fmtMoney(m)],
        ["Total interest", fmtMoney(total - p)],
        ["Total paid", fmtMoney(total)],
      ]}
    />
  );
}

function CapRateCalc({ onSave }: CalcProps) {
  const [noi, setNoi] = useState(18000);
  const [price, setPrice] = useState(240000);
  const cr = capRate(noi, price);
  return (
    <CalcShell
      title="Cap Rate"
      description="NOI ÷ purchase price."
      onSave={onSave}
      inputs={
        <>
          <F label="Annual NOI">
            <MI v={noi} on={setNoi} />
          </F>
          <F label="Purchase price">
            <MI v={price} on={setPrice} />
          </F>
        </>
      }
      results={[["Cap rate", fmtPct(cr), cr > 0.06]]}
    />
  );
}

function CocCalc({ onSave }: CalcProps) {
  const [cf, setCf] = useState(4800);
  const [inv, setInv] = useState(60000);
  const c = cashOnCash(cf, inv);
  return (
    <CalcShell
      title="Cash-on-Cash Return"
      description="Annual cash flow ÷ cash invested."
      onSave={onSave}
      inputs={
        <>
          <F label="Annual cash flow">
            <MI v={cf} on={setCf} />
          </F>
          <F label="Total cash invested">
            <MI v={inv} on={setInv} />
          </F>
        </>
      }
      results={[["Cash-on-cash", fmtPct(c), c > 0.08]]}
    />
  );
}

function RoiCalc({ onSave }: CalcProps) {
  const [g, setG] = useState(45000);
  const [inv, setInv] = useState(180000);
  const r = roi(g, inv);
  return (
    <CalcShell
      title="ROI"
      description="Net profit ÷ total investment."
      onSave={onSave}
      inputs={
        <>
          <F label="Net profit">
            <MI v={g} on={setG} />
          </F>
          <F label="Total investment">
            <MI v={inv} on={setInv} />
          </F>
        </>
      }
      results={[["ROI", fmtPct(r), r > 0.15]]}
    />
  );
}

function ArvCalc({ onSave }: CalcProps) {
  const [sqft, setSqft] = useState(1500);
  const [pps, setPps] = useState(220);
  const arv = sqft * pps;
  return (
    <CalcShell
      title="ARV Estimator"
      description="Comp $/sqft × subject sqft."
      onSave={onSave}
      inputs={
        <>
          <F label="Square footage">
            <NI v={sqft} on={setSqft} />
          </F>
          <F label="Comp price per sqft">
            <MI v={pps} on={setPps} />
          </F>
        </>
      }
      results={[["Estimated ARV", fmtMoney(arv)]]}
    />
  );
}

function MaoCalc({ onSave }: CalcProps) {
  const [arv, setArv] = useState(395000);
  const [rehab, setRehab] = useState(42000);
  const [pct, setPct] = useState(70);
  const [profit, setProfit] = useState(35000);
  const val = mao(arv, rehab, pct / 100, profit, 0);
  return (
    <CalcShell
      title="Maximum Allowable Offer"
      description="ARV × % − rehab − desired profit."
      onSave={onSave}
      inputs={
        <>
          <F label="ARV">
            <MI v={arv} on={setArv} />
          </F>
          <F label="Rehab">
            <MI v={rehab} on={setRehab} />
          </F>
          <F label="Multiplier (%)">
            <NI v={pct} on={setPct} />
          </F>
          <F label="Desired profit">
            <MI v={profit} on={setProfit} />
          </F>
        </>
      }
      results={[["MAO", fmtMoney(val), val > 0]]}
    />
  );
}

function SeventyRuleCalc({ onSave }: CalcProps) {
  const [arv, setArv] = useState(395000);
  const [rehab, setRehab] = useState(42000);
  const val = arv * 0.7 - rehab;
  return (
    <CalcShell
      title="70% Rule"
      description="ARV × 70% − rehab."
      onSave={onSave}
      inputs={
        <>
          <F label="ARV">
            <MI v={arv} on={setArv} />
          </F>
          <F label="Rehab">
            <MI v={rehab} on={setRehab} />
          </F>
        </>
      }
      results={[["Max offer (70%)", fmtMoney(val)]]}
    />
  );
}

function RentalCashFlowCalc({ onSave }: CalcProps) {
  const [price, setPrice] = useState(240000);
  const [rent, setRent] = useState(2100);
  const [down, setDown] = useState(25);
  const [rate, setRate] = useState(7.0);
  const [tax, setTax] = useState(3600);
  const [ins, setIns] = useState(1500);
  const a = analyzeRental({
    purchasePrice: price,
    rehab: 0,
    downPct: down,
    ratePct: rate,
    loanYears: 30,
    monthlyRent: rent,
    vacancyPct: 5,
    taxesAnnual: tax,
    insuranceAnnual: ins,
    maintenancePct: 8,
    mgmtPct: 8,
    utilitiesMonthly: 0,
    hoaMonthly: 0,
    capexPct: 5,
  });
  return (
    <CalcShell
      title="Rental Cash Flow"
      description="Monthly cash flow after all expenses."
      onSave={onSave}
      inputs={
        <>
          <F label="Purchase price">
            <MI v={price} on={setPrice} />
          </F>
          <F label="Monthly rent">
            <MI v={rent} on={setRent} />
          </F>
          <F label="Down (%)">
            <NI v={down} on={setDown} />
          </F>
          <F label="Interest rate (%)">
            <NI v={rate} on={setRate} step={0.05} />
          </F>
          <F label="Taxes (annual)">
            <MI v={tax} on={setTax} />
          </F>
          <F label="Insurance (annual)">
            <MI v={ins} on={setIns} />
          </F>
        </>
      }
      results={[
        ["Mortgage", fmtMoney(a.mortgage)],
        ["Operating expenses", fmtMoney(a.opex)],
        ["Monthly cash flow", fmtMoney(a.cashFlow), a.cashFlow > 0],
        ["Cash-on-cash", fmtPct(a.cashOnCash), a.cashOnCash > 0.08],
      ]}
    />
  );
}

function BrrrrCalc({ onSave }: CalcProps) {
  const [price, setPrice] = useState(180000);
  const [rehab, setRehab] = useState(45000);
  const [arv, setArv] = useState(300000);
  const [ltv, setLtv] = useState(75);
  const [rate, setRate] = useState(7.5);
  const [rent, setRent] = useState(2000);
  const a = analyzeBrrrr({
    purchasePrice: price,
    rehab,
    closingCosts: 5000,
    arv,
    refiLtvPct: ltv,
    refiRatePct: rate,
    refiYears: 30,
    monthlyRent: rent,
    monthlyOpex: 700,
  });
  return (
    <CalcShell
      title="BRRRR"
      description="Buy, rehab, rent, refi, repeat."
      onSave={onSave}
      inputs={
        <>
          <F label="Purchase price">
            <MI v={price} on={setPrice} />
          </F>
          <F label="Rehab">
            <MI v={rehab} on={setRehab} />
          </F>
          <F label="ARV">
            <MI v={arv} on={setArv} />
          </F>
          <F label="Refi LTV (%)">
            <NI v={ltv} on={setLtv} />
          </F>
          <F label="Refi rate (%)">
            <NI v={rate} on={setRate} step={0.05} />
          </F>
          <F label="Monthly rent">
            <MI v={rent} on={setRent} />
          </F>
        </>
      }
      results={[
        ["Total basis", fmtMoney(a.totalBasis)],
        ["Refi loan", fmtMoney(a.refiLoan)],
        ["Cash left in deal", fmtMoney(a.cashLeft), a.cashLeft < 10000],
        ["Monthly cash flow", fmtMoney(a.monthlyCashFlow), a.monthlyCashFlow > 0],
        ["Cash-on-cash", fmtPct(a.cashOnCash), a.cashOnCash > 0.15],
      ]}
    />
  );
}

function WholesaleCalc({ onSave }: CalcProps) {
  const [seller, setSeller] = useState(180000);
  const [buyer, setBuyer] = useState(200000);
  const [mkt, setMkt] = useState(500);
  const a = analyzeWholesale({
    sellerPrice: seller,
    buyerPrice: buyer,
    marketing: mkt,
    otherCosts: 0,
  });
  return (
    <CalcShell
      title="Wholesale Assignment Fee"
      description="Buyer price − seller price − costs."
      onSave={onSave}
      inputs={
        <>
          <F label="Seller contract price">
            <MI v={seller} on={setSeller} />
          </F>
          <F label="Buyer price">
            <MI v={buyer} on={setBuyer} />
          </F>
          <F label="Marketing">
            <MI v={mkt} on={setMkt} />
          </F>
        </>
      }
      results={[
        ["Assignment fee", fmtMoney(a.assignment)],
        ["Net", fmtMoney(a.net), a.net > 0],
      ]}
    />
  );
}

function HoldingCostsCalc({ onSave }: CalcProps) {
  const [months, setMonths] = useState(4);
  const [taxes, setTaxes] = useState(300);
  const [ins, setIns] = useState(120);
  const [utils, setUtils] = useState(150);
  const [debt, setDebt] = useState(1400);
  const monthly = taxes + ins + utils + debt;
  return (
    <CalcShell
      title="Holding Costs"
      description="Recurring costs while owning the property."
      onSave={onSave}
      inputs={
        <>
          <F label="Months held">
            <NI v={months} on={setMonths} />
          </F>
          <F label="Monthly taxes">
            <MI v={taxes} on={setTaxes} />
          </F>
          <F label="Monthly insurance">
            <MI v={ins} on={setIns} />
          </F>
          <F label="Monthly utilities">
            <MI v={utils} on={setUtils} />
          </F>
          <F label="Monthly debt service">
            <MI v={debt} on={setDebt} />
          </F>
        </>
      }
      results={[
        ["Monthly holding", fmtMoney(monthly)],
        ["Total over hold", fmtMoney(monthly * months)],
      ]}
    />
  );
}

function ClosingCostsCalc({ onSave }: CalcProps) {
  const [price, setPrice] = useState(240000);
  const [pct, setPct] = useState(2);
  const val = price * (pct / 100);
  return (
    <CalcShell
      title="Closing Costs"
      description="Rough estimate as % of price."
      onSave={onSave}
      inputs={
        <>
          <F label="Price">
            <MI v={price} on={setPrice} />
          </F>
          <F label="Closing (%)">
            <NI v={pct} on={setPct} step={0.1} />
          </F>
        </>
      }
      results={[["Closing costs", fmtMoney(val)]]}
    />
  );
}

function FlipProfitCalc({ onSave }: CalcProps) {
  const [price, setPrice] = useState(240000);
  const [rehab, setRehab] = useState(42000);
  const [arv, setArv] = useState(395000);
  const [months, setMonths] = useState(4);
  const a = analyzeFlip({
    purchasePrice: price,
    rehab,
    arv,
    closingBuyPct: 2,
    closingSellPct: 1,
    holdingMonths: months,
    monthlyHolding: 650,
    financingCost: 6000,
    sellingCostsPct: 6,
  });
  return (
    <CalcShell
      title="Flip Profit"
      description="Full flip cost stack."
      onSave={onSave}
      inputs={
        <>
          <F label="Purchase price">
            <MI v={price} on={setPrice} />
          </F>
          <F label="Rehab">
            <MI v={rehab} on={setRehab} />
          </F>
          <F label="ARV">
            <MI v={arv} on={setArv} />
          </F>
          <F label="Months to sell">
            <NI v={months} on={setMonths} />
          </F>
        </>
      }
      results={[
        ["Total cost", fmtMoney(a.totalCost)],
        ["Net profit", fmtMoney(a.netProfit), a.netProfit > 0],
        ["ROI", fmtPct(a.roi), a.roi > 0.15],
        ["Margin", fmtPct(a.margin), a.margin > 0.15],
      ]}
    />
  );
}

const CALCS = [
  { id: "mortgage", label: "Mortgage", Component: MortgageCalc },
  { id: "caprate", label: "Cap Rate", Component: CapRateCalc },
  { id: "coc", label: "Cash-on-Cash", Component: CocCalc },
  { id: "roi", label: "ROI", Component: RoiCalc },
  { id: "arv", label: "ARV", Component: ArvCalc },
  { id: "mao", label: "MAO", Component: MaoCalc },
  { id: "seventy", label: "70% Rule", Component: SeventyRuleCalc },
  { id: "rental", label: "Rental Cash Flow", Component: RentalCashFlowCalc },
  { id: "brrrr", label: "BRRRR", Component: BrrrrCalc },
  { id: "wholesale", label: "Wholesale", Component: WholesaleCalc },
  { id: "holding", label: "Holding Costs", Component: HoldingCostsCalc },
  { id: "closing", label: "Closing Costs", Component: ClosingCostsCalc },
  { id: "flip", label: "Flip Profit", Component: FlipProfitCalc },
] as const;
