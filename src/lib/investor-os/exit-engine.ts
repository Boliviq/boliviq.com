/** Exit Strategy Engine — reuses deal-calc; exposes editable assumptions. */

import { analyzeFlip, analyzeRental, analyzeBrrrr, analyzeWholesale, num } from "@/lib/deal-calc";

export type ExitAssumptions = {
  purchasePrice: number;
  rehab: number;
  arv: number;
  wholesaleBuyerPrice?: number;
  marketing?: number;
  closingBuyPct?: number;
  closingSellPct?: number;
  sellingCostsPct?: number;
  holdingMonths?: number;
  monthlyHolding?: number;
  financingCost?: number;
  downPct?: number;
  ratePct?: number;
  loanYears?: number;
  monthlyRent?: number;
  vacancyPct?: number;
  taxesAnnual?: number;
  insuranceAnnual?: number;
  maintenancePct?: number;
  mgmtPct?: number;
  strMonthlyRevenue?: number;
  strExpensePct?: number;
  ownerFinanceDownPct?: number;
  ownerFinanceRatePct?: number;
  ownerFinanceYears?: number;
};

export type ExitResult = {
  strategy: string;
  label: string;
  metrics: Record<string, number | string | null>;
  score: number;
  summary: string;
};

export function defaultAssumptionsFromProperty(p: {
  estimatedValue?: number | null;
  estimatedArv?: number | null;
  estimatedRehab?: number | null;
  openingBid?: number | null;
  loanBalance?: number | null;
  monthlyRentEst?: number | null;
}): ExitAssumptions {
  const purchase =
    num(p.openingBid) || Math.round(num(p.estimatedValue) * 0.7) || num(p.loanBalance) || 185000;
  const rehab = num(p.estimatedRehab) || 65000;
  const arv = num(p.estimatedArv) || num(p.estimatedValue) || purchase + rehab + 80000;
  return {
    purchasePrice: purchase,
    rehab,
    arv,
    wholesaleBuyerPrice: Math.round(purchase * 1.12),
    marketing: 1500,
    closingBuyPct: 2,
    closingSellPct: 2,
    sellingCostsPct: 6,
    holdingMonths: 6,
    monthlyHolding: 800,
    financingCost: 5000,
    downPct: 25,
    ratePct: 8.5,
    loanYears: 30,
    monthlyRent: num(p.monthlyRentEst) || Math.round(arv * 0.008),
    vacancyPct: 8,
    taxesAnnual: 2400,
    insuranceAnnual: 1400,
    maintenancePct: 8,
    mgmtPct: 8,
    strMonthlyRevenue: Math.round((num(p.monthlyRentEst) || arv * 0.008) * 2.2),
    strExpensePct: 35,
    ownerFinanceDownPct: 10,
    ownerFinanceRatePct: 7,
    ownerFinanceYears: 30,
  };
}

