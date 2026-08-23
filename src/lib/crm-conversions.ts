import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CONVERSION_KINDS,
  PROPERTY_POST_TARGETS,
  canAdvancePipeline,
  mapLeadStatusToPipelineStage,
  type ConversionKindId,
  type PipelineStageKey,
  type PropertyPostTargetId,
} from "@/lib/canons";

export type ConversionResult = {
  conversion: ConversionKindId;
  fromId: string;
  toId: string;
  reused: boolean;
};

type ConversionRow = {
  conversion: string;
  from_kind: string;
  from_id: string;
  to_kind: string;
  to_id: string;
};

function kindMeta(id: ConversionKindId) {
  const found = CONVERSION_KINDS.find((k) => k.id === id);
  if (!found) throw new Error(`Unknown conversion ${id}`);
  return found;
}

async function existingConversion(
  supabase: SupabaseClient,
  userId: string,
  conversion: ConversionKindId,
  fromId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("object_conversions")
    .select("to_id")
    .eq("user_id", userId)
    .eq("conversion", conversion)
    .eq("from_id", fromId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data?.to_id ?? null;
}

export async function recordConversion(
  supabase: SupabaseClient,
  userId: string,
  conversion: ConversionKindId,
  fromId: string,
  toId: string,
): Promise<void> {
  const meta = kindMeta(conversion);
  const row: ConversionRow & { user_id: string } = {
    user_id: userId,
    conversion,
    from_kind: meta.from,
    from_id: fromId,
    to_kind: meta.to,
    to_id: toId,
  };
  const { error } = await supabase.from("object_conversions").insert(row);
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    throw new Error(error.message);
  }
}

function parseLocation(location: string | null | undefined): {
  city: string | null;
  state: string | null;
} {
  if (!location) return { city: null, state: null };
  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts[1] };
  return { city: parts[0] ?? null, state: null };
}

async function requireOwnLead(supabase: SupabaseClient, userId: string, leadId: string) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, user_id, title, listing_id, property_id, project_id, status, opportunity_value, source",
    )
    .eq("id", leadId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Lead not found");
  return data;
}

async function requireOwnProject(supabase: SupabaseClient, userId: string, projectId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("id, user_id, name, address, status, listing_id, property_id, budget")
    .eq("id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Project not found");
  return data;
}

async function requireOwnProperty(supabase: SupabaseClient, userId: string, propertyId: string) {
  const { data, error } = await supabase
    .from("properties")
    .select("id, user_id, address, city, state, list_price, listing_id")
    .eq("id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Property not found");
  return data;
}

