import {
  MARKETPLACE_CATEGORIES,
  type MarketplaceCategoryId,
  type ProfileRoleId,
  type VerificationTierId,
} from "@/lib/canons";
import type { SeedListing } from "@/lib/marketplace-seed";

/**
 * Shared view-model types for canon workspace records.
 * Persistence lives in `workspace.functions.ts` (Supabase + RLS).
 */

export type MarketplaceListing = SeedListing & {
  priceLabel?: string;
  authorName?: string;
  authorRole?: ProfileRoleId;
  visibility?: "public" | "limited";
  expiresAt?: string;
  ownerId?: string;
};

export type Thread = {
  id: string;
  title: string;
  context: string;
  participants: string[];
  lastMessage: string;
  updatedAt: string;
  unread: number;
  property?: string;
  project?: string;
  listing?: string;
  listingId?: string;
  messages: { id: string; from: string; body: string; at: string; mine?: boolean }[];
};

export type ConversationExtras = {
  property?: string;
  project?: string;
  listing?: string;
  listingId?: string;
  participants?: string[];
  participantUserId?: string;
};

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

export type DocRecord = {
  id: string;
  name: string;
  kind: string;
  related: string;
  restricted: boolean;
  updatedAt: string;
};

export type CreditLedgerRow = {
  id: string;
  at: string;
  label: string;
  delta: number;
  status: "posted" | "reserved" | "released" | "refunded" | "adjustment";
};

export type DirectoryProfessional = {
  id: string;
  userId?: string;
  name: string;
  company: string;
  role: ProfileRoleId;
  serviceArea: string;
  specialties: string[];
  license?: string;
  insurance?: string;
  bio: string;
  source: "db" | "seed";
  rating?: number;
  reviews?: number;
  responseTime?: string;
  years?: number;
  trades?: string[];
  tiers: VerificationTierId[];
};

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

export type AssistantTurn = { role: "user" | "assistant"; text: string };

export function mergeById<T extends { id: string }>(...groups: T[][]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const group of groups) {
    for (const row of group) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);
      out.push(row);
    }
  }
  return out;
}

export function verificationFor(role: ProfileRoleId): VerificationTierId[] {
  if (role === "homeowner") return ["identity"];
  if (role === "administrator") return ["identity", "boliviq_certified"];
  return ["unverified"];
}

export function categoryLabel(key: MarketplaceCategoryId) {
  return MARKETPLACE_CATEGORIES.find((c) => c.id === key)?.label ?? key;
}
