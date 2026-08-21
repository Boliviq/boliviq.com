import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canUseAi, choosePaidSubscription, entitlementFromSubscription, type Entitlement } from "@/lib/entitlements";
import { summarizeTranscript } from "@/lib/call-scripts";

async function loadEntitlement(userId: string, supabase: any): Promise<Entitlement> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const [{ data: isAdmin }, { data: sub }, { count }] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabaseAdmin
      .from("subscriptions")
      .select("plan, status, stripe_customer_id, current_period_end, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    (supabaseAdmin as any)
      .from("ai_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString()),
  ]);
  const rows = (sub ?? []) as any[];
  const chosen = choosePaidSubscription(rows);
  return entitlementFromSubscription({
    subscription: chosen,
    isAdmin: !!isAdmin,
    creditsUsed: count ?? 0,
  });
}

async function resolveOpenAiKey(userId: string): Promise<string | null> {
  const envKey = process.env.OPENAI_API_KEY?.trim();
  if (envKey) return envKey;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("integrations")
    .select("config, status")
    .eq("user_id", userId)
    .eq("provider", "openai")
    .maybeSingle();
  const key = (data as any)?.config?.apiKey;
  return typeof key === "string" && key.trim() ? key.trim() : null;
}

async function recordUsage(userId: string, kind: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await (supabaseAdmin as any).from("ai_usage").insert({ user_id: userId, kind });
}

async function chat(apiKey: string, model: string, system: string, user: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI request failed (${res.status}): ${body.slice(0, 280)}`);
  }
  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI returned an empty response.");
  return text;
}

function assertAi(ent: Entitlement) {
  if (ent.ai === "none") {
    throw new Error("AI features are included on Professional and higher plans. Upgrade in Billing to enable them.");
  }
  if (!canUseAi(ent)) {
    throw new Error("You have used this period's Boliviq Credits. Upgrade or wait until the next billing period.");
  }
}

export const summarizeCallAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ transcript: z.string().trim().min(20).max(20000) }).parse(data))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlement(context.userId, context.supabase);
    const fallback = summarizeTranscript(data.transcript);
    const apiKey = await resolveOpenAiKey(context.userId);
    if (ent.ai === "none" || !apiKey) {
      return { provider: "rules" as const, ...fallback, upgradeRequired: ent.ai === "none" };
    }
    assertAi(ent);
    const model = ent.ai === "max" ? "gpt-4o" : "gpt-4o-mini";
    const raw = await chat(
      apiKey,
      model,
      "You are a real-estate acquisitions assistant. Return compact JSON only, no markdown.",
      `Summarize this call transcript into JSON with keys:
property_condition, seller_motivation, agent_comments, price_flexibility, existing_offers,
preferred_closing, financing_openness, repairs_mentioned, tenant_info, title_concerns,
recommended_next, tasks (array of 3-6 short follow-up task titles).
Transcript:\n${data.transcript}`,
    );
    let parsed: any = fallback.summary;
    let tasks = fallback.tasks;
    try {
      const json = JSON.parse(raw.replace(/^```json\s*|\s*```$/g, ""));
      parsed = json;
      tasks = Array.isArray(json.tasks) ? json.tasks.map(String) : tasks;
      delete parsed.tasks;
    } catch {
      parsed = { ...fallback.summary, narrative: raw };
    }
    await recordUsage(context.userId, "call_summary");
    return { provider: "openai" as const, summary: parsed, tasks, upgradeRequired: false };
  });

export const generateCallScriptAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    contactType: z.string().min(1).max(80),
    purpose: z.string().min(1).max(80),
    tone: z.string().min(1).max(40),
    propertyAddress: z.string().max(200).optional(),
    yourName: z.string().max(80).optional(),
    companyName: z.string().max(80).optional(),
    extra: z.string().max(2000).optional(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlement(context.userId, context.supabase);
    assertAi(ent);
    const apiKey = await resolveOpenAiKey(context.userId);
    if (!apiKey) throw new Error("Add an OpenAI API key in Integrations, or set OPENAI_API_KEY on the server.");
    const model = ent.ai === "max" ? "gpt-4o" : "gpt-4o-mini";
    const script = await chat(
      apiKey,
      model,
      "You write concise, compliant real-estate call scripts. No guarantees of profit. Do not invent facts.",
      `Write a ${data.tone} call script for a ${data.contactType} about ${data.purpose}.
Caller: ${data.yourName || "the investor"} at ${data.companyName || "their company"}.
Property: ${data.propertyAddress || "not specified"}.
Notes: ${data.extra || "none"}.
Include a short intro, 8 numbered questions, and a close.`,
    );
    await recordUsage(context.userId, "call_script");
    return { script };
  });

export const analyzeDealAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    address: z.string().max(200).optional(),
    purchasePrice: z.number(),
    arv: z.number(),
    rehab: z.number(),
    flipProfit: z.number(),
    cashFlow: z.number(),
    capRate: z.number(),
    score: z.number(),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlement(context.userId, context.supabase);
    assertAi(ent);
    const apiKey = await resolveOpenAiKey(context.userId);
    if (!apiKey) throw new Error("Add an OpenAI API key in Integrations, or set OPENAI_API_KEY on the server.");
    const model = ent.ai === "max" ? "gpt-4o" : "gpt-4o-mini";
    const narrative = await chat(
      apiKey,
      model,
      "You are a conservative real-estate underwriter. Be specific, mention risks, and never promise returns.",
      `Write a 4-paragraph investor memo for ${data.address || "this property"}.
Purchase ${data.purchasePrice}, ARV ${data.arv}, rehab ${data.rehab},
flip profit ${data.flipProfit}, monthly cash flow ${data.cashFlow}, cap rate ${data.capRate},
rule-based score ${data.score}/100.`,
    );
    await recordUsage(context.userId, "deal_analysis");
    return { narrative };
  });

export const generateReportAi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({
    address: z.string().max(200),
    summary: z.string().max(4000),
  }).parse(data))
  .handler(async ({ data, context }) => {
    const ent = await loadEntitlement(context.userId, context.supabase);
    assertAi(ent);
    const apiKey = await resolveOpenAiKey(context.userId);
    if (!apiKey) throw new Error("Add an OpenAI API key in Integrations, or set OPENAI_API_KEY on the server.");
    const narrative = await chat(
      apiKey,
      ent.ai === "max" ? "gpt-4o" : "gpt-4o-mini",
      "Write a lender-ready deal summary. Neutral tone. Label estimates as estimates.",
      `Property: ${data.address}\n${data.summary}`,
    );
    await recordUsage(context.userId, "report");
    return { narrative };
  });
