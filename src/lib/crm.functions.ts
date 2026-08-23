import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PROPERTY_POST_TARGETS, type PipelineStageKey } from "@/lib/canons";
import {
  advanceLeadStage,
  convertCompletedProjectToListing,
  convertLeadToProject,
  convertLeadToProperty,
  convertListingToProperty,
  convertProjectToProperty,
  convertPropertyPost,
  type ConversionResult,
} from "@/lib/crm-conversions";

const idInput = z.object({ id: z.string().uuid() });

export const convertListingToPropertyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => idInput.parse(d))
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertListingToProperty(context.supabase, context.userId, data.id),
  );

export const convertLeadToPropertyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => idInput.parse(d))
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertLeadToProperty(context.supabase, context.userId, data.id),
  );

export const convertLeadToProjectFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => idInput.parse(d))
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertLeadToProject(context.supabase, context.userId, data.id),
  );

export const convertProjectToPropertyFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => idInput.parse(d))
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertProjectToProperty(context.supabase, context.userId, data.id),
  );

export const convertCompletedProjectToListingFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        disposition: z.enum(["homes_for_sale", "rentals"]).optional(),
      })
      .parse(d),
  )
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertCompletedProjectToListing(context.supabase, context.userId, data.id, data.disposition),
  );

export const convertPropertyPostFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        target: z.enum(
          PROPERTY_POST_TARGETS.map((t) => t.id) as [
            (typeof PROPERTY_POST_TARGETS)[number]["id"],
            ...(typeof PROPERTY_POST_TARGETS)[number]["id"][],
          ],
        ),
      })
      .parse(d),
  )
  .handler(
    async ({ data, context }): Promise<ConversionResult> =>
      convertPropertyPost(context.supabase, context.userId, data.id, data.target),
  );

export const advanceLeadStageFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({ id: z.string().uuid(), to: z.string().min(1).max(40) }).parse(d),
  )
  .handler(async ({ data, context }) =>
    advanceLeadStage(context.supabase, context.userId, data.id, data.to as PipelineStageKey),
  );
