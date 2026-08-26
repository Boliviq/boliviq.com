/** Configurable Investor OS entitlements — do not hard-code limits in UI components. */

export type InvestorOsEntitlements = {
  planTier: string;
  distressed_search: boolean;
  opportunity_radar: boolean;
  ai_acquisition_agent: boolean;
  funding_marketplace: boolean;
  construction_ai: boolean;
  owner_outreach: boolean;
  portfolio: boolean;
  buyer_matching: boolean;
  zoning_intelligence: boolean;
  advanced_risk_analysis: boolean;
  transaction_center: boolean;
  exit_engine: boolean;
};

export const DEFAULT_OS_ENTITLEMENTS: Record<string, InvestorOsEntitlements> = {
  free: {
    planTier: "free",
    distressed_search: true,
    opportunity_radar: false,
    ai_acquisition_agent: false,
    funding_marketplace: false,
    construction_ai: false,
    owner_outreach: false,
    portfolio: true,
    buyer_matching: false,
    zoning_intelligence: false,
    advanced_risk_analysis: false,
    transaction_center: false,
    exit_engine: true,
  },
  beginner: {
    planTier: "beginner",
    distressed_search: true,
    opportunity_radar: true,
    ai_acquisition_agent: false,
    funding_marketplace: true,
    construction_ai: false,
    owner_outreach: true,
    portfolio: true,
    buyer_matching: false,
    zoning_intelligence: true,
    advanced_risk_analysis: false,
    transaction_center: true,
    exit_engine: true,
  },
  professional: {
    planTier: "professional",
    distressed_search: true,
    opportunity_radar: true,
    ai_acquisition_agent: true,
    funding_marketplace: true,
    construction_ai: true,
    owner_outreach: true,
    portfolio: true,
    buyer_matching: true,
    zoning_intelligence: true,
    advanced_risk_analysis: true,
    transaction_center: true,
    exit_engine: true,
  },
  professional_ai_max: {
    planTier: "professional_ai_max",
    distressed_search: true,
    opportunity_radar: true,
    ai_acquisition_agent: true,
    funding_marketplace: true,
    construction_ai: true,
    owner_outreach: true,
    portfolio: true,
    buyer_matching: true,
    zoning_intelligence: true,
    advanced_risk_analysis: true,
    transaction_center: true,
    exit_engine: true,
  },
  team: {
    planTier: "team",
    distressed_search: true,
    opportunity_radar: true,
    ai_acquisition_agent: true,
    funding_marketplace: true,
    construction_ai: true,
    owner_outreach: true,
    portfolio: true,
    buyer_matching: true,
    zoning_intelligence: true,
    advanced_risk_analysis: true,
    transaction_center: true,
    exit_engine: true,
  },
  team_ai_max: {
    planTier: "team_ai_max",
    distressed_search: true,
    opportunity_radar: true,
    ai_acquisition_agent: true,
    funding_marketplace: true,
    construction_ai: true,
    owner_outreach: true,
    portfolio: true,
    buyer_matching: true,
    zoning_intelligence: true,
    advanced_risk_analysis: true,
    transaction_center: true,
    exit_engine: true,
  },
};

export function osEntitlementsForPlan(plan: string | null | undefined): InvestorOsEntitlements {
  const key = (plan ?? "free").toLowerCase();
  return DEFAULT_OS_ENTITLEMENTS[key] ?? DEFAULT_OS_ENTITLEMENTS.free;
}

export const OS_DISCLAIMERS = {
  risk: "Boliviq risk analysis is informational and does not replace professional title, legal, inspection, survey or due diligence.",
  zoning:
    "Zoning and permit information may be incomplete or delayed. Boliviq never states that a lot can be subdivided unless an authoritative source supports that exact conclusion.",
  funding:
    "Boliviq matches deals with participating lenders and is not itself the lender unless separately disclosed. Rates and points are provider-supplied estimates, not guarantees.",
  outreach:
    "Outreach must comply with TCPA, DNC, SMS/email consent, calling-hour, and state rules. Opt-outs are enforced centrally.",
  estimates:
    "Estimates are Boliviq calculations. Verified records come from source systems. AI inferences are labeled separately.",
};
