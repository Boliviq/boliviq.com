// Boliviq — investor calculations
// All results are estimates; not financial advice.

export const num = (v: unknown, d = 0) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : d;
};

export const fmtMoney = (v: number, digits = 0) =>
  isFinite(v)
    ? v.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: digits,
      })
    : "—";

export const fmtPct = (v: number, digits = 1) =>
  isFinite(v) ? `${(v * 100).toFixed(digits)}%` : "—";

// --- Mortgage ---
export function monthlyMortgage(principal: number, annualRatePct: number, years: number) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

// --- MAO / 70% rule ---
export function mao(arv: number, rehab: number, pct = 0.7, desiredProfit = 0, otherCosts = 0) {
  return arv * pct - rehab - desiredProfit - otherCosts;
}

// --- Cap rate ---
export function capRate(noiAnnual: number, price: number) {
  return price > 0 ? noiAnnual / price : 0;
}

// --- Cash on cash ---
export function cashOnCash(annualCashFlow: number, cashInvested: number) {
  return cashInvested > 0 ? annualCashFlow / cashInvested : 0;
}

// --- ROI ---
export function roi(netProfit: number, invested: number) {
  return invested > 0 ? netProfit / invested : 0;
}

// --- Flip analysis ---
export interface FlipInputs {
  purchasePrice: number;
  rehab: number;
  arv: number;
  closingBuyPct: number; // % of purchase
  closingSellPct: number; // % of ARV
  holdingMonths: number;
  monthlyHolding: number; // taxes+ins+utils+HOA
  financingCost: number;
  desiredProfit?: number;
  sellingCostsPct?: number; // agent commissions etc, of ARV
}
export function analyzeFlip(i: FlipInputs) {
  const buyClosing = i.purchasePrice * (i.closingBuyPct / 100);
  const sellClosing = i.arv * (i.closingSellPct / 100);
  const commissions = i.arv * ((i.sellingCostsPct ?? 6) / 100);
  const holding = i.monthlyHolding * i.holdingMonths;
  const totalCost =
    i.purchasePrice + i.rehab + buyClosing + sellClosing + commissions + holding + i.financingCost;
  const netProfit = i.arv - totalCost;
  const returnOnInvestment = roi(netProfit, totalCost);
  const margin = i.arv > 0 ? netProfit / i.arv : 0;
  const maoVal = mao(
    i.arv,
    i.rehab,
    0.7,
    i.desiredProfit ?? 0,
    buyClosing + holding + i.financingCost,
  );
  const breakEven = totalCost - i.purchasePrice; // resale price at breakeven
  return {
    buyClosing,
    sellClosing,
    commissions,
    holding,
    totalCost,
    netProfit,
    roi: returnOnInvestment,
    margin,
    mao: maoVal,
    breakEven: totalCost, // must sell at this or above to break even
  };
}

// --- Rental analysis ---
export interface RentalInputs {
  purchasePrice: number;
  rehab: number;
  downPct: number;
  ratePct: number;
  loanYears: number;
  monthlyRent: number;
  vacancyPct: number;
  taxesAnnual: number;
  insuranceAnnual: number;
  maintenancePct: number; // of rent
  mgmtPct: number; // of rent
  utilitiesMonthly: number;
  hoaMonthly: number;
  capexPct: number; // of rent
}
export function analyzeRental(i: RentalInputs) {
  const loan = i.purchasePrice * (1 - i.downPct / 100);
  const down = i.purchasePrice * (i.downPct / 100);
  const mtg = monthlyMortgage(loan, i.ratePct, i.loanYears);
  const grossRent = i.monthlyRent;
  const vacancy = grossRent * (i.vacancyPct / 100);
  const effRent = grossRent - vacancy;
  const opex =
    i.taxesAnnual / 12 +
    i.insuranceAnnual / 12 +
    grossRent * (i.maintenancePct / 100) +
    grossRent * (i.mgmtPct / 100) +
    grossRent * (i.capexPct / 100) +
    i.utilitiesMonthly +
    i.hoaMonthly;
  const noiMonthly = effRent - opex;
  const cashFlow = noiMonthly - mtg;
  const noiAnnual = noiMonthly * 12;
  const cashInvested = down + i.rehab;
  return {
    loan,
    down,
    mortgage: mtg,
    vacancy,
    opex,
    noiMonthly,
    noiAnnual,
    cashFlow,
    annualCashFlow: cashFlow * 12,
    capRate: capRate(noiAnnual, i.purchasePrice + i.rehab),
    cashOnCash: cashOnCash(cashFlow * 12, cashInvested),
    dscr: mtg > 0 ? noiMonthly / mtg : 0,
  };
}

