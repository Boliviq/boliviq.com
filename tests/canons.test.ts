import { describe, expect, test } from "vitest";
import {
  AI_AGENTS,
  AI_FORBIDDEN_ACTIONS,
  CANON_INDEX,
  INTEGRATIONS,
  LIFECYCLE,
  MARKETPLACE_CATEGORIES,
  PIPELINE_STAGES,
  PROFILE_ROLES,
  TRADES,
  TRADE_LABELS,
  VERIFICATION_DISCLAIMER,
  VERIFICATION_TIERS,
  dashboardForRole,
  mapLeadStatusToPipelineStage,
  navForRole,
} from "../src/lib/canons";

describe("Boliviq canons catalog", () => {
  test("includes all 19 canons", () => {
    expect(CANON_INDEX).toHaveLength(19);
  });

  test("defines 17 profile roles including homeowner and administrator", () => {
    expect(PROFILE_ROLES).toHaveLength(17);
    expect(PROFILE_ROLES.map((r) => r.id)).toContain("homeowner");
    expect(PROFILE_ROLES.map((r) => r.id)).toContain("administrator");
    expect(PROFILE_ROLES.find((r) => r.id === "homeowner")?.professional).toBe(false);
  });

  test("marketplace has the 20 primary categories", () => {
    expect(MARKETPLACE_CATEGORIES).toHaveLength(20);
    expect(MARKETPLACE_CATEGORIES[0].id).toBe("homes_for_sale");
    expect(MARKETPLACE_CATEGORIES.at(-1)?.id).toBe("education");
  });

  test("CRM pipeline has the 12 recommended stages", () => {
    expect(PIPELINE_STAGES).toHaveLength(12);
    expect(PIPELINE_STAGES.map((s) => s.key)).toEqual([
      "new",
      "attempting_contact",
      "contacted",
      "qualified",
      "appointment_scheduled",
      "proposal_created",
      "negotiating",
      "under_contract",
      "in_progress",
      "closed",
      "lost",
      "follow_up_later",
    ]);
  });

  test("legacy lead statuses map onto canon stages", () => {
    expect(mapLeadStatusToPipelineStage("offer_submitted")).toBe("proposal_created");
    expect(mapLeadStatusToPipelineStage("dead")).toBe("lost");
    expect(mapLeadStatusToPipelineStage("researching")).toBe("new");
    expect(mapLeadStatusToPipelineStage("closed")).toBe("closed");
  });

  test("verification tiers never imply a service guarantee", () => {
    expect(VERIFICATION_TIERS).toHaveLength(5);
    expect(VERIFICATION_DISCLAIMER.toLowerCase()).toMatch(
      /never imply.*guarantees a person's services/,
    );
  });

  test("AI agents are permissioned and cannot act autonomously on forbidden actions", () => {
    expect(AI_AGENTS).toHaveLength(10);
    expect(AI_FORBIDDEN_ACTIONS.map((a) => a.toLowerCase())).toEqual(
      expect.arrayContaining([
        "sign agreements",
        "move money",
        "make lending decisions",
        "publish listings without confirmation",
      ]),
    );
  });

  test("integrations stay modular with 16 catalog entries", () => {
    expect(INTEGRATIONS).toHaveLength(16);
    expect(INTEGRATIONS.map((i) => i.id)).toContain("stripe");
    expect(INTEGRATIONS.map((i) => i.id)).toContain("mls");
  });

  test("lifecycle and trades match construction + real estate canons", () => {
    expect(LIFECYCLE.map((s) => s.id)).toEqual([
      "find",
      "connect",
      "analyze",
      "finance",
      "repair",
      "manage",
    ]);
    expect(TRADE_LABELS.hvac).toBe("HVAC");
    expect(TRADES).toHaveLength(20);
  });

  test("every role gets a dashboard and marketplace in navigation", () => {
    for (const role of PROFILE_ROLES) {
      const dash = dashboardForRole(role.id);
      expect(dash.quickLinks.length).toBeGreaterThan(0);
      expect(navForRole(role.id).some((n) => n.url === "/marketplace")).toBe(true);
      expect(navForRole(role.id).some((n) => n.url === "/messages")).toBe(true);
    }
  });
});
