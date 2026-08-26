export type dataProvenance =
  | "verified"
  | "provider_data"
  | "estimate"
  | "ai_inference"
  | "user_provided"
  | "demo";

export type BuyBoxCriteria = {
  market?: string;
  state?: string;
  countyFips?: string;
  radiusMiles?: number;
  centerLat?: number;
  centerLng?: number;
  propertyTypes?: string[];
  bedsMin?: number;
  acquisitionMax?: number;
  arvMin?: number;
  arvMax?: number;
  rehabMax?: number;
  profitMin?: number;
  equityPctMin?: number;
  distressPreferred?: boolean;
  distressScoreMin?: number;
  opportunityScoreMin?: number;
  absenteePreferred?: boolean;
};

export type PassportAction =
  | "analyze"
  | "run_ai"
  | "save"
  | "add_crm"
  | "contact_owner"
  | "generate_offer"
  | "find_funding"
  | "request_bids"
  | "watchlist"
  | "start_transaction";
