import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Calculator, TrendingUp, Home, Wrench, Sparkles, FileDown, Save,
  Info, ArrowRight, Target, AlertTriangle, CheckCircle2,
} from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useEntitlement } from "@/hooks/use-entitlement";
import { useServerFn } from "@tanstack/react-start";
import { analyzeDealAi } from "@/lib/ai.functions";
import { dispatchAutomationEvent } from "@/lib/automations.functions";
import {
  analyzeFlip, analyzeRental, analyzeBrrrr, analyzeWholesale,
  dealScore, scoreBand, mao, fmtMoney, fmtPct, num,
  REHAB_PRESETS, REHAB_CATEGORIES,
} from "@/lib/deal-calc";

export const Route = createFileRoute("/_authenticated/deal-analyzer")({
  head: () => ({ meta: [
    { title: "Deal Analyzer — Boliviq" },
    { name: "description", content: "Analyze fix-and-flip, rental, BRRRR, and wholesale deals with AI-assisted scoring." },
  ]}),
  component: DealAnalyzer,
});

type RehabRow = { category: string; qty: number; unitCost: number; labor: number; material: number; notes: string };

const emptyRehabRows = (): RehabRow[] =>
  REHAB_CATEGORIES.map((c) => ({ category: c, qty: 0, unitCost: 0, labor: 0, material: 0, notes: "" }));

