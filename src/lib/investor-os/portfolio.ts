/** Portfolio metrics from owned assets — estimates clearly labeled. */

export type PortfolioAssetInput = {
  purchase_price?: number | null;
  rehab_cost?: number | null;
  capital_improvements?: number | null;
  loan_balance?: number | null;
  current_value_est?: number | null;
  rent_monthly?: number | null;
  vacancy_pct?: number | null;
  taxes_annual?: number | null;
  insurance_annual?: number | null;
  hoa_monthly?: number | null;
  maintenance_monthly?: number | null;
  other_expenses_monthly?: number | null;
  monthly_payment?: number | null;
  status?: string | null;
};

export function portfolioAssetMetrics(a: PortfolioAssetInput) {
  const value = a.current_value_est ?? a.purchase_price ?? 0;
  const debt = a.loan_balance ?? 0;
  const equity = Math.max(0, value - debt);
  const grossRent = a.rent_monthly ?? 0;
  const vacancy = grossRent * ((a.vacancy_pct ?? 5) / 100);
  const opex =
    (a.taxes_annual ?? 0) / 12 +
    (a.insurance_annual ?? 0) / 12 +
    (a.hoa_monthly ?? 0) +
    (a.maintenance_monthly ?? 0) +
    (a.other_expenses_monthly ?? 0);
  const noiMonthly = grossRent - vacancy - opex;
  const cashFlow = noiMonthly - (a.monthly_payment ?? 0);
  const basis = (a.purchase_price ?? 0) + (a.rehab_cost ?? 0) + (a.capital_improvements ?? 0);
  const noiAnnual = noiMonthly * 12;
  return {
    value,
    debt,
    equity,
    grossRent,
    noiMonthly,
    noiAnnual,
    cashFlow,
    capRate: value > 0 ? noiAnnual / value : 0,
    cashOnCash: basis > 0 ? (cashFlow * 12) / Math.max(basis - debt, 1) : 0,
  };
}

export function rollupPortfolio(assets: PortfolioAssetInput[]) {
  const rows = assets.map(portfolioAssetMetrics);
  return {
    propertyCount: assets.length,
    estimatedValue: rows.reduce((a, r) => a + r.value, 0),
    debt: rows.reduce((a, r) => a + r.debt, 0),
    equity: rows.reduce((a, r) => a + r.equity, 0),
    monthlyGrossIncome: rows.reduce((a, r) => a + r.grossRent, 0),
    monthlyNetCashFlow: rows.reduce((a, r) => a + r.cashFlow, 0),
    rehabs: assets.filter((a) => a.status === "rehab").length,
    vacant: assets.filter((a) => (a.rent_monthly ?? 0) <= 0 && a.status === "owned").length,
  };
}
