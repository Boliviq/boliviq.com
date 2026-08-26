/** Normalized distress taxonomy for the Boliviq National Distressed Property Engine. */

export const DISTRESS_CATEGORIES = ["foreclosure", "tax", "code", "vacancy", "government"] as const;

export type DistressCategory = (typeof DISTRESS_CATEGORIES)[number];

export const DISTRESS_SUBTYPES = {
  foreclosure: [
    "notice_of_default",
    "lis_pendens",
    "foreclosure_filed",
    "trustee_sale",
    "sheriff_sale",
    "auction_scheduled",
    "auction_postponed",
    "auction_cancelled",
    "foreclosure_completed",
    "reo",
  ],
  tax: [
    "tax_delinquent",
    "tax_lien",
    "tax_lien_sale",
    "tax_deed_sale",
    "tax_foreclosure",
    "redemption_period",
  ],
  code: [
    "code_violation",
    "unsafe_structure",
    "dangerous_building",
    "condemned",
    "uninhabitable",
    "nuisance",
    "demolition_order",
    "boarded_property",
    "abandoned_property",
  ],
  vacancy: ["vacant", "zombie_foreclosure", "absentee_owner", "utility_disconnect"],
  government: [
    "land_bank",
    "municipal_inventory",
    "county_inventory",
    "surplus_property",
    "hud_reo",
    "usda_reo",
    "va_reo",
    "fannie_mae_reo",
    "freddie_mac_reo",
  ],
} as const;

export type DistressSubtype = (typeof DISTRESS_SUBTYPES)[DistressCategory][number];

export const ALL_DISTRESS_SUBTYPES = Object.values(DISTRESS_SUBTYPES).flat() as DistressSubtype[];

export const SUBTYPE_TO_CATEGORY: Record<DistressSubtype, DistressCategory> = (() => {
  const map = {} as Record<DistressSubtype, DistressCategory>;
  for (const category of DISTRESS_CATEGORIES) {
    for (const subtype of DISTRESS_SUBTYPES[category]) {
      map[subtype] = category;
    }
  }
  return map;
})();

export const SUBTYPE_LABELS: Record<DistressSubtype, string> = {
  notice_of_default: "Notice of Default",
  lis_pendens: "Lis Pendens",
  foreclosure_filed: "Foreclosure Filed",
  trustee_sale: "Trustee Sale",
  sheriff_sale: "Sheriff Sale",
  auction_scheduled: "Auction Scheduled",
  auction_postponed: "Auction Postponed",
  auction_cancelled: "Auction Cancelled",
  foreclosure_completed: "Foreclosure Completed",
  reo: "REO / Bank-Owned",
  tax_delinquent: "Tax Delinquent",
  tax_lien: "Tax Lien",
  tax_lien_sale: "Tax Lien Sale",
  tax_deed_sale: "Tax Deed Sale",
  tax_foreclosure: "Tax Foreclosure",
  redemption_period: "Redemption Period",
  code_violation: "Code Violation",
  unsafe_structure: "Unsafe Structure",
  dangerous_building: "Dangerous Building",
  condemned: "Condemned",
  uninhabitable: "Uninhabitable",
  nuisance: "Nuisance",
  demolition_order: "Demolition Order",
  boarded_property: "Boarded Property",
  abandoned_property: "Abandoned Property",
  vacant: "Vacant",
  zombie_foreclosure: "Zombie Foreclosure",
  absentee_owner: "Absentee Owner",
  utility_disconnect: "Utility Disconnect",
  land_bank: "Land Bank",
  municipal_inventory: "Municipal Inventory",
  county_inventory: "County Inventory",
  surplus_property: "Surplus Property",
  hud_reo: "HUD REO",
  usda_reo: "USDA REO",
  va_reo: "VA REO",
  fannie_mae_reo: "Fannie Mae HomePath",
  freddie_mac_reo: "Freddie Mac HomeSteps",
};

export const SOURCE_VERIFICATION_STATUSES = [
  "unknown",
  "discovered",
  "pending_validation",
  "verified",
  "active",
  "degraded",
  "unavailable",
  "blocked",
  "manual_only",
  "invalid",
  "replaced",
] as const;

export type SourceVerificationStatus = (typeof SOURCE_VERIFICATION_STATUSES)[number];

/** Confidence baselines by source authority class. Never invent higher than evidence supports. */
export const CONFIDENCE_BY_SOURCE_CLASS = {
  government_api: 100,
  government_download: 95,
  federal_verified: 90,
  vendor_verified: 80,
  auction_verified: 70,
  manual_unverified: 50,
  demo: 40,
} as const;

export function categoryForSubtype(subtype: string): DistressCategory | null {
  return (SUBTYPE_TO_CATEGORY as Record<string, DistressCategory>)[subtype] ?? null;
}

export function isCondemnedSubtype(subtype: string): boolean {
  return subtype === "condemned";
}

/** Never infer condemnation from condition alone — only when source supports it. */
export function canLabelCondemned(subtype: string, sourceSupportsCondemnation: boolean): boolean {
  return subtype === "condemned" && sourceSupportsCondemnation;
}
