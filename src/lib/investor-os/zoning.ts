/** Zoning / permit intelligence helpers + demo snapshots. */

export type ZoningSnapshot = {
  zoning_code: string;
  zoning_label: string;
  permitted_uses: string[];
  lot_dimensions?: string;
  setbacks?: Record<string, string>;
  density?: string;
  height_limit?: string;
  lot_coverage?: string;
  min_lot_size?: string;
  adu_potential?: string;
  multifamily_potential?: string;
  subdivision_potential?: string;
  commercial_potential?: string;
  hidden_opportunity_note?: string | null;
  certainty: "verified" | "provider_data" | "estimate" | "ai_inference" | "demo";
  source_label: string;
  source_url?: string;
  is_demo: boolean;
};

export type PermitRecord = {
  permit_number: string;
  permit_type: string;
  status: string;
  filed_at?: string;
  closed_at?: string | null;
  description: string;
  provenance: "verified" | "provider_data" | "estimate" | "demo";
  source_label: string;
  is_demo: boolean;
};

export function demoZoningForCounty(countyFips?: string | null): ZoningSnapshot {
  const largeLot = countyFips === "47101";
  return {
    zoning_code: largeLot ? "R-1" : "RS10",
    zoning_label: largeLot ? "Residential Low Density" : "Single-Family Residential",
    permitted_uses: ["single_family", "accessory_structures"],
    lot_dimensions: largeLot ? "Approx 1.35 acres (DEMO)" : "50 x 150 (DEMO)",
    setbacks: { front: "25 ft", side: "10 ft", rear: "20 ft" },
    density: "1 du / lot",
    height_limit: "35 ft",
    lot_coverage: "35%",
    min_lot_size: largeLot ? "1 acre" : "7,500 sqft",
    adu_potential: "May warrant investigation subject to local ADU rules (not confirmed).",
    multifamily_potential: "Not indicated by available DEMO zoning label.",
    subdivision_potential: largeLot
      ? "Parcel size may warrant further investigation for subdivision — not a confirmation."
      : "No subdivision signal from DEMO lot size.",
    commercial_potential: "Not indicated.",
    hidden_opportunity_note: largeLot
      ? "Possible Hidden Opportunity: This parcel may warrant further investigation for subdivision. Verify with the planning department."
      : null,
    certainty: "demo",
    source_label: "DEMO municipal zoning digest",
    source_url: undefined,
    is_demo: true,
  };
}

export function demoPermits(): PermitRecord[] {
  return [
    {
      permit_number: "BLD-2024-1188",
      permit_type: "electrical",
      status: "open",
      filed_at: "2024-06-12",
      closed_at: null,
      description: "Electrical panel upgrade (DEMO)",
      provenance: "demo",
      source_label: "DEMO building department",
      is_demo: true,
    },
    {
      permit_number: "BLD-2019-0441",
      permit_type: "building",
      status: "closed",
      filed_at: "2019-03-02",
      closed_at: "2019-05-18",
      description: "Roof replacement (DEMO)",
      provenance: "demo",
      source_label: "DEMO building department",
      is_demo: true,
    },
  ];
}
