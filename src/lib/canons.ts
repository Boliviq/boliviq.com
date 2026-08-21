/** Boliviq combined-canon catalog — source of truth for roles, marketplace, CRM, AI, and integrations. */

export const PROFILE_ROLES = [
  {
    id: "homeowner",
    label: "Homeowner",
    group: "owner",
    description: "List a home, request estimates, and invite professionals into a property workspace.",
    professional: false,
    connections: [
      "contractor", "realtor", "investor", "wholesaler", "lender", "inspector",
      "appraiser", "property_manager", "insurance", "title", "attorney", "designer", "supplier",
    ],
    widgets: ["property_record", "repair_requests", "professionals", "messages", "documents"],
    shortcuts: [
      { label: "Post a repair", href: "/marketplace" },
      { label: "Find professionals", href: "/professionals" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "contractor",
    label: "Contractor",
    group: "construction",
    description: "Bid work, estimate repairs, run projects, and collect reviews.",
    professional: true,
    connections: [
      "homeowner", "investor", "realtor", "property_manager", "lender", "inspector",
      "designer", "supplier", "trade", "insurance",
    ],
    widgets: ["lead_feed", "bids", "projects", "estimates", "verification"],
    shortcuts: [
      { label: "Open marketplace", href: "/marketplace" },
      { label: "Projects", href: "/projects" },
      { label: "Verification", href: "/verification" },
    ],
  },
  {
    id: "realtor",
    label: "Realtor or broker",
    group: "brokerage",
    description: "Buyer and seller pipelines, listings, CMA workspace, and transaction milestones.",
    professional: true,
    connections: [
      "homeowner", "investor", "wholesaler", "lender", "contractor", "inspector",
      "appraiser", "title", "attorney", "property_manager", "insurance",
    ],
    widgets: ["listings", "buyer_seller_pipeline", "showings", "offers", "documents"],
    shortcuts: [
      { label: "Pipeline", href: "/pipeline" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Deal analyzer", href: "/deal-analyzer" },
    ],
  },
  {
    id: "investor",
    label: "Investor",
    group: "capital",
    description: "Buy-box, deal analysis, contractor bidding, and disposition.",
    professional: true,
    connections: [
      "homeowner", "wholesaler", "realtor", "lender", "contractor", "inspector",
      "appraiser", "title", "attorney", "property_manager", "insurance",
    ],
    widgets: ["hot_deals", "pipeline", "analyzers", "projects", "leads"],
    shortcuts: [
      { label: "Deal analyzer", href: "/deal-analyzer" },
      { label: "Properties", href: "/properties" },
      { label: "Pipeline", href: "/pipeline" },
    ],
  },
  {
    id: "wholesaler",
    label: "Wholesaler",
    group: "capital",
    description: "Seller intake, assignment posts, buyer matching, and compliance notices.",
    professional: true,
    connections: ["homeowner", "investor", "realtor", "lender", "contractor", "inspector", "title", "attorney"],
    widgets: ["seller_pipeline", "buyer_list", "assignments", "compliance", "documents"],
    shortcuts: [
      { label: "Leads", href: "/leads" },
      { label: "Marketplace", href: "/marketplace" },
      { label: "Pipeline", href: "/pipeline" },
    ],
  },
  {
    id: "lender",
    label: "Lender or mortgage professional",
    group: "finance",
    description: "Loan programs, borrower intake, construction draws, and referral tracking.",
    professional: true,
    connections: ["homeowner", "investor", "realtor", "contractor", "appraiser", "insurance", "title"],
    widgets: ["loan_pipeline", "prequal", "documents", "conditions"],
    shortcuts: [
      { label: "Documents", href: "/documents" },
      { label: "Pipeline", href: "/pipeline" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "property_manager",
    label: "Property manager",
    group: "operations",
    description: "Owner portfolios, work orders, vendor directory, and lease milestones.",
    professional: true,
    connections: ["homeowner", "investor", "contractor", "realtor", "inspector", "insurance", "attorney"],
    widgets: ["work_orders", "vendors", "properties", "documents", "messages"],
    shortcuts: [
      { label: "Projects", href: "/projects" },
      { label: "Professionals", href: "/professionals" },
      { label: "Documents", href: "/documents" },
    ],
  },
  {
    id: "inspector",
    label: "Inspector",
    group: "transaction",
    description: "Inspection types, report upload, repair tagging, and appointment requests.",
    professional: true,
    connections: ["homeowner", "realtor", "investor", "contractor", "lender", "property_manager", "insurance"],
    widgets: ["appointments", "reports", "repair_tags", "messages"],
    shortcuts: [
      { label: "Documents", href: "/documents" },
      { label: "Projects", href: "/projects" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "appraiser",
    label: "Appraiser",
    group: "transaction",
    description: "Coverage areas, secure document exchange, and licensed report delivery.",
    professional: true,
    connections: ["lender", "homeowner", "realtor", "investor", "attorney", "property_manager"],
    widgets: ["appointments", "reports", "documents"],
    shortcuts: [
      { label: "Documents", href: "/documents" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "title",
    label: "Title or closing professional",
    group: "transaction",
    description: "Order intake, transaction rooms, and anti-wire-fraud protections.",
    professional: true,
    connections: ["homeowner", "realtor", "investor", "wholesaler", "lender", "attorney", "insurance"],
    widgets: ["orders", "milestones", "documents", "messages"],
    shortcuts: [
      { label: "Documents", href: "/documents" },
      { label: "Projects", href: "/projects" },
    ],
  },
  {
    id: "insurance",
    label: "Insurance professional",
    group: "transaction",
    description: "Coverage quotes, policy milestones, and claim-related contractor referrals.",
    professional: true,
    connections: ["homeowner", "investor", "lender", "contractor", "property_manager", "inspector"],
    widgets: ["quotes", "policies", "referrals", "messages"],
    shortcuts: [
      { label: "Professionals", href: "/professionals" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "attorney",
    label: "Attorney",
    group: "transaction",
    description: "Practice areas, secure client intake, and matter milestones.",
    professional: true,
    connections: ["homeowner", "investor", "wholesaler", "realtor", "contractor", "lender", "title", "property_manager"],
    widgets: ["matters", "documents", "appointments"],
    shortcuts: [
      { label: "Documents", href: "/documents" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "designer",
    label: "Architect, engineer, or designer",
    group: "design_supply",
    description: "Credentials, plan storage, contractor collaboration, and client approvals.",
    professional: true,
    connections: ["homeowner", "contractor", "investor", "supplier", "inspector", "lender"],
    widgets: ["portfolio", "plans", "projects", "approvals"],
    shortcuts: [
      { label: "Projects", href: "/projects" },
      { label: "Documents", href: "/documents" },
      { label: "Marketplace", href: "/marketplace" },
    ],
  },
  {
    id: "supplier",
    label: "Supplier or material vendor",
    group: "design_supply",
    description: "Product catalog, contractor pricing, quotes, and delivery options.",
    professional: true,
    connections: ["contractor", "trade", "homeowner", "investor", "property_manager", "designer"],
    widgets: ["catalog", "quotes", "orders", "leads"],
    shortcuts: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Messages", href: "/messages" },
    ],
  },
  {
    id: "trade",
    label: "Trade professional or subcontractor",
    group: "construction",
    description: "Trade profile, availability, job feed, estimates, and invoices.",
    professional: true,
    connections: ["contractor", "homeowner", "investor", "property_manager", "supplier"],
    widgets: ["job_feed", "availability", "projects", "invoices"],
    shortcuts: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Projects", href: "/projects" },
      { label: "Verification", href: "/verification" },
    ],
  },
  {
    id: "other",
    label: "Other real estate service provider",
    group: "other",
    description: "Custom professional services connected to the Boliviq lifecycle.",
    professional: true,
    connections: ["homeowner", "realtor", "investor", "contractor"],
    widgets: ["directory", "messages", "documents"],
    shortcuts: [
      { label: "Marketplace", href: "/marketplace" },
      { label: "Professionals", href: "/professionals" },
    ],
  },
  {
    id: "administrator",
    label: "Administrator",
    group: "admin",
    description: "Intelligence Center for users, verification, moderation, billing, and audit logs.",
    professional: true,
    connections: [],
    widgets: ["users", "verification_review", "moderation", "credits", "audit"],
    shortcuts: [
      { label: "Admin", href: "/admin" },
      { label: "Verification", href: "/verification" },
      { label: "Integrations", href: "/integrations" },
    ],
  },
] as const;

export type ProfileRoleId = (typeof PROFILE_ROLES)[number]["id"];
export type ProfileRole = (typeof PROFILE_ROLES)[number];

export const MARKETPLACE_CATEGORIES = [
  { id: "homes_for_sale", label: "Homes for sale", group: "property" },
  { id: "off_market", label: "Off-market properties", group: "property" },
  { id: "investment", label: "Investment properties", group: "property" },
  { id: "land", label: "Land and lots", group: "property" },
  { id: "rentals", label: "Rental properties", group: "property" },
  { id: "commercial", label: "Commercial properties", group: "property" },
  { id: "foreclosures", label: "Foreclosures and distressed properties", group: "property" },
  { id: "repairs", label: "Repairs and home-improvement projects", group: "construction" },
  { id: "new_construction", label: "New construction", group: "construction" },
  { id: "contractor_services", label: "Contractor and trade services", group: "services" },
  { id: "realtor_services", label: "Realtor services", group: "services" },
  { id: "investor_services", label: "Investor and buyer services", group: "services" },
  { id: "lending", label: "Lending and financing", group: "services" },
  { id: "property_management", label: "Property-management services", group: "services" },
  { id: "inspections", label: "Inspections and appraisals", group: "services" },
  { id: "title_legal_insurance", label: "Title, legal, and insurance services", group: "services" },
  { id: "materials", label: "Building materials and equipment", group: "supply" },
  { id: "partnerships", label: "Businesses and real-estate partnerships", group: "network" },
  { id: "jobs", label: "Jobs and employment", group: "network" },
  { id: "education", label: "Education and networking", group: "network" },
] as const;

export type MarketplaceCategoryId = (typeof MARKETPLACE_CATEGORIES)[number]["id"];

export const CRM_PIPELINE_STAGES = [
  { key: "new", label: "New lead", color: "#64748b" },
  { key: "attempting_contact", label: "Attempting contact", color: "#0ea5e9" },
  { key: "contacted", label: "Contacted", color: "#38bdf8" },
  { key: "qualified", label: "Qualified", color: "#22c55e" },
  { key: "appointment_scheduled", label: "Appointment scheduled", color: "#14b8a6" },
  { key: "proposal_created", label: "Offer, estimate, or proposal created", color: "#f59e0b" },
  { key: "negotiating", label: "Negotiation", color: "#f97316" },
  { key: "under_contract", label: "Under contract", color: "#16a34a" },
  { key: "in_progress", label: "In progress", color: "#0d9488" },
  { key: "closed", label: "Closed or completed", color: "#15803d" },
  { key: "lost", label: "Lost", color: "#ef4444" },
  { key: "follow_up_later", label: "Long-term follow-up", color: "#94a3b8" },
] as const;

export type PipelineStageKey = (typeof CRM_PIPELINE_STAGES)[number]["key"];

/** Maps historical lead_status enum values onto canon pipeline columns. */
export const LEGACY_STATUS_TO_PIPELINE: Record<string, PipelineStageKey> = {
  new: "new",
  researching: "new",
  attempting_contact: "attempting_contact",
  contacted: "contacted",
  qualified: "qualified",
  appointment_scheduled: "appointment_scheduled",
  offer_preparation: "proposal_created",
  offer_submitted: "proposal_created",
  proposal_created: "proposal_created",
  negotiating: "negotiating",
  under_contract: "under_contract",
  in_progress: "in_progress",
  closed: "closed",
  lost: "lost",
  dead: "lost",
  follow_up_later: "follow_up_later",
};

export function mapLeadStatusToPipelineStage(status: string | null | undefined): PipelineStageKey {
  if (status && status in LEGACY_STATUS_TO_PIPELINE) {
    return LEGACY_STATUS_TO_PIPELINE[status];
  }
  return "new";
}

export const VERIFICATION_TIERS = [
  {
    id: "identity",
    label: "Identity verified",
    description: "Government ID and contact details have been confirmed.",
  },
  {
    id: "license",
    label: "License verified",
    description: "Professional license number and issuing jurisdiction have been reviewed.",
  },
  {
    id: "insurance",
    label: "Insurance verified",
    description: "Active liability or workers-compensation coverage has been documented.",
  },
  {
    id: "boliviq_certified",
    label: "Boliviq certified",
    description: "Completed Boliviq projects, reviews, and platform standards have been met.",
  },
  {
    id: "unverified",
    label: "Unverified",
    description: "No verification documents have been submitted yet.",
  },
] as const;

export type VerificationTierId = (typeof VERIFICATION_TIERS)[number]["id"];

export const VERIFICATION_DISCLAIMER =
  "Verification badges describe documents Boliviq has reviewed. They never imply that Boliviq guarantees a person's services.";

export const AI_AGENTS = [
  { id: "lead_qualification", name: "Lead Qualification Agent", summary: "Score and qualify inbound leads against your criteria." },
  { id: "property_analysis", name: "Property Analysis Agent", summary: "Analyze comps, ARV, and strategy options. Valuations are estimates, not appraisals." },
  { id: "construction_estimating", name: "Construction Estimating Agent", summary: "Draft scopes of work and repair estimates from photos and notes." },
  { id: "marketplace_matching", name: "Marketplace Matching Agent", summary: "Match listings, professionals, and opportunities to the right profiles." },
  { id: "communication_followup", name: "Communication and Follow-Up Agent", summary: "Draft replies and reminders. Sends only with authorization or an approved automation." },
  { id: "project_monitoring", name: "Project Monitoring Agent", summary: "Track milestones, photos, and missing project information." },
  { id: "compliance_review", name: "Compliance Review Agent", summary: "Flag missing disclosures, licenses, and jurisdiction notices." },
  { id: "customer_support", name: "Customer Support Agent", summary: "Answer product questions within the user's permissions." },
  { id: "document_organization", name: "Document Organization Agent", summary: "Classify and file authorized documents by property, project, and lead." },
  { id: "business_intelligence", name: "Business Intelligence Agent", summary: "Summarize pipeline, credits, and workspace performance." },
] as const;

export const AI_FORBIDDEN_ACTIONS = [
  "Send messages without authorization or an approved automation",
  "Sign agreements",
  "Move money",
  "Make lending decisions",
  "Provide licensed legal or appraisal conclusions",
  "Publish listings without confirmation",
  "Purchase services",
  "Delete critical records",
] as const;

export const INTEGRATIONS = [
  { id: "stripe", name: "Stripe", purpose: "Subscriptions, credit packs, receipts", profiles: "All paid users", status: "live" as const },
  { id: "email", name: "Email provider", purpose: "Verification, alerts, follow-up", profiles: "All users", status: "live" as const },
  { id: "sms", name: "SMS/voice provider", purpose: "Consented messages and calls", profiles: "Professionals", status: "live" as const },
  { id: "maps", name: "Maps/geocoding", purpose: "Locations, service areas, property maps", profiles: "All users", status: "modular" as const },
  { id: "calendar", name: "Calendar services", purpose: "Appointments and project events", profiles: "Professionals", status: "live" as const },
  { id: "storage", name: "Cloud storage", purpose: "Private files and documents", profiles: "All users", status: "live" as const },
  { id: "esign", name: "E-signature", purpose: "Contracts, estimates, approvals", profiles: "Professionals", status: "modular" as const },
  { id: "mls", name: "MLS/IDX", purpose: "Authorized property listings", profiles: "Realtors", status: "modular" as const },
  { id: "property_data", name: "Property-data providers", purpose: "Records, characteristics, comps", profiles: "Investors and realtors", status: "modular" as const },
  { id: "accounting", name: "Accounting platforms", purpose: "Invoice and transaction export", profiles: "Businesses", status: "modular" as const },
  { id: "video", name: "Video meetings", purpose: "Remote appointments", profiles: "Professionals", status: "modular" as const },
  { id: "ai", name: "AI model providers", purpose: "Analysis, generation, assistants", profiles: "AI plans", status: "live" as const },
  { id: "captcha", name: "CAPTCHA/security", purpose: "Abuse and bot protection", profiles: "All users", status: "modular" as const },
  { id: "analytics", name: "Analytics", purpose: "Product and business performance", profiles: "Admin", status: "modular" as const },
  { id: "error_monitoring", name: "Error monitoring", purpose: "Reliability and incident response", profiles: "Admin", status: "modular" as const },
  { id: "translation", name: "Translation services", purpose: "Multilingual content assistance", profiles: "All users", status: "modular" as const },
] as const;

export const TRADES = [
  "electrical",
  "plumbing",
  "hvac",
  "roofing",
  "framing",
  "concrete",
  "masonry",
  "drywall",
  "painting",
  "flooring",
  "cabinets_and_countertops",
  "excavation",
  "septic",
  "landscaping",
  "cleaning",
  "demolition",
  "insulation",
  "windows_and_doors",
  "siding_and_gutters",
  "handyman",
] as const;

export const TRADE_LABELS: Record<(typeof TRADES)[number], string> = {
  electrical: "Electrical",
  plumbing: "Plumbing",
  hvac: "HVAC",
  roofing: "Roofing",
  framing: "Framing",
  concrete: "Concrete",
  masonry: "Masonry",
  drywall: "Drywall",
  painting: "Painting",
  flooring: "Flooring",
  cabinets_and_countertops: "Cabinets and countertops",
  excavation: "Excavation",
  septic: "Septic",
  landscaping: "Landscaping",
  cleaning: "Cleaning",
  demolition: "Demolition",
  insulation: "Insulation",
  windows_and_doors: "Windows and doors",
  siding_and_gutters: "Siding and gutters",
  handyman: "Handyman services",
};

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "es", label: "Spanish" },
  { id: "zh", label: "Chinese" },
  { id: "vi", label: "Vietnamese" },
  { id: "ko", label: "Korean" },
  { id: "tl", label: "Tagalog" },
  { id: "fr", label: "French" },
  { id: "ar", label: "Arabic" },
  { id: "pt", label: "Portuguese" },
] as const;

export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const ACCOUNT_KINDS = [
  { id: "individual", label: "Individual" },
  { id: "company", label: "Company / workspace" },
] as const;

export type AccountKindId = (typeof ACCOUNT_KINDS)[number]["id"];

export const SUBSCRIPTION_GROUPS = [
  "Homeowner Free",
  "Professional",
  "Team Professional",
  "Professional + AI",
  "AI Team",
  "Enterprise",
] as const;

export const LIFECYCLE_STEPS = [
  { id: "find", label: "Find", detail: "Discover listings, off-market opportunities, and repair requests." },
  { id: "connect", label: "Connect", detail: "Message professionals, homeowners, and teams in context." },
  { id: "analyze", label: "Analyze", detail: "Score properties, estimates, and deals with transparent math." },
  { id: "finance", label: "Finance", detail: "Prequalify, collect documents, and close with title and legal support." },
  { id: "repair", label: "Repair / construct", detail: "Bid, estimate, schedule, and deliver the work." },
  { id: "manage", label: "Sell, rent, or manage", detail: "List, lease, or operate the finished property — then find the next one." },
] as const;

export const CONNECTED_LIFECYCLE_PRINCIPLE =
  "Every property, person, lead, project, document, conversation, estimate, transaction, and AI action should be connected — without exposing information to anyone who does not have permission to see it.";

export const WHOLESALE_COMPLIANCE_NOTICE =
  "Wholesaling, marketing equitable interests, licensing, and disclosure requirements vary by jurisdiction. Boliviq provides state-sensitive notices; you remain responsible for local compliance.";

export const APPRAISAL_ESTIMATE_NOTICE =
  "Automated valuations and deal scores are estimates, not licensed appraisals.";

export const LENDING_DECISION_NOTICE =
  "Boliviq does not make lending decisions unless separately licensed and designed to meet applicable lending regulations.";

export const LEGAL_ADVICE_NOTICE =
  "Boliviq AI must not represent itself as an attorney or replace jurisdiction-specific legal advice.";

export function isProfileRoleId(value: string | null | undefined): value is ProfileRoleId {
  return !!value && PROFILE_ROLES.some((r) => r.id === value);
}

export function getProfileRole(id: string | null | undefined): ProfileRole {
  const found = PROFILE_ROLES.find((r) => r.id === id);
  return found ?? PROFILE_ROLES[0];
}

export function getRoleLabel(id: string | null | undefined): string {
  return getProfileRole(id).label;
}

export function isProfessionalRole(id: string | null | undefined): boolean {
  return getProfileRole(id).professional && id !== "homeowner";
}

export function getConnectionsForRole(id: string | null | undefined): ProfileRole[] {
  const role = getProfileRole(id);
  return role.connections
    .map((cid) => PROFILE_ROLES.find((r) => r.id === cid))
    .filter((r): r is ProfileRole => !!r);
}

export type NavGroupId = "discover" | "work" | "crm" | "account";

export function getNavGroups(): { id: NavGroupId; label: string }[] {
  return [
    { id: "discover", label: "Discover" },
    { id: "work", label: "Work" },
    { id: "crm", label: "CRM" },
    { id: "account", label: "Account" },
  ];
}

export function roleDashboardHeadline(id: string | null | undefined): { title: string; description: string } {
  const role = getProfileRole(id);
  switch (role.id) {
    case "homeowner":
      return {
        title: "Your property workspace",
        description: "Post repairs, compare proposals, and keep every document and conversation on the same record.",
      };
    case "contractor":
    case "trade":
      return {
        title: "Jobs, estimates, and projects",
        description: "A homeowner repair post becomes a lead. An accepted estimate becomes a project.",
      };
    case "realtor":
      return {
        title: "Listings and client pipeline",
        description: "Coordinate buyers, sellers, contractors, and lenders without leaving the listing.",
      };
    case "investor":
      return {
        title: "Deals, analysis, and disposition",
        description: "Find, underwrite, finance, renovate, and exit — then loop back to the next opportunity.",
      };
    case "wholesaler":
      return {
        title: "Intake, matching, and assignments",
        description: "Seller leads, buyer criteria, and deal packages stay connected to the property record.",
      };
    case "lender":
      return {
        title: "Loan opportunities",
        description: "Borrower intake, property details, and construction draws live with the same deal file.",
      };
    case "property_manager":
      return {
        title: "Portfolios and work orders",
        description: "Maintenance requests become contractor projects without losing owner context.",
      };
    case "administrator":
      return {
        title: "Intelligence Center",
        description: "Users, verification, marketplace moderation, credits, and audit history in one place.",
      };
    default:
      return {
        title: `Welcome, ${role.label}`,
        description: "Boliviq connects people, properties, projects, and documents across the full real-estate lifecycle.",
      };
  }
}

export const PIPELINE_STAGES = CRM_PIPELINE_STAGES;
export const LIFECYCLE = LIFECYCLE_STEPS;
export const normalizeStage = mapLeadStatusToPipelineStage;

export type MarketplaceCategory = MarketplaceCategoryId;
export type VerificationTier = VerificationTierId;

export const CANON_INDEX = [
  "Platform Overview & Account Structure",
  "Onboarding & Authentication",
  "Marketplace & Search",
  "Communication Center",
  "CRM & Pipeline",
  "Trust & Verification",
  "AI Features",
  "Subscriptions & Billing",
  "External Integrations",
  "Administrative System",
  "Mobile, PWA & App Requirements",
  "Homeowner Profile",
  "Contractor & Trade Professional Profiles",
  "Realtor & Broker Profile",
  "Investor & Wholesaler Profiles",
  "Lender Profile",
  "Property Manager Profile",
  "Transaction-Support Professional Profiles",
  "Design & Supply Profiles",
] as const;

export const ADMIN_MODULES = [
  { key: "users", label: "User management", href: "/admin/users" },
  { key: "workspaces", label: "Workspace management", href: "/admin" },
  { key: "verification", label: "Professional verification", href: "/verification" },
  { key: "marketplace", label: "Marketplace moderation", href: "/marketplace" },
  { key: "credits", label: "Credit-wallet management", href: "/assistant" },
  { key: "ai", label: "AI-agent controls", href: "/assistant" },
  { key: "integrations", label: "Integration health", href: "/integrations" },
  { key: "audit", label: "Audit logs", href: "/admin" },
  { key: "coupons", label: "Coupon management", href: "/promotions" },
  { key: "tickets", label: "Support tickets", href: "/support" },
  { key: "status", label: "System status", href: "/admin/launch-verification" },
] as const;

export type AppHref =
  | "/dashboard"
  | "/marketplace"
  | "/professionals"
  | "/messages"
  | "/properties"
  | "/projects"
  | "/documents"
  | "/leads"
  | "/contacts"
  | "/pipeline"
  | "/tasks"
  | "/calls"
  | "/assistant"
  | "/deal-analyzer"
  | "/calculators"
  | "/reports"
  | "/automations"
  | "/marketing"
  | "/verification"
  | "/integrations"
  | "/billing"
  | "/settings"
  | "/support"
  | "/admin"
  | "/admin/users"
  | "/admin/launch-verification"
  | "/admin/checkout-verification"
  | "/promotions";

export type NavItem = { title: string; url: AppHref; group: "discover" | "work" | "crm" | "tools" };

const BASE_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", group: "discover" },
  { title: "Marketplace", url: "/marketplace", group: "discover" },
  { title: "Professionals", url: "/professionals", group: "discover" },
  { title: "Messages", url: "/messages", group: "discover" },
  { title: "Properties", url: "/properties", group: "work" },
  { title: "Projects", url: "/projects", group: "work" },
  { title: "Documents", url: "/documents", group: "work" },
  { title: "Leads", url: "/leads", group: "crm" },
  { title: "Contacts", url: "/contacts", group: "crm" },
  { title: "Pipeline", url: "/pipeline", group: "crm" },
  { title: "Tasks", url: "/tasks", group: "crm" },
  { title: "Calls", url: "/calls", group: "crm" },
  { title: "Assistant", url: "/assistant", group: "tools" },
];

const ROLE_EXTRA_NAV: Partial<Record<ProfileRoleId, NavItem[]>> = {
  investor: [
    { title: "Deal Analyzer", url: "/deal-analyzer", group: "work" },
    { title: "Calculators", url: "/calculators", group: "tools" },
    { title: "Reports", url: "/reports", group: "tools" },
  ],
  wholesaler: [
    { title: "Deal Analyzer", url: "/deal-analyzer", group: "work" },
    { title: "Calculators", url: "/calculators", group: "tools" },
  ],
  realtor: [
    { title: "Deal Analyzer", url: "/deal-analyzer", group: "work" },
    { title: "Marketing", url: "/marketing", group: "tools" },
  ],
  contractor: [
    { title: "Calculators", url: "/calculators", group: "tools" },
    { title: "Automations", url: "/automations", group: "tools" },
  ],
  trade: [{ title: "Calculators", url: "/calculators", group: "tools" }],
  lender: [{ title: "Reports", url: "/reports", group: "tools" }],
  property_manager: [{ title: "Automations", url: "/automations", group: "tools" }],
  administrator: [
    { title: "Reports", url: "/reports", group: "tools" },
    { title: "Automations", url: "/automations", group: "tools" },
  ],
};

export function navForRole(role: ProfileRoleId): NavItem[] {
  const extra = ROLE_EXTRA_NAV[role] ?? [];
  const seen = new Set<string>();
  return [...BASE_NAV, ...extra].filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

export type DashboardConfig = {
  greeting: string;
  description: string;
  primaryAction: { label: string; to: AppHref };
  stats: { label: string; value: string; hint: string }[];
  quickLinks: { label: string; to: AppHref; detail: string }[];
};

export function dashboardForRole(role: ProfileRoleId): DashboardConfig {
  const headline = roleDashboardHeadline(role);
  const profile = getProfileRole(role);
  const primary = profile.shortcuts[0] ?? { label: "Open marketplace", href: "/marketplace" as const };
  const statsByRole: Partial<Record<ProfileRoleId, DashboardConfig["stats"]>> = {
    homeowner: [
      { label: "Repair posts", value: "1", hint: "3 contractor replies on Oak Street" },
      { label: "Messages", value: "2", hint: "Ford Build estimate" },
      { label: "Saved pros", value: "4", hint: "Badges never guarantee services" },
      { label: "Documents", value: "7", hint: "Scope, photos, inspection" },
    ],
    contractor: [
      { label: "New job leads", value: "9", hint: "Marketplace + invitations" },
      { label: "Open estimates", value: "4", hint: "1 awaiting signature" },
      { label: "Projects", value: "3", hint: "Oak + Riverside in progress" },
      { label: "Credits", value: "420", hint: "Shared workspace wallet" },
    ],
    realtor: [
      { label: "Active listings", value: "11", hint: "2 off-market — not MLS" },
      { label: "Buyer pipeline", value: "18", hint: "4 appointments this week" },
      { label: "Offers", value: "5", hint: "2 in negotiation" },
      { label: "Messages", value: "6", hint: "Showing + disclosure threads" },
    ],
    investor: [
      { label: "Hot deals", value: "6", hint: "Estimates, not appraisals" },
      { label: "Pipeline", value: "142", hint: "Canon stages through close" },
      { label: "Open projects", value: "5", hint: "Rehab linked to properties" },
      { label: "Credits", value: "420", hint: "Analysis + estimating agents" },
    ],
    wholesaler: [
      { label: "Seller leads", value: "27", hint: "Jurisdiction notices on assignments" },
      { label: "Buyer matches", value: "14", hint: "Criteria + proof of funds" },
      { label: "Under contract", value: "3", hint: "Inspection-period reminders" },
      { label: "Messages", value: "5", hint: "Owners and cash buyers" },
    ],
    lender: [
      { label: "Loan pipeline", value: "12", hint: "Boliviq does not make credit decisions" },
      { label: "Conditions", value: "8", hint: "Docs in the deal file" },
      { label: "Draws", value: "2", hint: "Construction in progress" },
      { label: "Messages", value: "4", hint: "Borrower + title room" },
    ],
    property_manager: [
      { label: "Work orders", value: "11", hint: "Become contractor projects" },
      { label: "Units", value: "48", hint: "Owner portfolios" },
      { label: "Vendors", value: "16", hint: "Directory + verification" },
      { label: "Messages", value: "7", hint: "Owner and vendor threads" },
    ],
    administrator: [
      { label: "Users", value: "1,284", hint: "Intelligence Center" },
      { label: "Verification queue", value: "9", hint: "License + insurance review" },
      { label: "Reported listings", value: "3", hint: "Marketplace moderation" },
      { label: "Credits adjusted", value: "12", hint: "Audit-logged" },
    ],
  };
  return {
    greeting: headline.title,
    description: headline.description,
    primaryAction: { label: primary.label, to: primary.href as AppHref },
    stats: statsByRole[role] ?? [
      { label: "Open items", value: "8", hint: "Across marketplace, CRM, and projects" },
      { label: "Messages", value: "3", hint: "Unread" },
      { label: "Verification", value: profile.professional ? "Action needed" : "Homeowner", hint: "Badges never guarantee services" },
      { label: "Credits", value: "499", hint: "Shared workspace wallet" },
    ],
    quickLinks: profile.shortcuts.map((s) => ({
      label: s.label,
      to: s.href as AppHref,
      detail: profile.description,
    })),
  };
}

