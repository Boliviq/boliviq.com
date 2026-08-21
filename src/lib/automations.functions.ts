import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const triggerSchema = z.enum([
  "lead_created",
  "score_over",
  "call_completed",
  "offer_submitted",
  "no_activity",
  "price_changed",
]);

export const dispatchAutomationEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      trigger: triggerSchema,
      automationId: z.string().uuid().optional(),
      payload: z.object({
        leadId: z.string().uuid().optional(),
        propertyId: z.string().uuid().optional(),
        score: z.number().optional(),
        previousPrice: z.number().nullable().optional(),
        price: z.number().nullable().optional(),
      }).optional(),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("automations")
      .select("*")
      .eq("user_id", context.userId)
      .eq("trigger_type", data.trigger);
    if (data.automationId) {
      query = query.eq("id", data.automationId);
    } else {
      query = query.eq("enabled", true);
    }
    const { data: rules, error } = await query;
    if (error) throw new Error(error.message);

    const ran: string[] = [];
    for (const rule of rules ?? []) {
      const condition = (rule.condition ?? {}) as { threshold?: number; days?: number };
      if (data.trigger === "score_over" && (data.payload?.score ?? 0) < (condition.threshold ?? 80)) continue;

      const config = (rule.action_config ?? {}) as { title?: string; days?: number; message?: string };
      try {
        if (rule.action_type === "create_task") {
          await supabaseAdmin.from("tasks").insert({
            user_id: context.userId,
            title: config.title || rule.name,
            description: config.message || `Automation: ${rule.name}`,
            status: "pending",
            priority: "medium",
            property_id: data.payload?.propertyId ?? null,
            lead_id: data.payload?.leadId ?? null,
            due_at: config.days
              ? new Date(Date.now() + config.days * 86400000).toISOString()
              : null,
          } as any);
        } else if (rule.action_type === "mark_hot") {
          if (data.payload?.leadId) {
            await supabaseAdmin.from("leads").update({ hot: true } as any).eq("id", data.payload.leadId).eq("user_id", context.userId);
          }
          if (data.payload?.propertyId) {
            await supabaseAdmin.from("properties").update({ status: "hot" } as any).eq("id", data.payload.propertyId).eq("user_id", context.userId);
          }
        } else if (rule.action_type === "notify_user" || rule.action_type === "send_reminder") {
          await supabaseAdmin.from("tasks").insert({
            user_id: context.userId,
            title: config.title || config.message || rule.name,
            description: `Reminder from automation "${rule.name}"`,
            status: "pending",
            priority: "high",
            property_id: data.payload?.propertyId ?? null,
            lead_id: data.payload?.leadId ?? null,
            due_at: new Date(Date.now() + (config.days ?? 1) * 86400000).toISOString(),
          } as any);
        } else if (rule.action_type === "add_tag" && data.payload?.propertyId) {
          const { data: prop } = await supabaseAdmin
            .from("properties")
            .select("notes")
            .eq("id", data.payload.propertyId)
            .maybeSingle();
          const tag = `\n[automation:${rule.name}]`;
          const notes = `${(prop as any)?.notes ?? ""}${tag}`;
          await supabaseAdmin.from("properties").update({ notes } as any).eq("id", data.payload.propertyId);
        }

        await supabaseAdmin
          .from("automations")
          .update({
            run_count: (rule.run_count ?? 0) + 1,
            last_run_at: new Date().toISOString(),
          } as any)
          .eq("id", rule.id);
        ran.push(rule.name);
      } catch (e) {
        console.error("[boliviq] automation failed", rule.id, e);
      }
    }
    return { ran };
  });