async function loadListing(supabase: SupabaseClient, listingId: string) {
  const { data, error } = await supabase
    .from("marketplace_listings")
    .select("id, title, location, price, category, details")
    .eq("id", listingId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Listing not found");
  return data;
}

export async function convertListingToProperty(
  supabase: SupabaseClient,
  userId: string,
  listingId: string,
): Promise<ConversionResult> {
  const reusedId = await existingConversion(supabase, userId, "listing_to_property", listingId);
  if (reusedId)
    return { conversion: "listing_to_property", fromId: listingId, toId: reusedId, reused: true };

  const listing = await loadListing(supabase, listingId);
  const loc = parseLocation(listing.location);
  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      address: listing.location || listing.title,
      city: loc.city,
      state: loc.state,
      list_price: listing.price,
      source: "marketplace",
      notes: listing.title,
      listing_id: listing.id,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await recordConversion(supabase, userId, "listing_to_property", listingId, property.id);
  return { conversion: "listing_to_property", fromId: listingId, toId: property.id, reused: false };
}

export async function convertLeadToProperty(
  supabase: SupabaseClient,
  userId: string,
  leadId: string,
): Promise<ConversionResult> {
  const reusedId = await existingConversion(supabase, userId, "lead_to_property", leadId);
  if (reusedId)
    return { conversion: "lead_to_property", fromId: leadId, toId: reusedId, reused: true };

  const lead = await requireOwnLead(supabase, userId, leadId);
  let propertyId = lead.property_id;
  if (!propertyId && lead.listing_id) {
    propertyId = (await convertListingToProperty(supabase, userId, lead.listing_id)).toId;
  }
  if (!propertyId) {
    const { data: property, error } = await supabase
      .from("properties")
      .insert({
        user_id: userId,
        address: lead.title || "Untitled property",
        source: lead.source || "crm",
        list_price: lead.opportunity_value,
        status: "active",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    propertyId = property.id;
  }
  await supabase
    .from("leads")
    .update({ property_id: propertyId })
    .eq("id", leadId)
    .eq("user_id", userId);
  await recordConversion(supabase, userId, "lead_to_property", leadId, propertyId);
  return { conversion: "lead_to_property", fromId: leadId, toId: propertyId, reused: false };
}

export async function convertLeadToProject(
  supabase: SupabaseClient,
  userId: string,
  leadId: string,
): Promise<ConversionResult> {
  const reusedId = await existingConversion(supabase, userId, "lead_to_project", leadId);
  if (reusedId)
    return { conversion: "lead_to_project", fromId: leadId, toId: reusedId, reused: true };

  const lead = await requireOwnLead(supabase, userId, leadId);
  if (lead.project_id) {
    await recordConversion(supabase, userId, "lead_to_project", leadId, lead.project_id);
    return { conversion: "lead_to_project", fromId: leadId, toId: lead.project_id, reused: true };
  }

  let propertyId = lead.property_id;
  if (!propertyId) {
    propertyId = (await convertLeadToProperty(supabase, userId, leadId)).toId;
  }

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: lead.title || "Project",
      address: lead.title,
      status: "new",
      listing_id: lead.listing_id,
      property_id: propertyId,
      budget: lead.opportunity_value,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  await supabase
    .from("leads")
    .update({ project_id: project.id, property_id: propertyId, status: "in_progress" })
    .eq("id", leadId)
    .eq("user_id", userId);
  await recordConversion(supabase, userId, "lead_to_project", leadId, project.id);
  return { conversion: "lead_to_project", fromId: leadId, toId: project.id, reused: false };
}

export async function convertProjectToProperty(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
): Promise<ConversionResult> {
  const reusedId = await existingConversion(supabase, userId, "project_to_property", projectId);
  if (reusedId)
    return { conversion: "project_to_property", fromId: projectId, toId: reusedId, reused: true };

  const project = await requireOwnProject(supabase, userId, projectId);
  if (project.property_id) {
    await recordConversion(supabase, userId, "project_to_property", projectId, project.property_id);
    return {
      conversion: "project_to_property",
      fromId: projectId,
      toId: project.property_id,
      reused: true,
    };
  }

  const { data: property, error } = await supabase
    .from("properties")
    .insert({
      user_id: userId,
      address: project.address || project.name,
      source: "project",
      list_price: project.budget,
      listing_id: project.listing_id,
      status: "active",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase
    .from("projects")
    .update({ property_id: property.id })
    .eq("id", projectId)
    .eq("user_id", userId);
  await recordConversion(supabase, userId, "project_to_property", projectId, property.id);
  return { conversion: "project_to_property", fromId: projectId, toId: property.id, reused: false };
}

export async function convertCompletedProjectToListing(
  supabase: SupabaseClient,
  userId: string,
  projectId: string,
  disposition: "homes_for_sale" | "rentals" = "homes_for_sale",
): Promise<ConversionResult> {
  const reusedId = await existingConversion(supabase, userId, "project_to_listing", projectId);
  if (reusedId)
    return { conversion: "project_to_listing", fromId: projectId, toId: reusedId, reused: true };

  const project = await requireOwnProject(supabase, userId, projectId);
  if (project.status !== "completed") {
    throw new Error("Only a completed project can become a new listing.");
  }

  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      user_id: userId,
      title: `${project.name} — completed`,
      description: "Created from a completed Boliviq project.",
      category: disposition,
      location: project.address ?? "",
      price: project.budget,
      visibility: "public",
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { projectLabel: project.name },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await recordConversion(supabase, userId, "project_to_listing", projectId, listing.id);
  return { conversion: "project_to_listing", fromId: projectId, toId: listing.id, reused: false };
}

export async function convertPropertyPost(
  supabase: SupabaseClient,
  userId: string,
  propertyId: string,
  target: PropertyPostTargetId,
): Promise<ConversionResult> {
  const spec = PROPERTY_POST_TARGETS.find((t) => t.id === target);
  if (!spec) throw new Error("Unknown property conversion target");
  const reusedId = await existingConversion(supabase, userId, target, propertyId);
  if (reusedId) return { conversion: target, fromId: propertyId, toId: reusedId, reused: true };

  const property = await requireOwnProperty(supabase, userId, propertyId);
  const { data: listing, error } = await supabase
    .from("marketplace_listings")
    .insert({
      user_id: userId,
      title: `${property.address} — ${spec.label}`,
      description: `Property hub conversion: ${spec.label}`,
      category: spec.category,
      location: [property.city, property.state].filter(Boolean).join(", ") || property.address,
      price: property.list_price,
      visibility: spec.visibility,
      expires_at: new Date(Date.now() + 30 * 86400000).toISOString(),
      details: { propertyLabel: property.address },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  if (!property.listing_id) {
    await supabase
      .from("properties")
      .update({ listing_id: listing.id })
      .eq("id", propertyId)
      .eq("user_id", userId);
  }
  await recordConversion(supabase, userId, target, propertyId, listing.id);
  return { conversion: target, fromId: propertyId, toId: listing.id, reused: false };
}

export async function advanceLeadStage(
  supabase: SupabaseClient,
  userId: string,
  leadId: string,
  toStatus: PipelineStageKey,
): Promise<{ from: PipelineStageKey; to: PipelineStageKey }> {
  const lead = await requireOwnLead(supabase, userId, leadId);
  const from = mapLeadStatusToPipelineStage(lead.status);
  if (!canAdvancePipeline(from, toStatus)) {
    throw new Error(`Invalid pipeline move: ${from} → ${toStatus}`);
  }
  const { error } = await supabase
    .from("leads")
    .update({ status: toStatus })
    .eq("id", leadId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  return { from, to: toStatus };
}
