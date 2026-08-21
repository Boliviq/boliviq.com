import { MARKETPLACE_SEED, type SeedListing } from "@/lib/marketplace-seed";
import { PROFESSIONAL_SEED } from "@/lib/professional-seed";
import type { MarketplaceCategoryId, ProfileRoleId, VerificationTierId } from "@/lib/canons";

export type MarketplaceListing = SeedListing & {
  priceLabel?: string;
  authorName?: string;
  authorRole?: ProfileRoleId;
  visibility?: "public" | "limited";
  expiresAt?: string;
  ownerId?: string;
};

const EVT = "boliviq-workspace";

function key(userId: string, kind: string) {
  return `boliviq:${userId}:${kind}`;
}

function read<T>(userId: string, kind: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key(userId, kind)) || "[]") as T[];
  } catch {
    return [];
  }
}

function write<T>(userId: string, kind: string, rows: T[]) {
  localStorage.setItem(key(userId, kind), JSON.stringify(rows));
  window.dispatchEvent(new Event(EVT));
}

export function subscribeWorkspace(cb: () => void) {
  window.addEventListener(EVT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function listListings(userId: string | null): MarketplaceListing[] {
  const mine = userId ? read<MarketplaceListing>(userId, "listings") : [];
  return [...mine, ...MARKETPLACE_SEED];
}

export function createListing(
  userId: string,
  input: Partial<MarketplaceListing> & Pick<MarketplaceListing, "title" | "description" | "category" | "location">,
) {
  const row: MarketplaceListing = {
    id: `usr_${crypto.randomUUID()}`,
    title: input.title,
    description: input.description,
    category: input.category,
    location: input.location,
    city: input.city ?? input.location,
    state: input.state ?? "",
    price: input.price,
    budget: input.budget,
    photos: input.photos?.length ? input.photos : ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"],
    postedBy: input.postedBy ?? input.authorName ?? "You",
    role: input.role ?? input.authorRole ?? "homeowner",
    propertyLabel: input.propertyLabel,
    projectLabel: input.projectLabel,
    createdAt: new Date().toISOString().slice(0, 10),
    priceLabel: input.priceLabel,
    authorName: input.authorName ?? "You",
    authorRole: input.authorRole ?? "homeowner",
    visibility: input.visibility ?? "public",
    expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    ownerId: userId,
  };
  write(userId, "listings", [row, ...read<MarketplaceListing>(userId, "listings")]);
  return row;
}

export function toggleSavedListing(userId: string, listingId: string) {
  const saved = new Set(read<string>(userId, "saved"));
  if (saved.has(listingId)) saved.delete(listingId);
  else saved.add(listingId);
  write(userId, "saved", [...saved]);
}

export function savedListingIds(userId: string | null) {
  return new Set(userId ? read<string>(userId, "saved") : []);
}

export function reportListing(userId: string, listingId: string, reason: string) {
  write(userId, "reports", [{ listingId, reason, at: new Date().toISOString() }, ...read(userId, "reports")]);
}

export type Thread = {
  id: string;
  title: string;
  context: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
  unread: number;
  messages: { id: string; from: string; body: string; at: string; mine?: boolean }[];
};

const THREAD_SEED: Thread[] = [
  {
    id: "th_kitchen",
    title: "Kitchen remodel — Maya Chen",
    context: "Project · 412 Oak St",
    participants: ["Maya Chen (Homeowner)", "Alex Ford (Contractor)"],
    lastMessage: "I can walk the property Thursday at 3pm.",
    updatedAt: new Date().toISOString(),
    unread: 1,
    messages: [
      { id: "m1", from: "Maya Chen", body: "Can you bid cabinets, counters, and flooring together?", at: "2026-08-19T15:02:00Z" },
      { id: "m2", from: "Alex Ford", body: "Yes. I'll send a scope tonight and we can walk Thursday at 3pm.", at: "2026-08-19T16:40:00Z", mine: true },
    ],
  },
  {
    id: "th_oak",
    title: "412 Oak Street showing",
    context: "Property · Homes for sale",
    participants: ["Julie Chen (Realtor)", "You"],
    lastMessage: "Disclosure packet is in Documents.",
    updatedAt: "2026-08-20T11:00:00Z",
    unread: 0,
    messages: [
      { id: "m3", from: "Julie Chen", body: "Are you available Saturday 11–1 for a showing?", at: "2026-08-20T10:12:00Z" },
      { id: "m4", from: "You", body: "Saturday 11 works. Disclosure packet is in Documents.", at: "2026-08-20T11:00:00Z", mine: true },
    ],
  },
  {
    id: "th_loan",
    title: "Prequalification — Riverside Dr",
    context: "Deal · Lending",
    participants: ["Dana Lewis (Lender)", "You"],
    lastMessage: "Upload the entity docs when you can — this is not a credit decision.",
    updatedAt: "2026-08-18T09:30:00Z",
    unread: 0,
    messages: [
      { id: "m5", from: "Dana Lewis", body: "Upload the entity docs when you can — this is not a credit decision.", at: "2026-08-18T09:30:00Z" },
    ],
  },
];

export function listThreads(userId: string | null): Thread[] {
  const mine = userId ? read<Thread>(userId, "threads") : [];
  return [...mine, ...THREAD_SEED];
}

export function sendMessage(userId: string, threadId: string, body: string) {
  const mine = read<Thread>(userId, "threads");
  const fromSeed = THREAD_SEED.find((t) => t.id === threadId);
  const existing = mine.find((t) => t.id === threadId) ?? (fromSeed ? { ...fromSeed, messages: [...fromSeed.messages] } : null);
  const msg = { id: `m_${crypto.randomUUID()}`, from: "You", body, at: new Date().toISOString(), mine: true };
  let next: Thread[];
  if (existing) {
    const updated: Thread = {
      ...existing,
      lastMessage: body,
      updatedAt: msg.at,
      unread: 0,
      messages: [...existing.messages, msg],
    };
    next = [updated, ...mine.filter((t) => t.id !== threadId)];
  } else {
    next = [{
      id: threadId,
      title: "New conversation",
      context: "Direct message",
      participants: ["You"],
      lastMessage: body,
      updatedAt: msg.at,
      unread: 0,
      messages: [msg],
    }, ...mine];
  }
  write(userId, "threads", next);
}

export function startConversation(userId: string, title: string, context: string, firstMessage: string) {
  const id = `th_${crypto.randomUUID()}`;
  const msg = { id: `m_${crypto.randomUUID()}`, from: "You", body: firstMessage, at: new Date().toISOString(), mine: true as const };
  const thread: Thread = {
    id,
    title,
    context,
    participants: ["You"],
    lastMessage: firstMessage,
    updatedAt: msg.at,
    unread: 0,
    messages: [msg],
  };
  write(userId, "threads", [thread, ...read<Thread>(userId, "threads")]);
  return id;
}

export type ProjectRecord = {
  id: string;
  name: string;
  address: string;
  status: "new" | "estimating" | "in_progress" | "awaiting_approval" | "completed";
  roleView: string;
  budget: number;
  spent: number;
  nextMilestone: string;
};

const PROJECT_SEED: ProjectRecord[] = [
  { id: "prj_kitchen", name: "Kitchen remodel", address: "412 Oak Street, Austin TX", status: "estimating", roleView: "Bid comparison", budget: 32000, spent: 0, nextMilestone: "Walk-through Thu 3:00 PM" },
  { id: "prj_riverside", name: "Riverside flip — Phase 1", address: "88 Riverside Dr, Houston TX", status: "in_progress", roleView: "Daily logs", budget: 62000, spent: 18400, nextMilestone: "Electrical rough-in" },
  { id: "prj_turnover", name: "Unit 2B turnover", address: "Harbor Flats, Houston TX", status: "awaiting_approval", roleView: "Owner approval", budget: 4800, spent: 4100, nextMilestone: "Punch photos" },
  { id: "prj_close", name: "Cedar Title — 1220 Maple", address: "1220 Maple Ave, Dallas TX", status: "in_progress", roleView: "Closing checklist", budget: 0, spent: 0, nextMilestone: "Clear title commitment" },
];

export function listProjects(userId: string | null): ProjectRecord[] {
  const mine = userId ? read<ProjectRecord>(userId, "projects") : [];
  return [...mine, ...PROJECT_SEED];
}

export function createProject(userId: string, input: Omit<ProjectRecord, "id">) {
  const row = { ...input, id: `prj_${crypto.randomUUID()}` };
  write(userId, "projects", [row, ...read<ProjectRecord>(userId, "projects")]);
  return row;
}

export type DocRecord = {
  id: string;
  name: string;
  kind: string;
  related: string;
  restricted: boolean;
  updatedAt: string;
};

const DOC_SEED: DocRecord[] = [
  { id: "doc_insp", name: "Inspection report — 412 Oak St.pdf", kind: "Inspection", related: "412 Oak Street", restricted: false, updatedAt: "2026-08-12T18:00:00Z" },
  { id: "doc_scope", name: "Kitchen scope of work.docx", kind: "Estimate", related: "Kitchen remodel", restricted: false, updatedAt: "2026-08-19T20:00:00Z" },
  { id: "doc_disc", name: "Seller disclosures.pdf", kind: "Disclosure", related: "412 Oak Street", restricted: false, updatedAt: "2026-08-20T11:00:00Z" },
  { id: "doc_wire", name: "Wiring instructions — DO NOT EMAIL.pdf", kind: "Closing", related: "1220 Maple Ave", restricted: true, updatedAt: "2026-08-18T09:00:00Z" },
  { id: "doc_policy", name: "Builder's risk quote.pdf", kind: "Insurance", related: "Riverside flip", restricted: false, updatedAt: "2026-08-16T14:00:00Z" },
];

export function listDocuments(userId: string | null): DocRecord[] {
  const mine = userId ? read<DocRecord>(userId, "documents") : [];
  return [...mine, ...DOC_SEED];
}

export function addDocument(userId: string, input: Omit<DocRecord, "id" | "updatedAt">) {
  const row: DocRecord = { ...input, id: `doc_${crypto.randomUUID()}`, updatedAt: new Date().toISOString() };
  write(userId, "documents", [row, ...read<DocRecord>(userId, "documents")]);
  return row;
}

export type CreditLedgerRow = {
  id: string;
  at: string;
  label: string;
  delta: number;
  status: "posted" | "reserved" | "released" | "refunded";
};

const LEDGER_SEED: CreditLedgerRow[] = [
  { id: "cr1", at: "2026-08-01T00:00:00Z", label: "Monthly subscription deposit", delta: 500, status: "posted" },
  { id: "cr2", at: "2026-08-18T14:22:00Z", label: "Property analysis (reserved)", delta: -40, status: "reserved" },
  { id: "cr3", at: "2026-08-18T14:23:12Z", label: "Property analysis (final)", delta: -28, status: "posted" },
  { id: "cr4", at: "2026-08-18T14:23:12Z", label: "Unused reservation released", delta: 12, status: "released" },
  { id: "cr5", at: "2026-08-19T09:01:00Z", label: "Failed estimate — refunded", delta: 15, status: "refunded" },
];

export function creditBalance() {
  return LEDGER_SEED.filter((r) => r.status === "posted" || r.status === "refunded" || r.status === "released")
    .reduce((s, r) => s + r.delta, 0);
}

export function creditLedger() {
  return LEDGER_SEED;
}

export function listProfessionals() {
  return PROFESSIONAL_SEED;
}

export type AccountProfile = {
  full_name: string;
  phone: string;
  primary_role: ProfileRoleId;
  secondary_roles: ProfileRoleId[];
  account_kind: "individual" | "company";
  language: string;
  service_area: string;
  company_name: string;
  license: string;
  insurance: string;
  categories: string[];
  consent_comms: boolean;
  consent_terms: boolean;
  onboarded: boolean;
  onboarding_step: number;
};

export const DEFAULT_ACCOUNT: AccountProfile = {
  full_name: "",
  phone: "",
  primary_role: "homeowner",
  secondary_roles: [],
  account_kind: "individual",
  language: "en",
  service_area: "",
  company_name: "",
  license: "",
  insurance: "",
  categories: [],
  consent_comms: false,
  consent_terms: false,
  onboarded: false,
  onboarding_step: 1,
};

export function loadDraft(userId: string): AccountProfile {
  const rows = read<AccountProfile>(userId, "account");
  return rows[0] ? { ...DEFAULT_ACCOUNT, ...rows[0] } : { ...DEFAULT_ACCOUNT };
}

export function saveDraft(userId: string, profile: AccountProfile) {
  write(userId, "account", [profile]);
}

export function verificationFor(role: ProfileRoleId): VerificationTierId[] {
  if (role === "homeowner") return ["identity"];
  if (role === "administrator") return ["identity", "boliviq_certified"];
  return ["unverified"];
}

export function categoryLabel(key: MarketplaceCategoryId) {
  return key;
}
