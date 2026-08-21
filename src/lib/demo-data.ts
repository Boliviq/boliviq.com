// Demo seed data used to bootstrap a helpful first-run experience.
// Users can add / edit / delete via the UI; these are inserted only on demand.

export const DEMO_PROPERTIES = [
  {
    address: "412 Oak Street", city: "Austin", state: "TX", zip: "78702",
    beds: 3, baths: 2, sqft: 1450, year_built: 1978, lot_size: 6500,
    list_price: 285000, arv: 395000, rehab_estimate: 42000, estimated_profit: 48000,
    monthly_rent: 2200, monthly_cashflow: 385, cap_rate: 6.2, deal_score: 87,
    property_type: "Single family", status: "hot", source: "MLS", days_on_market: 18,
    owner_name: "R. Alvarez", listing_agent: "Julie Chen", agent_phone: "512-555-0132",
    agent_email: "julie@austinrealty.com", strategy: "Flip", motivation: "High",
    image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
  },
  {
    address: "1220 Maple Ave", city: "Dallas", state: "TX", zip: "75204",
    beds: 4, baths: 2.5, sqft: 2100, year_built: 1994, lot_size: 8200,
    list_price: 342500, arv: 450000, rehab_estimate: 55000, estimated_profit: 42000,
    monthly_rent: 2650, monthly_cashflow: 410, cap_rate: 5.8, deal_score: 72,
    property_type: "Single family", status: "warm", source: "Zillow", days_on_market: 34,
    owner_name: "M. Patel", listing_agent: "Rick Osborne", agent_phone: "214-555-0177",
    agent_email: "rick@dfwhomes.com", strategy: "BRRRR", motivation: "Medium",
    image_url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
  },
  {
    address: "88 Riverside Dr", city: "Houston", state: "TX", zip: "77007",
    beds: 3, baths: 2, sqft: 1680, year_built: 1965, lot_size: 5400,
    list_price: 198000, arv: 320000, rehab_estimate: 62000, estimated_profit: 55000,
    monthly_rent: 1900, monthly_cashflow: 520, cap_rate: 7.4, deal_score: 91,
    property_type: "Single family", status: "hot", source: "Wholesaler", days_on_market: 6,
    owner_name: "T. Nguyen", listing_agent: "Direct owner", agent_phone: "713-555-0100",
    agent_email: "", strategy: "Flip", motivation: "High",
    image_url: "https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800",
  },
  {
    address: "705 Elm Court", city: "San Antonio", state: "TX", zip: "78209",
    beds: 5, baths: 3, sqft: 2850, year_built: 2004, lot_size: 9800,
    list_price: 425000, arv: 495000, rehab_estimate: 22000, estimated_profit: 28000,
    monthly_rent: 3100, monthly_cashflow: 285, cap_rate: 4.9, deal_score: 54,
    property_type: "Single family", status: "cool", source: "MLS", days_on_market: 78,
    owner_name: "S. Coleman", listing_agent: "Vivian Park", agent_phone: "210-555-0142",
    agent_email: "vivian@satxrealty.com", strategy: "Rental", motivation: "Low",
    image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
  },
  {
    address: "33 Pine Lane", city: "Fort Worth", state: "TX", zip: "76107",
    beds: 3, baths: 2, sqft: 1520, year_built: 1988, lot_size: 6100,
    list_price: 310000, arv: 385000, rehab_estimate: 38000, estimated_profit: 27000,
    monthly_rent: 2400, monthly_cashflow: 340, cap_rate: 5.5, deal_score: 68,
    property_type: "Single family", status: "warm", source: "Foreclosure", days_on_market: 22,
    owner_name: "Bank owned", listing_agent: "Marcus Reid", agent_phone: "817-555-0166",
    agent_email: "marcus@fwrealty.com", strategy: "Flip", motivation: "High",
    image_url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
  },
] as const;

export const DEMO_CONTACTS = [
  { name: "Julie Chen", role: "Listing agent", phone: "512-555-0132", email: "julie@austinrealty.com", company: "Austin Realty" },
  { name: "Rick Osborne", role: "Listing agent", phone: "214-555-0177", email: "rick@dfwhomes.com", company: "DFW Homes" },
  { name: "T. Nguyen", role: "Seller", phone: "713-555-0100", email: "tnguyen@example.com", company: "" },
  { name: "Marcus Reid", role: "Listing agent", phone: "817-555-0166", email: "marcus@fwrealty.com", company: "FW Realty" },
  { name: "Alex Ford", role: "Contractor", phone: "512-555-0199", email: "alex@fordbuild.com", company: "Ford Build" },
];