export function compareExitStrategies(a: ExitAssumptions): {
  assumptions: ExitAssumptions;
  results: ExitResult[];
  recommended: ExitResult;
} {
  const wholesale = analyzeWholesale({
    sellerPrice: a.purchasePrice,
    buyerPrice: a.wholesaleBuyerPrice ?? a.purchasePrice * 1.1,
    marketing: a.marketing ?? 1500,
    otherCosts: 500,
  });
  const flip = analyzeFlip({
    purchasePrice: a.purchasePrice,
    rehab: a.rehab,
    arv: a.arv,
    closingBuyPct: a.closingBuyPct ?? 2,
    closingSellPct: a.closingSellPct ?? 2,
    holdingMonths: a.holdingMonths ?? 6,
    monthlyHolding: a.monthlyHolding ?? 800,
    financingCost: a.financingCost ?? 5000,
    sellingCostsPct: a.sellingCostsPct ?? 6,
  });
  const brrrr = analyzeBrrrr({
    purchasePrice: a.purchasePrice,
    rehab: a.rehab,
    closingCosts: a.purchasePrice * ((a.closingBuyPct ?? 2) / 100),
    arv: a.arv,
    refiLtvPct: 75,
    refiRatePct: a.ratePct ?? 8.5,
    refiYears: a.loanYears ?? 30,
    monthlyRent: a.monthlyRent ?? 0,
    monthlyOpex:
      (a.taxesAnnual ?? 0) / 12 + (a.insuranceAnnual ?? 0) / 12 + (a.monthlyRent ?? 0) * 0.2,
  });
  const ltr = analyzeRental({
    purchasePrice: a.purchasePrice,
    rehab: a.rehab,
    downPct: a.downPct ?? 25,
    ratePct: a.ratePct ?? 8.5,
    loanYears: a.loanYears ?? 30,
    monthlyRent: a.monthlyRent ?? 0,
    vacancyPct: a.vacancyPct ?? 8,
    taxesAnnual: a.taxesAnnual ?? 2400,
    insuranceAnnual: a.insuranceAnnual ?? 1400,
    maintenancePct: a.maintenancePct ?? 8,
    mgmtPct: a.mgmtPct ?? 8,
    utilitiesMonthly: 0,
    hoaMonthly: 0,
    capexPct: 5,
  });

  const strRevenue = a.strMonthlyRevenue ?? 0;
  const strExpense = strRevenue * ((a.strExpensePct ?? 35) / 100);
  const strMortgage = ltr.mortgage;
  const strCashFlow = strRevenue - strExpense - strMortgage;

  const ofDown = a.purchasePrice * ((a.ownerFinanceDownPct ?? 10) / 100);
  const ofLoan = a.purchasePrice - ofDown;
  const ofRate = (a.ownerFinanceRatePct ?? 7) / 100 / 12;
  const ofN = (a.ownerFinanceYears ?? 30) * 12;
  const ofPmt = ofRate === 0 ? ofLoan / ofN : (ofLoan * ofRate) / (1 - Math.pow(1 + ofRate, -ofN));
  const ofCashFlow = (a.monthlyRent ?? 0) * 0.92 - ofPmt - (a.taxesAnnual ?? 0) / 12;

  const results: ExitResult[] = [
    {
      strategy: "wholesale",
      label: "Wholesale",
      metrics: {
        assignment: Math.round(wholesale.assignment),
        netProfit: Math.round(wholesale.net),
        requiredCash: Math.round((a.marketing ?? 1500) + 500),
        timelineMonths: 1,
      },
      score: Math.min(100, Math.round(wholesale.net / 300)),
      summary: `Estimated assignment fee $${Math.round(wholesale.net).toLocaleString()} after marketing.`,
    },
    {
      strategy: "fix_and_flip",
      label: "Fix & Flip",
      metrics: {
        netProfit: Math.round(flip.netProfit),
        roi: Math.round(flip.roi * 1000) / 10,
        totalCost: Math.round(flip.totalCost),
        mao: Math.round(flip.mao),
        timelineMonths: a.holdingMonths ?? 6,
      },
      score: Math.min(100, Math.round(flip.netProfit / 1000 + flip.roi * 80)),
      summary: `Projected flip profit $${Math.round(flip.netProfit).toLocaleString()} (estimate).`,
    },
    {
      strategy: "brrrr",
      label: "BRRRR",
      metrics: {
        cashLeft: Math.round(brrrr.cashLeft),
        monthlyCashFlow: Math.round(brrrr.monthlyCashFlow),
        cashOnCash: Math.round(brrrr.cashOnCash * 1000) / 10,
        refiLoan: Math.round(brrrr.refiLoan),
      },
      score: Math.min(
        100,
        Math.round(40 + brrrr.monthlyCashFlow / 20 + (brrrr.cashLeft < 40000 ? 20 : 0)),
      ),
      summary: `Cash remaining invested ≈ $${Math.round(brrrr.cashLeft).toLocaleString()}; monthly CF ≈ $${Math.round(brrrr.monthlyCashFlow)}.`,
    },
    {
      strategy: "long_term_rental",
      label: "Long-term rental",
      metrics: {
        monthlyCashFlow: Math.round(ltr.cashFlow),
        annualCashFlow: Math.round(ltr.annualCashFlow),
        capRate: Math.round(ltr.capRate * 1000) / 10,
        cashOnCash: Math.round(ltr.cashOnCash * 1000) / 10,
      },
      score: Math.min(100, Math.round(30 + ltr.cashFlow / 15 + ltr.capRate * 400)),
      summary: `LTR monthly cash flow ≈ $${Math.round(ltr.cashFlow).toLocaleString()}.`,
    },
    {
      strategy: "short_term_rental",
      label: "Short-term rental",
      metrics: {
        monthlyRevenue: Math.round(strRevenue),
        monthlyCashFlow: Math.round(strCashFlow),
        expensePct: a.strExpensePct ?? 35,
      },
      score: Math.min(100, Math.round(25 + strCashFlow / 40)),
      summary: `STR projected monthly CF ≈ $${Math.round(strCashFlow).toLocaleString()} (highly assumption-sensitive).`,
    },
    {
      strategy: "owner_finance",
      label: "Owner financing hold",
      metrics: {
        downPayment: Math.round(ofDown),
        monthlyPayment: Math.round(ofPmt),
        monthlyCashFlow: Math.round(ofCashFlow),
      },
      score: Math.min(100, Math.round(35 + ofCashFlow / 20)),
      summary: `Owner-finance structure CF ≈ $${Math.round(ofCashFlow).toLocaleString()} after down payment.`,
    },
    {
      strategy: "hold_appreciate",
      label: "Hold & appreciate",
      metrics: {
        equityAtPurchase: Math.round(a.arv - a.purchasePrice - a.rehab),
        fiveYearValueEst: Math.round(a.arv * Math.pow(1.03, 5)),
      },
      score: Math.min(100, Math.round(20 + (a.arv - a.purchasePrice - a.rehab) / 5000)),
      summary: "Long-term appreciation path; returns depend on market growth assumptions.",
    },
  ];

  const recommended = [...results].sort((x, y) => y.score - x.score)[0];
  recommended.summary +=
    " Recommended based on current editable assumptions (risk-adjusted heuristic).";

  return { assumptions: a, results, recommended };
}
