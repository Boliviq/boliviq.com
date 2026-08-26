/** Funding match + buyer match scoring (transparent, versioned). */

export type LenderCriteria = {
  id: string;
  name: string;
  lender_types: string[];
  states_served: string[];
  min_loan?: number | null;
  max_loan?: number | null;
  max_ltv?: number | null;
  max_ltc?: number | null;
  max_arv_pct?: number | null;
  min_credit?: number | null;
  min_experience_deals?: number | null;
  rate_note?: string | null;
  points_note?: string | null;
  close_days_note?: string | null;
};

export type CapitalPackage = {
  state?: string;
  purchase_price: number;
  rehab: number;
  arv: number;
  loan_request: number;
  exit_strategy?: string;
  borrower_credit?: number | null;
  experience_deals?: number | null;
};

export function scoreFundingMatch(pkg: CapitalPackage, lender: LenderCriteria) {
  const reasons: string[] = [];
  let score = 50;
  if (lender.states_served?.length && pkg.state) {
    if (lender.states_served.includes(pkg.state) || lender.states_served.includes("US")) {
      score += 15;
      reasons.push("Serves property state");
    } else {
      return { match_score: 0, reasons: ["Does not serve property state"] };
    }
  }
  const loan = pkg.loan_request;
  if (lender.min_loan != null && loan < lender.min_loan) {
    return { match_score: 0, reasons: ["Below minimum loan"] };
  }
  if (lender.max_loan != null && loan > lender.max_loan) {
    return { match_score: 0, reasons: ["Above maximum loan"] };
  }
  if (lender.min_loan != null || lender.max_loan != null) {
    score += 10;
    reasons.push("Loan size in range");
  }
  const ltc = pkg.purchase_price + pkg.rehab > 0 ? loan / (pkg.purchase_price + pkg.rehab) : 1;
  if (lender.max_ltc != null) {
    if (ltc <= lender.max_ltc) {
      score += 12;
      reasons.push(`LTC ${(ltc * 100).toFixed(0)}% ≤ ${(lender.max_ltc * 100).toFixed(0)}%`);
    } else {
      score -= 20;
      reasons.push(`LTC ${(ltc * 100).toFixed(0)}% exceeds lender max`);
    }
  }
  const arvPct = pkg.arv > 0 ? loan / pkg.arv : 1;
  if (lender.max_arv_pct != null) {
    if (arvPct <= lender.max_arv_pct) {
      score += 12;
      reasons.push(`Loan/ARV ${(arvPct * 100).toFixed(0)}% within limit`);
    } else {
      score -= 20;
      reasons.push("Loan exceeds max ARV %");
    }
  }
  if (lender.min_credit != null && pkg.borrower_credit != null) {
    if (pkg.borrower_credit >= lender.min_credit) {
      score += 8;
      reasons.push("Credit meets minimum");
    } else {
      score -= 15;
      reasons.push("Credit below minimum");
    }
  }
  if (lender.min_experience_deals != null && pkg.experience_deals != null) {
    if (pkg.experience_deals >= lender.min_experience_deals) {
      score += 8;
      reasons.push("Experience meets minimum");
    } else {
      score -= 10;
      reasons.push("Experience below minimum");
    }
  }
  return { match_score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export type BuyerProfileLike = {
  id: string;
  display_name: string;
  markets: string[];
  asset_types: string[];
  price_min?: number | null;
  price_max?: number | null;
  arv_min?: number | null;
  rehab_max?: number | null;
  strategies?: string[];
  purchase_count?: number;
  last_purchase_at?: string | null;
};

export function scoreBuyerMatch(
  property: {
    state_code?: string | null;
    city?: string | null;
    property_type?: string | null;
    opening_bid?: number | null;
    estimated_value?: number | null;
    estimated_arv?: number | null;
    estimated_rehab?: number | null;
  },
  buyer: BuyerProfileLike,
) {
  const reasons: string[] = [];
  let score = 40;
  const price = property.opening_bid ?? property.estimated_value ?? 0;
  if (buyer.markets?.length) {
    const marketHit = buyer.markets.some(
      (m) =>
        m.toLowerCase().includes((property.city ?? "").toLowerCase()) ||
        m.toUpperCase() === property.state_code ||
        (m.toLowerCase().includes("nashville") &&
          ["Franklin", "Columbia", "Hohenwald", "Nashville"].includes(property.city ?? "")),
    );
    if (marketHit) {
      score += 20;
      reasons.push("Active in market");
    } else {
      score -= 10;
      reasons.push("Outside typical markets");
    }
  }
  if (buyer.price_min != null && price < buyer.price_min) score -= 15;
  if (buyer.price_max != null && price > buyer.price_max) score -= 15;
  if (buyer.price_min != null || buyer.price_max != null) {
    if (
      (buyer.price_min == null || price >= buyer.price_min) &&
      (buyer.price_max == null || price <= buyer.price_max)
    ) {
      score += 15;
      reasons.push("Price in buy box");
    }
  }
  if (buyer.arv_min != null && (property.estimated_arv ?? 0) >= buyer.arv_min) {
    score += 10;
    reasons.push("ARV meets buyer minimum");
  }
  if (buyer.rehab_max != null && (property.estimated_rehab ?? 0) <= buyer.rehab_max) {
    score += 10;
    reasons.push("Rehab within buyer tolerance");
  }
  if (buyer.purchase_count && buyer.purchase_count >= 5) {
    score += 8;
    reasons.push(`Bought ${buyer.purchase_count} similar deals`);
  }
  if (buyer.last_purchase_at) {
    const days = Math.ceil((Date.now() - new Date(buyer.last_purchase_at).getTime()) / 86400000);
    if (days <= 90) {
      score += 7;
      reasons.push(`Last purchase ${days} days ago`);
    }
  }
  return { match_score: Math.max(0, Math.min(100, Math.round(score))), reasons };
}

export const DEMO_LENDERS: LenderCriteria[] = [
  {
    id: "lender-demo-1",
    name: "Cumberland Hard Money (DEMO)",
    lender_types: ["hard_money", "bridge"],
    states_served: ["TN", "KY", "AL"],
    min_loan: 75000,
    max_loan: 1500000,
    max_ltv: 0.75,
    max_ltc: 0.9,
    max_arv_pct: 0.7,
    min_credit: 620,
    min_experience_deals: 0,
    rate_note: "Provider-supplied estimate — not a guarantee",
    points_note: "2–3 pts typical (DEMO)",
    close_days_note: "7–14 days (DEMO)",
  },
  {
    id: "lender-demo-2",
    name: "Music City DSCR Desk (DEMO)",
    lender_types: ["dscr", "portfolio"],
    states_served: ["TN", "FL", "TX", "GA"],
    min_loan: 100000,
    max_loan: 3000000,
    max_ltv: 0.8,
    max_ltc: 0.85,
    max_arv_pct: 0.75,
    min_credit: 660,
    min_experience_deals: 2,
    rate_note: "Rate sheet on request (DEMO)",
    points_note: "1–2 pts (DEMO)",
    close_days_note: "21–30 days (DEMO)",
  },
  {
    id: "lender-demo-3",
    name: "Construction Bridge Partners (DEMO)",
    lender_types: ["construction", "bridge"],
    states_served: ["US"],
    min_loan: 150000,
    max_loan: 5000000,
    max_ltv: 0.7,
    max_ltc: 0.9,
    max_arv_pct: 0.7,
    min_credit: 640,
    min_experience_deals: 1,
    rate_note: "Varies by draw schedule (DEMO)",
    points_note: "2 pts + inspection fees (DEMO)",
    close_days_note: "10–20 days (DEMO)",
  },
];

export const DEMO_BUYERS: BuyerProfileLike[] = [
  {
    id: "buyer-demo-1",
    display_name: "Nashville Flip Collective (DEMO)",
    markets: ["Nashville", "Franklin", "TN"],
    asset_types: ["residential", "sfr"],
    price_min: 100000,
    price_max: 350000,
    arv_min: 250000,
    rehab_max: 100000,
    strategies: ["fix_and_flip", "wholesale"],
    purchase_count: 9,
    last_purchase_at: "2026-07-14",
  },
  {
    id: "buyer-demo-2",
    display_name: "Mid-TN Rentals LLC (DEMO)",
    markets: ["Columbia", "Hohenwald", "TN"],
    asset_types: ["residential"],
    price_min: 50000,
    price_max: 250000,
    arv_min: 120000,
    rehab_max: 80000,
    strategies: ["brrrr", "long_term_rental"],
    purchase_count: 14,
    last_purchase_at: "2026-06-02",
  },
  {
    id: "buyer-demo-3",
    display_name: "Absentee Acquisition Fund (DEMO)",
    markets: ["TN", "FL"],
    asset_types: ["residential", "multifamily"],
    price_min: 80000,
    price_max: 500000,
    arv_min: 200000,
    rehab_max: 150000,
    strategies: ["fix_and_flip", "brrrr"],
    purchase_count: 22,
    last_purchase_at: "2026-08-01",
  },
];
