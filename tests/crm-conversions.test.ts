import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CONVERSION_KINDS, PROPERTY_POST_TARGETS, canAdvancePipeline } from "../src/lib/canons";
import {
  advanceLeadStage,
  convertCompletedProjectToListing,
  convertLeadToProject,
  convertListingToLead,
  convertListingToProperty,
  convertPropertyPost,
} from "../src/lib/crm-conversions";

describe("CRM conversion law", () => {
  test("lists the connected lifecycle conversions", () => {
    expect(CONVERSION_KINDS.map((k) => k.id)).toContain("listing_to_lead");
    expect(CONVERSION_KINDS.map((k) => k.id)).toContain("lead_to_project");
    expect(CONVERSION_KINDS.map((k) => k.id)).toContain("project_to_listing");
    expect(PROPERTY_POST_TARGETS).toHaveLength(8);
  });

  test("rejects illegal pipeline jumps and allows valid ones", () => {
    expect(canAdvancePipeline("new", "attempting_contact")).toBe(true);
    expect(canAdvancePipeline("new", "closed")).toBe(false);
    expect(canAdvancePipeline("closed", "new")).toBe(false);
    expect(canAdvancePipeline("in_progress", "closed")).toBe(true);
    expect(canAdvancePipeline("dead", "lost")).toBe(true);
  });
});

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const enabled = !!URL && !!ANON;

async function makeUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `crm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
  const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

describe.runIf(enabled)("CRM property hub conversions (Supabase)", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
  });

  test("listing → lead → project → property stays owned and idempotent", async () => {
    const { data: listing, error: lErr } = await alice.client
      .from("marketplace_listings")
      .insert({
        user_id: alice.userId,
        title: "Hub duplex",
        description: "Conversion fixture",
        category: "investment",
        location: "Austin, TX",
        price: 240000,
        visibility: "public",
      })
      .select("id")
      .single();
    expect(lErr).toBeNull();

    const leadOnce = await convertListingToLead(alice.client, alice.userId, listing!.id);
    const leadAgain = await convertListingToLead(alice.client, alice.userId, listing!.id);
    expect(leadOnce.conversion).toBe("listing_to_lead");
    expect(leadAgain.toId).toBe(leadOnce.toId);
    expect(leadAgain.reused).toBe(true);

    const first = await convertLeadToProject(alice.client, alice.userId, leadOnce.toId);
    const again = await convertLeadToProject(alice.client, alice.userId, leadOnce.toId);
    expect(first.toId).toBe(again.toId);
    expect(again.reused).toBe(true);

    const { data: project } = await alice.client
      .from("projects")
      .select("id, property_id, listing_id")
      .eq("id", first.toId)
      .single();
    expect(project?.listing_id).toBe(listing!.id);
    expect(project?.property_id).toBeTruthy();

    const { data: property } = await alice.client
      .from("properties")
      .select("id, listing_id, user_id")
      .eq("id", project!.property_id!)
      .single();
    expect(property?.user_id).toBe(alice.userId);
    expect(property?.listing_id).toBe(listing!.id);

    const { data: conversions } = await alice.client
      .from("object_conversions")
      .select("conversion, from_id, to_id")
      .in("conversion", ["listing_to_lead", "lead_to_project", "lead_to_property"]);
    expect(
      conversions?.some((c) => c.conversion === "listing_to_lead" && c.to_id === leadOnce.toId),
    ).toBe(true);
    expect(
      conversions?.some((c) => c.conversion === "lead_to_project" && c.to_id === first.toId),
    ).toBe(true);
    expect(
      conversions?.some((c) => c.conversion === "lead_to_property" && c.to_id === property!.id),
    ).toBe(true);

    const { data: bobProject } = await bob.client
      .from("projects")
      .select("id")
      .eq("id", first.toId);
    expect(bobProject ?? []).toHaveLength(0);

    await expect(convertListingToLead(bob.client, bob.userId, listing!.id)).resolves.toBeTruthy();
    await expect(convertLeadToProject(bob.client, bob.userId, leadOnce.toId)).rejects.toThrow(
      /Lead not found/,
    );

    const { data: updatedLead } = await alice.client
      .from("leads")
      .select("status, project_id, property_id")
      .eq("id", leadOnce.toId)
      .single();
    expect(updatedLead?.status).toBe("in_progress");
    expect(updatedLead?.project_id).toBe(first.toId);
    expect(updatedLead?.property_id).toBe(property!.id);
  });

  test("illegal stage move fails; completed project can become a listing", async () => {
    const { data: lead } = await alice.client
      .from("leads")
      .insert({
        user_id: alice.userId,
        title: "Stage fixture",
        source: "manual",
        status: "new",
      })
      .select("id")
      .single();

    await expect(advanceLeadStage(alice.client, alice.userId, lead!.id, "closed")).rejects.toThrow(
      /Invalid pipeline move/,
    );
    const moved = await advanceLeadStage(
      alice.client,
      alice.userId,
      lead!.id,
      "attempting_contact",
    );
    expect(moved.to).toBe("attempting_contact");

    const { data: project } = await alice.client
      .from("projects")
      .insert({
        user_id: alice.userId,
        name: "Finished rehab",
        address: "100 Oak St",
        status: "new",
        budget: 50000,
      })
      .select("id")
      .single();

    await expect(
      convertCompletedProjectToListing(alice.client, alice.userId, project!.id),
    ).rejects.toThrow(/completed project/);

    await alice.client.from("projects").update({ status: "completed" }).eq("id", project!.id);
    const listing = await convertCompletedProjectToListing(alice.client, alice.userId, project!.id);
    const { data: row } = await alice.client
      .from("marketplace_listings")
      .select("category, title")
      .eq("id", listing.toId)
      .single();
    expect(row?.category).toBe("homes_for_sale");
    expect(row?.title).toMatch(/completed/);
  });

  test("property hub posts Canon 12 conversions and isolates them", async () => {
    const property = await convertListingToProperty(
      alice.client,
      alice.userId,
      (
        await alice.client
          .from("marketplace_listings")
          .insert({
            user_id: alice.userId,
            title: "Homeowner house",
            description: "Own record",
            category: "homes_for_sale",
            location: "Dallas, TX",
            price: 310000,
            visibility: "public",
          })
          .select("id")
          .single()
      ).data!.id,
    );

    const repair = await convertPropertyPost(
      alice.client,
      alice.userId,
      property.toId,
      "property_to_repair_request",
    );
    const again = await convertPropertyPost(
      alice.client,
      alice.userId,
      property.toId,
      "property_to_repair_request",
    );
    expect(again.toId).toBe(repair.toId);

    const { data: bobSees } = await bob.client
      .from("object_conversions")
      .select("id")
      .eq("from_id", property.toId);
    expect(bobSees ?? []).toHaveLength(0);
  });
});
