/** Plan entitlements for distressed search / AI / watchlists (config-driven). */

export type DistressEntitlements = {
  planTier: string;
  maxSearchResults: number;
  canUseAdvancedFilters: boolean;
  canUseMapLayers: boolean;
  canSaveSearches: number;
  canUseAiAnalysis: boolean;
  canExport: boolean;
  canWatchlist: number;
  creditsOwnerLookup: number;
  creditsAiAnalysis: number;
  creditsEnrichment: number;
};

export const DEFAULT_ENTITLEMENTS: Record<string, DistressEntitlements> = {
  free: {
    planTier: "free",
    maxSearchResults: 25,
    canUseAdvancedFilters: false,
    canUseMapLayers: false,
    canSaveSearches: 1,
    canUseAiAnalysis: false,
    canExport: false,
    canWatchlist: 5,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 10,
    creditsEnrichment: 8,
  },
  beginner: {
    planTier: "beginner",
    maxSearchResults: 100,
    canUseAdvancedFilters: true,
    canUseMapLayers: true,
    canSaveSearches: 5,
    canUseAiAnalysis: false,
    canExport: false,
    canWatchlist: 25,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 10,
    creditsEnrichment: 8,
  },
  professional: {
    planTier: "professional",
    maxSearchResults: 500,
    canUseAdvancedFilters: true,
    canUseMapLayers: true,
    canSaveSearches: 25,
    canUseAiAnalysis: true,
    canExport: true,
    canWatchlist: 100,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 10,
    creditsEnrichment: 8,
  },
  professional_ai_max: {
    planTier: "professional_ai_max",
    maxSearchResults: 2000,
    canUseAdvancedFilters: true,
    canUseMapLayers: true,
    canSaveSearches: 100,
    canUseAiAnalysis: true,
    canExport: true,
    canWatchlist: 500,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 8,
    creditsEnrichment: 6,
  },
  team: {
    planTier: "team",
    maxSearchResults: 2000,
    canUseAdvancedFilters: true,
    canUseMapLayers: true,
    canSaveSearches: 100,
    canUseAiAnalysis: true,
    canExport: true,
    canWatchlist: 500,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 10,
    creditsEnrichment: 8,
  },
  team_ai_max: {
    planTier: "team_ai_max",
    maxSearchResults: 5000,
    canUseAdvancedFilters: true,
    canUseMapLayers: true,
    canSaveSearches: 250,
    canUseAiAnalysis: true,
    canExport: true,
    canWatchlist: 2000,
    creditsOwnerLookup: 5,
    creditsAiAnalysis: 8,
    creditsEnrichment: 6,
  },
};

export function entitlementsForPlan(plan: string | null | undefined): DistressEntitlements {
  const key = (plan ?? "free").toLowerCase();
  return DEFAULT_ENTITLEMENTS[key] ?? DEFAULT_ENTITLEMENTS.free;
}