// --- BRRRR ---
export interface BrrrrInputs {
  purchasePrice: number;
  rehab: number;
  closingCosts: number;
  arv: number;
  refiLtvPct: number;
  refiRatePct: number;
  refiYears: number;
  monthlyRent: number;
  monthlyOpex: number; // taxes+ins+mgmt+maint+vacancy
}
export function analyzeBrrrr(i: BrrrrInputs) {
  const totalBasis = i.purchasePrice + i.rehab + i.closingCosts;
  const refiLoan = i.arv * (i.refiLtvPct / 100);
  const cashLeft = totalBasis - refiLoan;
  const mtg = monthlyMortgage(refiLoan, i.refiRatePct, i.refiYears);
  const cashFlow = i.monthlyRent - i.monthlyOpex - mtg;
  return {
    totalBasis,
    refiLoan,
    cashLeft,
    mortgage: mtg,
    monthlyCashFlow: cashFlow,
    cashOnCash: cashOnCash(cashFlow * 12, Math.max(cashLeft, 1)),
  };
}

// --- Wholesale ---
export interface WholesaleInputs {
  sellerPrice: number;
  buyerPrice: number;
  marketing: number;
  otherCosts: number;
}
export function analyzeWholesale(i: WholesaleInputs) {
  const assignment = i.buyerPrice - i.sellerPrice;
  const net = assignment - i.marketing - i.otherCosts;
  return { assignment, net };
}

// --- Preliminary Deal Score (rule-based, transparent) ---
export interface ScoreInputs {
  arv: number;
  purchasePrice: number;
  rehab: number;
  flipNetProfit: number;
  flipRoi: number;
  monthlyCashFlow: number;
  capRate: number;
  daysOnMarket?: number;
  sellerMotivation?: number; // 1-10
  compConfidence?: number; // 1-10
  neighborhoodRisk?: number; // 1-10 (10=risky)
  financingRisk?: number; // 1-10 (10=risky)
}
export function dealScore(i: ScoreInputs) {
  // Sub-scores each 0-100
  const priceVsArv =
    i.arv > 0 ? clamp01(1 - (i.purchasePrice + i.rehab) / (i.arv * 0.85)) * 100 : 0;
  const profit = clamp01(i.flipNetProfit / 40000) * 100;
  const roiScore = clamp01(i.flipRoi / 0.25) * 100;
  const cashScore = clamp01(i.monthlyCashFlow / 400) * 100;
  const capScore = clamp01(i.capRate / 0.08) * 100;
  const rehabRisk = i.arv > 0 ? clamp01(1 - i.rehab / (i.arv * 0.3)) * 100 : 50;
  const seller = ((i.sellerMotivation ?? 5) / 10) * 100;
  const comp = ((i.compConfidence ?? 5) / 10) * 100;
  const nbhd = (1 - (i.neighborhoodRisk ?? 5) / 10) * 100;
  const fin = (1 - (i.financingRisk ?? 5) / 10) * 100;

  const overall = Math.round(
    priceVsArv * 0.2 +
      profit * 0.15 +
      roiScore * 0.1 +
      cashScore * 0.1 +
      capScore * 0.08 +
      rehabRisk * 0.1 +
      seller * 0.08 +
      comp * 0.09 +
      nbhd * 0.05 +
      fin * 0.05,
  );

  return {
    overall,
    profitScore: Math.round((profit + roiScore) / 2),
    rentalScore: Math.round((cashScore + capScore) / 2),
    rehabRiskScore: Math.round(rehabRisk),
    marketConfidenceScore: Math.round(comp),
    sellerMotivationScore: Math.round(seller),
  };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export function scoreBand(s: number) {
  if (s >= 80) return { label: "Excellent", tone: "success" as const };
  if (s >= 65) return { label: "Good", tone: "success" as const };
  if (s >= 50) return { label: "Fair", tone: "warning" as const };
  if (s >= 35) return { label: "Weak", tone: "warning" as const };
  return { label: "Pass", tone: "danger" as const };
}

// --- Rehab presets $/sqft ---
export const REHAB_PRESETS = {
  light: { label: "Light cosmetic", perSqft: 15 },
  moderate: { label: "Moderate renovation", perSqft: 35 },
  full: { label: "Full renovation", perSqft: 65 },
  major: { label: "Major structural", perSqft: 110 },
} as const;

export const REHAB_CATEGORIES = [
  "Roof",
  "HVAC",
  "Plumbing",
  "Electrical",
  "Foundation",
  "Windows",
  "Exterior",
  "Siding",
  "Paint",
  "Drywall",
  "Flooring",
  "Kitchen",
  "Bathrooms",
  "Appliances",
  "Landscaping",
  "Cleanup",
  "Permits",
  "Contingency",
  "Other",
] as const;
