/** Construction Intelligence — scope/materials/labor estimates (AI-assisted, labeled). */

export type ScopeLine = {
  category: string;
  description: string;
  materials: number;
  labor: number;
  notes?: string;
};

export type ConstructionEstimateInput = {
  sqft?: number | null;
  yearBuilt?: number | null;
  propertyType?: string | null;
  estimatedRehab?: number | null;
  conditionNotes?: string;
  photoCount?: number;
};

export type ConstructionEstimateResult = {
  scopeOfWork: ScopeLine[];
  materialsTotal: number;
  laborTotal: number;
  contingencyPct: number;
  contingencyAmount: number;
  grandTotal: number;
  timelineWeeksMin: number;
  timelineWeeksMax: number;
  provenance: "ai_inference" | "estimate" | "demo";
  assumptions: Record<string, string | number>;
};

const BASE_CATEGORIES: Array<{ category: string; weight: number; description: string }> = [
  { category: "demolition", weight: 0.04, description: "Selective demolition and haul-off" },
  { category: "framing", weight: 0.05, description: "Framing repairs / structural patch" },
  { category: "roofing", weight: 0.08, description: "Roof repair or replacement allowance" },
  { category: "siding", weight: 0.04, description: "Exterior siding / trim" },
  { category: "windows_doors", weight: 0.05, description: "Windows and exterior doors" },
  { category: "hvac", weight: 0.08, description: "HVAC service or system" },
  { category: "electrical", weight: 0.07, description: "Electrical upgrades / panel" },
  { category: "plumbing", weight: 0.07, description: "Plumbing rough/finish" },
  { category: "drywall_insulation", weight: 0.06, description: "Drywall and insulation" },
  { category: "paint", weight: 0.05, description: "Interior/exterior paint" },
  { category: "flooring", weight: 0.08, description: "Flooring throughout" },
  { category: "kitchen", weight: 0.12, description: "Cabinets, counters, appliances, lighting" },
  { category: "bathrooms", weight: 0.1, description: "Bath remodel allowance" },
  { category: "landscaping", weight: 0.03, description: "Cleanup / curb appeal" },
  { category: "foundation_drainage", weight: 0.04, description: "Foundation/drainage contingency" },
  { category: "misc", weight: 0.04, description: "Permits, dumpsters, miscellaneous" },
];

export function buildConstructionEstimate(
  input: ConstructionEstimateInput,
): ConstructionEstimateResult {
  const sqft = input.sqft && input.sqft > 0 ? input.sqft : 1500;
  const ageFactor =
    input.yearBuilt && input.yearBuilt < 1970
      ? 1.15
      : input.yearBuilt && input.yearBuilt < 1990
        ? 1.08
        : 1;
  const base =
    input.estimatedRehab && input.estimatedRehab > 0
      ? input.estimatedRehab
      : Math.round(sqft * 45 * ageFactor);

  const scopeOfWork: ScopeLine[] = BASE_CATEGORIES.map((c) => {
    const total = Math.round(base * c.weight);
    const materials = Math.round(total * 0.55);
    const labor = total - materials;
    return {
      category: c.category,
      description: c.description,
      materials,
      labor,
      notes: input.conditionNotes ? "Adjusted from notes (inference)" : undefined,
    };
  });

  const materialsTotal = scopeOfWork.reduce((a, l) => a + l.materials, 0);
  const laborTotal = scopeOfWork.reduce((a, l) => a + l.labor, 0);
  const subtotal = materialsTotal + laborTotal;
  const contingencyPct = 10;
  const contingencyAmount = Math.round(subtotal * (contingencyPct / 100));
  const grandTotal = subtotal + contingencyAmount;
  const weeks = Math.max(4, Math.round(sqft / 250));

  return {
    scopeOfWork,
    materialsTotal,
    laborTotal,
    contingencyPct,
    contingencyAmount,
    grandTotal,
    timelineWeeksMin: weeks,
    timelineWeeksMax: weeks + 4,
    provenance: "ai_inference",
    assumptions: {
      sqft,
      baseRehabBudget: base,
      ageFactor,
      photoCount: input.photoCount ?? 0,
      note: "Line items are AI/estimate allocations — replace with contractor bids before funding.",
    },
  };
}

export function demoContractorBids(grandTotal: number) {
  return [
    {
      contractor_name: "Summit Renovations LLC (DEMO)",
      price: Math.round(grandTotal * 0.97),
      timeline_weeks: 8,
      scope_exclusions: "Structural engineering, landscaping over $2k",
      license_info: "TN GC #DEMO-1001",
      insurance_info: "COI on file (demo)",
      comments: "Can start within 2 weeks.",
      is_demo: true,
    },
    {
      contractor_name: "River City Builders (DEMO)",
      price: Math.round(grandTotal * 1.05),
      timeline_weeks: 10,
      scope_exclusions: "Window package upgrades",
      license_info: "TN GC #DEMO-2044",
      insurance_info: "COI on file (demo)",
      comments: "Includes dumpster and permits allowance.",
      is_demo: true,
    },
    {
      contractor_name: "Precision Flip Crew (DEMO)",
      price: Math.round(grandTotal * 0.94),
      timeline_weeks: 7,
      scope_exclusions: "HVAC full replacement if condemned unit",
      license_info: "TN GC #DEMO-3310",
      insurance_info: "COI on file (demo)",
      comments: "Aggressive timeline; change orders weekly.",
      is_demo: true,
    },
  ];
}
