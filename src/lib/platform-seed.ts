export type SeedProject = {
  id: string;
  title: string;
  status: "intake" | "estimating" | "scheduled" | "in_progress" | "punch" | "complete";
  property: string;
  lead?: string;
  budget: number;
  owner: string;
  contractor?: string;
  updated: string;
};

export const PROJECT_SEED: SeedProject[] = [
  {
    id: "prj-oak",
    title: "Oak Street kitchen + bath remodel",
    status: "estimating",
    property: "412 Oak Street, Austin TX",
    lead: "Repair request from marketplace",
    budget: 28000,
    owner: "R. Alvarez",
    contractor: "Ford Build",
    updated: "Today",
  },
  {
    id: "prj-river",
    title: "88 Riverside flip rehab",
    status: "in_progress",
    property: "88 Riverside Dr, Houston TX",
    lead: "Investor acquisition — under contract",
    budget: 62000,
    owner: "Jordan Tan",
    contractor: "Ford Build",
    updated: "2h ago",
  },
  {
    id: "prj-maple",
    title: "Maple spec framing",
    status: "scheduled",
    property: "1220 Maple Ave, Dallas TX",
    budget: 185000,
    owner: "Tan Capital",
    contractor: "Ford Build",
    updated: "Yesterday",
  },
  {
    id: "prj-elm",
    title: "Elm Court turnover / make-ready",
    status: "intake",
    property: "705 Elm Court, San Antonio TX",
    lead: "Property manager work order",
    budget: 6400,
    owner: "Hillside PM",
    updated: "3d ago",
  },
  {
    id: "prj-pine",
    title: "Pine Lane inspection repairs",
    status: "punch",
    property: "33 Pine Lane, Fort Worth TX",
    lead: "ClearView Inspect findings",
    budget: 11200,
    owner: "Marcus Reid",
    contractor: "Ruiz Electric",
    updated: "Mon",
  },
];

export type SeedDocument = {
  id: string;
  name: string;
  kind: string;
  property?: string;
  project?: string;
  conversation?: string;
  updated: string;
};

export const DOCUMENT_SEED: SeedDocument[] = [
  { id: "doc-1", name: "Oak Street — scope of work.pdf", kind: "Estimate", property: "412 Oak Street", project: "Oak Street remodel", updated: "Today" },
  { id: "doc-2", name: "Riverside — purchase contract.pdf", kind: "Contract", property: "88 Riverside Dr", conversation: "Riverside closing room", updated: "Yesterday" },
  { id: "doc-3", name: "ClearView inspection — 33 Pine.pdf", kind: "Inspection", property: "33 Pine Lane", project: "Pine Lane repairs", updated: "Mon" },
  { id: "doc-4", name: "Vale appraisal — 1220 Maple.pdf", kind: "Appraisal", property: "1220 Maple Ave", updated: "Aug 12" },
  { id: "doc-5", name: "Ford Build — GL certificate.pdf", kind: "Insurance", project: "Riverside flip", updated: "Aug 8" },
  { id: "doc-6", name: "Northstar — conditions checklist.pdf", kind: "Lending", property: "88 Riverside Dr", updated: "Aug 7" },
  { id: "doc-7", name: "Park Studio — kitchen elevations.pdf", kind: "Plans", project: "Oak Street remodel", updated: "Aug 6" },
];

export type SeedThread = {
  id: string;
  title: string;
  participants: string[];
  property?: string;
  project?: string;
  listing?: string;
  preview: string;
  time: string;
  unread: number;
  messages: { from: string; body: string; time: string }[];
};

export const MESSAGE_SEED: SeedThread[] = [
  {
    id: "msg-oak",
    title: "Oak Street remodel",
    participants: ["R. Alvarez", "Alex Ford", "Elena Ruiz"],
    property: "412 Oak Street",
    project: "Oak Street kitchen + bath remodel",
    listing: "Kitchen + bath remodel — Oak Street",
    preview: "Estimate attached. Ready when you approve the scope.",
    time: "12m",
    unread: 2,
    messages: [
      { from: "R. Alvarez", body: "Can you look at the kitchen photos I uploaded to the property record?", time: "Mon 9:14 AM" },
      { from: "Alex Ford", body: "Walked the photos. Drafting a scope that can convert this marketplace post into a project.", time: "Mon 11:02 AM" },
      { from: "Elena Ruiz", body: "Panel is at capacity — budget a 200A upgrade in the electrical line.", time: "Today 8:40 AM" },
      { from: "Alex Ford", body: "Estimate attached. Ready when you approve the scope.", time: "12m ago" },
    ],
  },
  {
    id: "msg-river",
    title: "Riverside closing room",
    participants: ["Jordan Tan", "Pat Nguyen", "Dana Cole"],
    property: "88 Riverside Dr",
    project: "88 Riverside flip rehab",
    preview: "Wire instructions will never be sent in this thread.",
    time: "1h",
    unread: 0,
    messages: [
      { from: "Dana Cole", body: "Conditions checklist is in Documents. Appraisal is ordered — Vale Appraisal.", time: "Yesterday" },
      { from: "Pat Nguyen", body: "Title order opened. Sensitive banking and wire details stay in the restricted room only.", time: "Yesterday" },
      { from: "Jordan Tan", body: "Contractor bid accepted — converting the estimate into the rehab project.", time: "1h ago" },
    ],
  },
  {
    id: "msg-listing",
    title: "1220 Maple showing",
    participants: ["Julie Chen", "Jordan Tan"],
    property: "1220 Maple Ave",
    listing: "Off-market duplex — East Dallas",
    preview: "Off-market — not an MLS listing.",
    time: "Yesterday",
    unread: 1,
    messages: [
      { from: "Julie Chen", body: "This is an off-market opportunity. Boliviq will not label it MLS.", time: "Yesterday" },
      { from: "Jordan Tan", body: "Adding it to the buy box and running the analyzer.", time: "Yesterday" },
    ],
  },
];

export const CREDIT_WALLET_SEED = {
  balance: 420,
  reserved: 40,
  monthlyGrant: 250,
  ledger: [
    { id: "led-1", kind: "subscription", amount: 250, description: "Professional + AI monthly credits", time: "Aug 1" },
    { id: "led-2", kind: "charge", amount: -18, description: "Property Analysis Agent — 88 Riverside", time: "Aug 18" },
    { id: "led-3", kind: "charge", amount: -12, description: "Construction Estimating Agent — Oak Street", time: "Aug 19" },
    { id: "led-4", kind: "reservation", amount: -40, description: "Reserved: Marketplace Matching Agent", time: "Aug 20" },
    { id: "led-5", kind: "promo", amount: 50, description: "Onboarding promotional credits", time: "Jul 22" },
  ],
};