function DealAnalyzer() {
  const { userId } = useCurrentUser();
  const { data: entitlement } = useEntitlement();
  const analyzeFn = useServerFn(analyzeDealAi);
  const dispatchAuto = useServerFn(dispatchAutomationEvent);
  const [aiMemo, setAiMemo] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ["analyzer-properties", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase.from("properties").select("id,address,city,state,list_price,arv,rehab_estimate,sqft,beds,baths,year_built,property_type,image_url").order("created_at", { ascending: false }).limit(50);
      return data ?? [];
    },
  });

  const [propertyId, setPropertyId] = useState<string>("");

  // Purchase
  const [askingPrice, setAskingPrice] = useState(300000);
  const [purchasePrice, setPurchasePrice] = useState(285000);
  const [closingBuyPct, setClosingBuyPct] = useState(2);
  const [financingCost, setFinancingCost] = useState(6000);
  const [assignmentFee, setAssignmentFee] = useState(0);
  const [earnest, setEarnest] = useState(2500);
  const [inspection, setInspection] = useState(500);

  // Property
  const [propType, setPropType] = useState("Single family");
  const [beds, setBeds] = useState(3);
  const [baths, setBaths] = useState(2);
  const [sqft, setSqft] = useState(1500);
  const [lotSize, setLotSize] = useState(6000);
  const [yearBuilt, setYearBuilt] = useState(1985);
  const [condition, setCondition] = useState("Fair");
  const [occupancy, setOccupancy] = useState("Vacant");

  // ARV
  const [arv, setArv] = useState(395000);
  const [compLow, setCompLow] = useState(380000);
  const [compHigh, setCompHigh] = useState(410000);
  const [pricePerSqft, setPricePerSqft] = useState(263);
  const [arvConfidence, setArvConfidence] = useState(7);
  const [arvOverride, setArvOverride] = useState(false);

  // Rehab
  const [rehabRows, setRehabRows] = useState<RehabRow[]>(emptyRehabRows);
  const [rehabPreset, setRehabPreset] = useState<keyof typeof REHAB_PRESETS | "custom">("custom");
  const [localCostMultiplier, setLocalCostMultiplier] = useState(1.0);

  const rehabTotal = useMemo(() => {
    const line = rehabRows.reduce((s, r) => s + r.qty * r.unitCost + r.labor + r.material, 0);
    return Math.round(line * localCostMultiplier);
  }, [rehabRows, localCostMultiplier]);

  // Strategy inputs (defaults)
  const [holdingMonths, setHoldingMonths] = useState(4);
  const [monthlyHolding, setMonthlyHolding] = useState(650);
  const [closingSellPct, setClosingSellPct] = useState(1);
  const [sellingCostsPct, setSellingCostsPct] = useState(6);
  const [desiredProfit, setDesiredProfit] = useState(35000);

  // Rental
  const [monthlyRent, setMonthlyRent] = useState(2200);
  const [downPct, setDownPct] = useState(25);
  const [ratePct, setRatePct] = useState(7.25);
  const [loanYears, setLoanYears] = useState(30);
  const [vacancyPct, setVacancyPct] = useState(5);
  const [taxesAnnual, setTaxesAnnual] = useState(4200);
  const [insuranceAnnual, setInsuranceAnnual] = useState(1800);
  const [maintenancePct, setMaintenancePct] = useState(8);
  const [mgmtPct, setMgmtPct] = useState(8);
  const [capexPct, setCapexPct] = useState(5);

  // BRRRR
  const [refiLtvPct, setRefiLtvPct] = useState(75);
  const [refiRatePct, setRefiRatePct] = useState(7.5);

  // Wholesale
  const [buyerPrice, setBuyerPrice] = useState(315000);
  const [marketing, setMarketing] = useState(500);

  // Signals
  const [daysOnMarket, setDaysOnMarket] = useState(18);
  const [sellerMotivation, setSellerMotivation] = useState(7);
  const [compConfidence, setCompConfidence] = useState(7);
  const [neighborhoodRisk, setNeighborhoodRisk] = useState(4);
  const [financingRisk, setFinancingRisk] = useState(3);

  // Load from selected property
  const loadFromProperty = (id: string) => {
    setPropertyId(id);
    const p = (properties ?? []).find((x: any) => x.id === id);
    if (!p) return;
    if (p.list_price) { setAskingPrice(Number(p.list_price)); setPurchasePrice(Math.round(Number(p.list_price) * 0.93)); }
    if (p.arv) setArv(Number(p.arv));
    if (p.rehab_estimate) applyRehabTotal(Number(p.rehab_estimate));
    if (p.sqft) setSqft(Number(p.sqft));
    if (p.beds) setBeds(Number(p.beds));
    if (p.baths) setBaths(Number(p.baths));
    if (p.year_built) setYearBuilt(Number(p.year_built));
    if (p.property_type) setPropType(String(p.property_type));
    toast.success(`Loaded ${p.address}`);
  };

  const applyRehabPreset = (key: keyof typeof REHAB_PRESETS) => {
    setRehabPreset(key);
    const per = REHAB_PRESETS[key].perSqft;
    const total = per * sqft;
    applyRehabTotal(total);
    toast.success(`Applied ${REHAB_PRESETS[key].label}: ${fmtMoney(total)}`);
  };

  const applyRehabTotal = (total: number) => {
    // Distribute across common categories
    const weights: Record<string, number> = {
      Kitchen: 0.18, Bathrooms: 0.14, Flooring: 0.12, Paint: 0.08, HVAC: 0.08,
      Roof: 0.07, Electrical: 0.06, Plumbing: 0.06, Windows: 0.05, Drywall: 0.04,
      Exterior: 0.04, Appliances: 0.03, Landscaping: 0.02, Cleanup: 0.01, Permits: 0.01, Contingency: 0.01,
    };
    setRehabRows((prev) => prev.map((r) => {
      const w = weights[r.category] ?? 0;
      return { ...r, qty: 1, unitCost: Math.round(total * w), labor: 0, material: 0 };
    }));
  };

  const updateRehab = (i: number, patch: Partial<RehabRow>) => {
    setRehabRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  // --- Compute analyses ---
  const buyClosing = purchasePrice * (closingBuyPct / 100);
  const totalCashIn = purchasePrice + rehabTotal + buyClosing + financingCost + earnest + inspection + assignmentFee;

  const flip = analyzeFlip({
    purchasePrice, rehab: rehabTotal, arv,
    closingBuyPct, closingSellPct, holdingMonths, monthlyHolding, financingCost,
    desiredProfit, sellingCostsPct,
  });

  const rental = analyzeRental({
    purchasePrice, rehab: rehabTotal, downPct, ratePct, loanYears, monthlyRent,
    vacancyPct, taxesAnnual, insuranceAnnual, maintenancePct, mgmtPct,
    utilitiesMonthly: 0, hoaMonthly: 0, capexPct,
  });

  const brrrr = analyzeBrrrr({
    purchasePrice, rehab: rehabTotal, closingCosts: buyClosing + financingCost,
    arv, refiLtvPct, refiRatePct, refiYears: loanYears,
    monthlyRent, monthlyOpex: rental.opex,
  });

  const wholesale = analyzeWholesale({
    sellerPrice: purchasePrice, buyerPrice, marketing, otherCosts: earnest,
  });

  const score = dealScore({
    arv, purchasePrice, rehab: rehabTotal,
    flipNetProfit: flip.netProfit, flipRoi: flip.roi,
    monthlyCashFlow: rental.cashFlow, capRate: rental.capRate,
    daysOnMarket, sellerMotivation, compConfidence, neighborhoodRisk, financingRisk,
  });

  const band = scoreBand(score.overall);

  const offerConservative = mao(arv, rehabTotal, 0.65, desiredProfit, buyClosing + financingCost);
  const offerTarget = mao(arv, rehabTotal, 0.70, desiredProfit, buyClosing + financingCost);
  const offerMax = mao(arv, rehabTotal, 0.75, desiredProfit * 0.7, buyClosing + financingCost);

  const explanation = useMemo(() => {
    const reasons: string[] = [];
    const risks: string[] = [];
    const missing: string[] = [];
    if (flip.margin > 0.18) reasons.push(`Healthy flip margin at ${fmtPct(flip.margin)}.`);
    if (flip.roi > 0.2) reasons.push(`Strong projected ROI of ${fmtPct(flip.roi)}.`);
    if (rental.cashFlow > 300) reasons.push(`Solid monthly cash flow of ${fmtMoney(rental.cashFlow)}.`);
    if (rental.capRate > 0.06) reasons.push(`Cap rate above 6% (${fmtPct(rental.capRate)}).`);
    if (purchasePrice + rehabTotal < arv * 0.75) reasons.push(`All-in cost is below 75% of ARV.`);

    if (rehabTotal > arv * 0.25) risks.push(`Rehab is ${fmtPct(rehabTotal / arv)} of ARV — execution risk is elevated.`);
    if (flip.netProfit < 20000) risks.push(`Flip net profit is thin (${fmtMoney(flip.netProfit)}) — little margin for cost overruns.`);
    if (rental.dscr < 1.1 && rental.dscr > 0) risks.push(`DSCR of ${rental.dscr.toFixed(2)} may not qualify for DSCR loans.`);
    if (daysOnMarket > 60) risks.push(`On market ${daysOnMarket} days — possible pricing or condition issues.`);
    if (neighborhoodRisk >= 7) risks.push(`Neighborhood risk rated high.`);

    if (arvConfidence < 6) missing.push(`ARV confidence is low — pull more comps.`);
    if (!monthlyRent) missing.push(`Add market rent for rental / BRRRR analysis.`);
    return { reasons, risks, missing };
  }, [flip, rental, purchasePrice, rehabTotal, arv, daysOnMarket, neighborhoodRisk, arvConfidence, monthlyRent]);

  const saveAnalysis = async () => {
    if (!propertyId) {
      toast.error("Select a property to save this analysis.");
      return;
    }
    const { error } = await (supabase.from("properties") as any).update({
      list_price: purchasePrice,
      arv,
      rehab_estimate: rehabTotal,
      estimated_profit: flip.netProfit,
      monthly_rent: monthlyRent || null,
      monthly_cashflow: rental.cashFlow,
      deal_score: score.overall,
      analysis: {
        savedAt: new Date().toISOString(),
        purchasePrice, arv, rehab: rehabTotal,
        flip, rental, score: score.overall,
        memo: aiMemo,
      },
    }).eq("id", propertyId);
    if (error) { toast.error(error.message); return; }
    toast.success("Analysis saved to the property record.");
    try {
      await dispatchAuto({ data: { trigger: "score_over", payload: { propertyId, score: score.overall } } });
    } catch { /* non-blocking */ }
  };

  const runAiMemo = async () => {
    if (entitlement?.ai === "none") {
      toast.error("Upgrade to Professional or AI Max to generate an AI deal memo.");
      return;
    }
    setAiBusy(true);
    try {
      const res = await analyzeFn({
        data: {
          address: properties?.find((p: any) => p.id === propertyId)?.address,
          purchasePrice, arv, rehab: rehabTotal,
          flipProfit: flip.netProfit, cashFlow: rental.cashFlow,
          capRate: rental.capRate, score: score.overall,
        },
      });
      setAiMemo(res.narrative);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI memo failed");
    } finally {
      setAiBusy(false);
    }
  };

  const exportReport = () => {
    // Route to reports page with query
    window.location.href = `/reports?property=${propertyId}&arv=${arv}&price=${purchasePrice}&rehab=${rehabTotal}&score=${score.overall}`;
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Deal Analyzer"
        description="Run a property through every strategy with a transparent, rule-based score."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={saveAnalysis}><Save className="mr-2 h-4 w-4" />Save</Button>
            <Button variant="outline" size="sm" onClick={runAiMemo} disabled={aiBusy}>
              <Sparkles className="mr-2 h-4 w-4" />{aiBusy ? "Writing…" : "AI memo"}
            </Button>
            <Button size="sm" onClick={exportReport}><FileDown className="mr-2 h-4 w-4" />Report</Button>
          </div>
        }
      />

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_360px] sm:p-8">
        {/* LEFT: inputs */}
        <div className="min-w-0 space-y-6">
          {/* Property selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Property</CardTitle>
              <CardDescription>Pick from your saved list or enter details manually.</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={propertyId} onValueChange={loadFromProperty}>
                <SelectTrigger><SelectValue placeholder="Choose a property from your list…" /></SelectTrigger>
                <SelectContent>
                  {(properties ?? []).map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.address}, {p.city} {p.state}</SelectItem>
                  ))}
                  {(!properties || properties.length === 0) && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No properties yet — enter values below.</div>
                  )}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Tabs defaultValue="purchase" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="purchase"><Home className="mr-2 h-4 w-4 hidden sm:inline" />Purchase</TabsTrigger>
              <TabsTrigger value="arv"><TrendingUp className="mr-2 h-4 w-4 hidden sm:inline" />ARV</TabsTrigger>
              <TabsTrigger value="rehab"><Wrench className="mr-2 h-4 w-4 hidden sm:inline" />Rehab</TabsTrigger>
              <TabsTrigger value="strategy"><Calculator className="mr-2 h-4 w-4 hidden sm:inline" />Strategy</TabsTrigger>
            </TabsList>

            {/* PURCHASE */}
            <TabsContent value="purchase" className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Purchase information</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Asking price"><MoneyInput value={askingPrice} onChange={setAskingPrice} /></Field>
                  <Field label="Proposed purchase price"><MoneyInput value={purchasePrice} onChange={setPurchasePrice} /></Field>
                  <Field label="Closing costs (%)"><NumberInput value={closingBuyPct} onChange={setClosingBuyPct} step={0.1} /></Field>
                  <Field label="Financing costs"><MoneyInput value={financingCost} onChange={setFinancingCost} /></Field>
                  <Field label="Assignment fee"><MoneyInput value={assignmentFee} onChange={setAssignmentFee} /></Field>
                  <Field label="Earnest money"><MoneyInput value={earnest} onChange={setEarnest} /></Field>
                  <Field label="Inspection costs"><MoneyInput value={inspection} onChange={setInspection} /></Field>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Property information</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Property type">
                    <Select value={propType} onValueChange={setPropType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Single family","Multi family","Condo","Townhouse","Land","Commercial","Mobile"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Bedrooms"><NumberInput value={beds} onChange={setBeds} /></Field>
                  <Field label="Bathrooms"><NumberInput value={baths} onChange={setBaths} step={0.5} /></Field>
                  <Field label="Square footage"><NumberInput value={sqft} onChange={setSqft} /></Field>
                  <Field label="Lot size (sqft)"><NumberInput value={lotSize} onChange={setLotSize} /></Field>
                  <Field label="Year built"><NumberInput value={yearBuilt} onChange={setYearBuilt} /></Field>
                  <Field label="Current condition">
                    <Select value={condition} onValueChange={setCondition}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Excellent","Good","Fair","Poor","Tear down"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Occupancy">
                    <Select value={occupancy} onValueChange={setOccupancy}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{["Vacant","Owner occupied","Tenant occupied","Squatter"].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ARV */}
            <TabsContent value="arv" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">After-repair value</CardTitle>
                  <CardDescription>Estimate resale value based on comparable sales.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  <Field label="Estimated ARV"><MoneyInput value={arv} onChange={setArv} /></Field>
                  <Field label="Price per sqft"><NumberInput value={pricePerSqft} onChange={setPricePerSqft} /></Field>
                  <Field label="Comp low"><MoneyInput value={compLow} onChange={setCompLow} /></Field>
                  <Field label="Comp high"><MoneyInput value={compHigh} onChange={setCompHigh} /></Field>
                  <Field label={`Confidence: ${arvConfidence}/10`}>
                    <Slider value={[arvConfidence]} onValueChange={(v) => setArvConfidence(v[0])} min={1} max={10} step={1} />
                  </Field>
                  <Field label="User override">
                    <div className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={arvOverride} onChange={(e) => setArvOverride(e.target.checked)} />
                      <span className="text-muted-foreground">Ignore auto ARV suggestions</span>
                    </div>
                  </Field>
                </CardContent>
              </Card>
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Comp range midpoint: <strong>{fmtMoney((compLow + compHigh) / 2)}</strong>. Your ARV sits{" "}
                  {arv > (compLow + compHigh) / 2 ? "above" : "below"} the midpoint.
                </AlertDescription>
              </Alert>
            </TabsContent>

            {/* REHAB */}
            <TabsContent value="rehab" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Rehab estimate</CardTitle>
                  <CardDescription>Apply a preset or build a line-item budget.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(REHAB_PRESETS).map(([k, v]) => (
                      <Button key={k} size="sm" variant={rehabPreset === k ? "default" : "outline"} onClick={() => applyRehabPreset(k as any)}>
                        {v.label} · ${v.perSqft}/sf
                      </Button>
                    ))}
                    <Button size="sm" variant="ghost" onClick={() => { setRehabRows(emptyRehabRows()); setRehabPreset("custom"); }}>Reset</Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={`Local cost adjustment: ${localCostMultiplier.toFixed(2)}×`}>
                      <Slider value={[localCostMultiplier * 100]} onValueChange={(v) => setLocalCostMultiplier(v[0] / 100)} min={70} max={150} step={5} />
                    </Field>
                    <Field label="Rehab subtotal">
                      <div className="rounded-md border bg-muted/40 px-3 py-2 text-lg font-semibold tabular-nums">{fmtMoney(rehabTotal)}</div>
                    </Field>
                  </div>
                  <div className="max-h-[420px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="w-[80px]">Qty</TableHead>
                          <TableHead className="w-[110px]">Unit cost</TableHead>
                          <TableHead className="w-[110px]">Labor</TableHead>
                          <TableHead className="w-[110px]">Material</TableHead>
                          <TableHead className="w-[110px] text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rehabRows.map((r, i) => {
                          const total = r.qty * r.unitCost + r.labor + r.material;
                          return (
                            <TableRow key={r.category}>
                              <TableCell className="font-medium">{r.category}</TableCell>
                              <TableCell><Input type="number" value={r.qty || ""} onChange={(e) => updateRehab(i, { qty: num(e.target.value) })} className="h-8" /></TableCell>
                              <TableCell><Input type="number" value={r.unitCost || ""} onChange={(e) => updateRehab(i, { unitCost: num(e.target.value) })} className="h-8" /></TableCell>
                              <TableCell><Input type="number" value={r.labor || ""} onChange={(e) => updateRehab(i, { labor: num(e.target.value) })} className="h-8" /></TableCell>
                              <TableCell><Input type="number" value={r.material || ""} onChange={(e) => updateRehab(i, { material: num(e.target.value) })} className="h-8" /></TableCell>
                              <TableCell className="text-right tabular-nums">{fmtMoney(total)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* STRATEGY */}
            <TabsContent value="strategy" className="space-y-4">
              <Tabs defaultValue="flip">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="flip">Fix & Flip</TabsTrigger>
                  <TabsTrigger value="rental">Rental</TabsTrigger>
                  <TabsTrigger value="brrrr">BRRRR</TabsTrigger>
                  <TabsTrigger value="wholesale">Wholesale</TabsTrigger>
                </TabsList>

                <TabsContent value="flip" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Flip assumptions</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Field label="Holding period (months)"><NumberInput value={holdingMonths} onChange={setHoldingMonths} /></Field>
                      <Field label="Monthly holding cost"><MoneyInput value={monthlyHolding} onChange={setMonthlyHolding} /></Field>
                      <Field label="Sell closing (%)"><NumberInput value={closingSellPct} onChange={setClosingSellPct} step={0.1} /></Field>
                      <Field label="Selling costs (%)"><NumberInput value={sellingCostsPct} onChange={setSellingCostsPct} step={0.1} /></Field>
                      <Field label="Desired profit"><MoneyInput value={desiredProfit} onChange={setDesiredProfit} /></Field>
                    </CardContent>
                  </Card>
                  <ResultGrid rows={[
                    ["Total investment", fmtMoney(flip.totalCost)],
                    ["Rehab", fmtMoney(rehabTotal)],
                    ["Holding cost", fmtMoney(flip.holding)],
                    ["Financing cost", fmtMoney(financingCost)],
                    ["Selling cost", fmtMoney(flip.sellClosing + flip.commissions)],
                    ["Net profit", fmtMoney(flip.netProfit), flip.netProfit > 0],
                    ["ROI", fmtPct(flip.roi), flip.roi > 0.15],
                    ["Profit margin", fmtPct(flip.margin), flip.margin > 0.15],
                    ["70% MAO", fmtMoney(flip.mao)],
                    ["Break-even sale price", fmtMoney(flip.totalCost)],
                  ]} />
                </TabsContent>

                <TabsContent value="rental" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Rental assumptions</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Field label="Monthly rent"><MoneyInput value={monthlyRent} onChange={setMonthlyRent} /></Field>
                      <Field label="Down payment (%)"><NumberInput value={downPct} onChange={setDownPct} /></Field>
                      <Field label="Interest rate (%)"><NumberInput value={ratePct} onChange={setRatePct} step={0.05} /></Field>
                      <Field label="Loan term (years)"><NumberInput value={loanYears} onChange={setLoanYears} /></Field>
                      <Field label="Vacancy (%)"><NumberInput value={vacancyPct} onChange={setVacancyPct} /></Field>
                      <Field label="Taxes (annual)"><MoneyInput value={taxesAnnual} onChange={setTaxesAnnual} /></Field>
                      <Field label="Insurance (annual)"><MoneyInput value={insuranceAnnual} onChange={setInsuranceAnnual} /></Field>
                      <Field label="Maintenance (%)"><NumberInput value={maintenancePct} onChange={setMaintenancePct} /></Field>
                      <Field label="Management (%)"><NumberInput value={mgmtPct} onChange={setMgmtPct} /></Field>
                      <Field label="CapEx reserve (%)"><NumberInput value={capexPct} onChange={setCapexPct} /></Field>
                    </CardContent>
                  </Card>
                  <ResultGrid rows={[
                    ["Monthly rent", fmtMoney(monthlyRent)],
                    ["Vacancy", `-${fmtMoney(rental.vacancy)}`],
                    ["Operating expenses", `-${fmtMoney(rental.opex)}`],
                    ["Mortgage", `-${fmtMoney(rental.mortgage)}`],
                    ["Net monthly cash flow", fmtMoney(rental.cashFlow), rental.cashFlow > 0],
                    ["Annual cash flow", fmtMoney(rental.annualCashFlow), rental.annualCashFlow > 0],
                    ["Cap rate", fmtPct(rental.capRate), rental.capRate > 0.06],
                    ["Cash-on-cash return", fmtPct(rental.cashOnCash), rental.cashOnCash > 0.08],
                    ["DSCR", rental.dscr.toFixed(2), rental.dscr > 1.2],
                  ]} />
                </TabsContent>

                <TabsContent value="brrrr" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">BRRRR assumptions</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Field label="Refinance LTV (%)"><NumberInput value={refiLtvPct} onChange={setRefiLtvPct} /></Field>
                      <Field label="Refinance rate (%)"><NumberInput value={refiRatePct} onChange={setRefiRatePct} step={0.05} /></Field>
                    </CardContent>
                  </Card>
                  <ResultGrid rows={[
                    ["Purchase price", fmtMoney(purchasePrice)],
                    ["Rehab", fmtMoney(rehabTotal)],
                    ["Total basis", fmtMoney(brrrr.totalBasis)],
                    ["New appraised value (ARV)", fmtMoney(arv)],
                    ["Refinance loan", fmtMoney(brrrr.refiLoan)],
                    ["Cash left in deal", fmtMoney(brrrr.cashLeft), brrrr.cashLeft < 15000],
                    ["Monthly cash flow", fmtMoney(brrrr.monthlyCashFlow), brrrr.monthlyCashFlow > 0],
                    ["Cash-on-cash return", fmtPct(brrrr.cashOnCash), brrrr.cashOnCash > 0.15],
                  ]} />
                </TabsContent>

                <TabsContent value="wholesale" className="space-y-3">
                  <Card>
                    <CardHeader className="pb-3"><CardTitle className="text-base">Wholesale assumptions</CardTitle></CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                      <Field label="Seller contract price"><MoneyInput value={purchasePrice} onChange={setPurchasePrice} /></Field>
                      <Field label="Buyer price"><MoneyInput value={buyerPrice} onChange={setBuyerPrice} /></Field>
                      <Field label="Marketing costs"><MoneyInput value={marketing} onChange={setMarketing} /></Field>
                    </CardContent>
                  </Card>
                  <ResultGrid rows={[
                    ["Assignment fee", fmtMoney(wholesale.assignment), wholesale.assignment > 0],
                    ["Marketing", `-${fmtMoney(marketing)}`],
                    ["Estimated net assignment profit", fmtMoney(wholesale.net), wholesale.net > 0],
                  ]} />
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>

          {/* Deal signals */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Deal signals</CardTitle>
              <CardDescription>Feed the scoring model with market and seller context.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label={`Days on market: ${daysOnMarket}`}><Slider value={[daysOnMarket]} onValueChange={(v) => setDaysOnMarket(v[0])} min={0} max={180} step={1} /></Field>
              <Field label={`Seller motivation: ${sellerMotivation}/10`}><Slider value={[sellerMotivation]} onValueChange={(v) => setSellerMotivation(v[0])} min={1} max={10} step={1} /></Field>
              <Field label={`Comp confidence: ${compConfidence}/10`}><Slider value={[compConfidence]} onValueChange={(v) => setCompConfidence(v[0])} min={1} max={10} step={1} /></Field>
              <Field label={`Neighborhood risk: ${neighborhoodRisk}/10`}><Slider value={[neighborhoodRisk]} onValueChange={(v) => setNeighborhoodRisk(v[0])} min={1} max={10} step={1} /></Field>
              <Field label={`Financing risk: ${financingRisk}/10`}><Slider value={[financingRisk]} onValueChange={(v) => setFinancingRisk(v[0])} min={1} max={10} step={1} /></Field>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: score + offers */}
        <div className="space-y-4 lg:sticky lg:top-4 lg:h-fit">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Preliminary Deal Score</CardTitle>
                <Badge variant="secondary">Rule-based</Badge>
              </div>
              <CardDescription>Connect an AI provider for enhanced scoring.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-6xl font-bold font-display tabular-nums">{score.overall}</div>
                <div className="mt-1 text-sm text-muted-foreground">out of 100 · <span className="font-medium text-foreground">{band.label}</span></div>
                <Progress value={score.overall} className="mt-3" />
              </div>
              <Separator />
              <SubScore label="Profit potential" value={score.profitScore} />
              <SubScore label="Rental performance" value={score.rentalScore} />
              <SubScore label="Rehab risk" value={score.rehabRiskScore} />
              <SubScore label="Market confidence" value={score.marketConfidenceScore} />
              <SubScore label="Seller motivation" value={score.sellerMotivationScore} />
            </CardContent>
          </Card>

          {aiMemo && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">AI underwriting memo</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">{aiMemo}</CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Offer recommendation</CardTitle>
              <CardDescription>MAO = ARV × % − rehab − profit − other costs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <OfferRow label="Conservative (65%)" value={offerConservative} />
              <OfferRow label="Target (70%)" value={offerTarget} highlight />
              <OfferRow label="Maximum (75%)" value={offerMax} />
              <p className="pt-2 text-xs text-muted-foreground">Not financial advice. Verify comps, rehab, and closing costs locally.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">AI explanation</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {explanation.reasons.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Why it scored well</div>
                  <ul className="space-y-1 pl-4 list-disc text-muted-foreground">{explanation.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              {explanation.risks.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Main risks</div>
                  <ul className="space-y-1 pl-4 list-disc text-muted-foreground">{explanation.risks.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              {explanation.missing.length > 0 && (
                <div>
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Info className="h-3.5 w-3.5" /> Missing information</div>
                  <ul className="space-y-1 pl-4 list-disc text-muted-foreground">{explanation.missing.map((r, i) => <li key={i}>{r}</li>)}</ul>
                </div>
              )}
              <Separator />
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Recommended next action</div>
                <p className="text-muted-foreground">
                  {score.overall >= 65 ? "Draft an offer near the target MAO and schedule an inspection." :
                    score.overall >= 45 ? "Negotiate on price and re-verify rehab before submitting an offer." :
                      "Pass unless the seller drops the price or scope of rehab shrinks."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">At a glance</CardTitle></CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <RowKv k="All-in cost" v={fmtMoney(totalCashIn)} />
              <RowKv k="ARV" v={fmtMoney(arv)} />
              <RowKv k="Equity spread" v={fmtMoney(arv - totalCashIn)} good={arv - totalCashIn > 0} />
              <RowKv k="Flip net profit" v={fmtMoney(flip.netProfit)} good={flip.netProfit > 0} />
              <RowKv k="Monthly cash flow" v={fmtMoney(rental.cashFlow)} good={rental.cashFlow > 0} />
            </CardContent>
          </Card>

          <Button className="w-full" onClick={exportReport}>
            <FileDown className="mr-2 h-4 w-4" /> Generate deal report
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------- Small helpers ----------
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function MoneyInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input type="number" value={value || ""} onChange={(e) => onChange(num(e.target.value))} className="pl-6 tabular-nums" />
    </div>
  );
}

function NumberInput({ value, onChange, step = 1 }: { value: number; onChange: (n: number) => void; step?: number }) {
  return <Input type="number" step={step} value={value || ""} onChange={(e) => onChange(num(e.target.value))} className="tabular-nums" />;
}

function ResultGrid({ rows }: { rows: (readonly [string, string] | readonly [string, string, boolean])[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {rows.map(([k, v, good], i) => (
              <TableRow key={i}>
                <TableCell className="text-muted-foreground">{k}</TableCell>
                <TableCell className={`text-right tabular-nums font-medium ${good === true ? "text-emerald-600 dark:text-emerald-400" : good === false ? "text-destructive" : ""}`}>{v}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SubScore({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums font-medium">{value}</span>
      </div>
      <Progress value={value} className="mt-1 h-1.5" />
    </div>
  );
}

function OfferRow({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 ${highlight ? "border-primary bg-primary/5" : ""}`}>
      <span className="text-sm">{label}</span>
      <span className="tabular-nums font-semibold">{fmtMoney(Math.max(0, value))}</span>
    </div>
  );
}

function RowKv({ k, v, good }: { k: string; v: string; good?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{k}</span>
      <span className={`tabular-nums font-medium ${good === true ? "text-emerald-600 dark:text-emerald-400" : good === false ? "text-destructive" : ""}`}>{v}</span>
    </div>
  );
}