export const LEAD_STATUSES = [
  { value: "new", label: "New", tone: "default" },
  { value: "researching", label: "Researching", tone: "default" },
  { value: "attempting_contact", label: "Attempting contact", tone: "default" },
  { value: "contacted", label: "Contacted", tone: "default" },
  { value: "qualified", label: "Qualified", tone: "success" },
  { value: "offer_preparation", label: "Offer preparation", tone: "warning" },
  { value: "offer_submitted", label: "Offer submitted", tone: "warning" },
  { value: "negotiating", label: "Negotiating", tone: "warning" },
  { value: "under_contract", label: "Under contract", tone: "success" },
  { value: "closed", label: "Closed", tone: "success" },
  { value: "follow_up_later", label: "Follow up later", tone: "default" },
  { value: "lost", label: "Lost", tone: "destructive" },
  { value: "dead", label: "Dead", tone: "destructive" },
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number]["value"];

export const PIPELINE_STAGES = [
  { key: "new", label: "New", color: "#64748b" },
  { key: "researching", label: "Researching", color: "#0ea5e9" },
  { key: "attempting_contact", label: "Attempting", color: "#0ea5e9" },
  { key: "qualified", label: "Qualified", color: "#22c55e" },
  { key: "offer_submitted", label: "Offer sent", color: "#f59e0b" },
  { key: "negotiating", label: "Negotiating", color: "#f59e0b" },
  { key: "under_contract", label: "Under contract", color: "#16a34a" },
  { key: "closed", label: "Closed", color: "#15803d" },
] as const;

export const TASK_TYPES = [
  "Research property", "Call agent", "Call seller", "Run comps",
  "Estimate rehab", "Prepare offer", "Follow up", "Review contract", "Schedule inspection",
] as const;

export const PROPERTY_TYPES = [
  "Single family", "Multi-family", "Condo", "Townhouse", "Land", "Commercial", "Mobile home",
] as const;

export const STRATEGIES = ["Flip", "Rental", "BRRRR", "Wholesale", "Airbnb", "New build"] as const;

export const CSV_FIELD_MAP: { key: string; label: string }[] = [
  { key: "address", label: "Property address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "zip", label: "ZIP" },
  { key: "list_price", label: "Asking price" },
  { key: "property_type", label: "Property type" },
  { key: "beds", label: "Bedrooms" },
  { key: "baths", label: "Bathrooms" },
  { key: "sqft", label: "Square footage" },
  { key: "lot_size", label: "Lot size" },
  { key: "year_built", label: "Year built" },
  { key: "owner_name", label: "Owner name" },
  { key: "listing_agent", label: "Listing agent" },
  { key: "agent_phone", label: "Agent phone" },
  { key: "agent_email", label: "Agent email" },
  { key: "listing_url", label: "Listing URL" },
  { key: "monthly_rent", label: "Estimated rent" },
  { key: "arv", label: "Estimated ARV" },
  { key: "rehab_estimate", label: "Estimated rehab" },
  { key: "notes", label: "Notes" },
];

export const FILTER_PRESETS: Array<{
  name: string;
  desc: string;
  filters: Record<string, string | number>;
}> = [
  { name: "Best flips", desc: "High ARV spread, low rehab", filters: { strategy: "Flip", profitMin: "30000", rehabMax: "50000", scoreMin: 70 } },
  { name: "Cash-flow rentals", desc: "Positive monthly cash flow", filters: { strategy: "Rental", cashflowMin: "1" } },
  { name: "Wholesale opportunities", desc: "Deep discount to ARV", filters: { strategy: "Wholesale" } },
  { name: "Price reductions", desc: "Recent listings still moving", filters: { motivation: "High", domMax: "21" } },
  { name: "High-equity properties", desc: "Owner equity / profit > $40k", filters: { profitMin: "40000" } },
  { name: "Motivated sellers", desc: "Distress signals", filters: { motivation: "High" } },
  { name: "Low-rehab properties", desc: "Rehab under $20k", filters: { rehabMax: "20000" } },
];
