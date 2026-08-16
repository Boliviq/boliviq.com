import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PROVIDERS = ["openai", "twilio", "vapi", "retell", "zapier", "make", "n8n"] as const;

async function testProvider(provider: string, apiKey: string): Promise<string> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("OpenAI rejected that API key.");
    return "OpenAI key is valid.";
  }
  if (provider === "twilio") {
    const [sid, token] = apiKey.includes(":") ? apiKey.split(":", 2) : [apiKey, ""];
    if (!sid || !token) throw new Error("Twilio keys must be AccountSID:AuthToken.");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: `Basic ${btoa(`${sid}:${token}`)}` },
    });
    if (!res.ok) throw new Error("Twilio rejected that Account SID / Auth Token.");
    return "Twilio credentials are valid.";
  }
  if (provider === "vapi") {
    const res = await fetch("https://api.vapi.ai/assistant", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("Vapi rejected that API key.");
    return "Vapi key is valid.";
  }
  if (provider === "retell") {
    const res = await fetch("https://api.retellai.com/list-agents", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error("Retell rejected that API key.");
    return "Retell key is valid.";
  }
  if (provider === "zapier" || provider === "make" || provider === "n8n") {
    if (!apiKey.startsWith("http")) throw new Error("Paste the webhook URL from your automation tool.");
    const res = await fetch(apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "boliviq", event: "connection_test", at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("Webhook URL did not accept the test POST.");
    return "Webhook accepted a test event.";
  }
  throw new Error("Unknown provider");
}

export const listIntegrations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(() => ({}))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("integrations")
      .select("id, provider, status, updated_at")
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) =>
    z.object({
      provider: z.enum(PROVIDERS),
      apiKey: z.string().trim().min(8).max(2000),
    }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const detail = await testProvider(data.provider, data.apiKey);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("integrations")
      .select("id")
      .eq("user_id", context.userId)
      .eq("provider", data.provider)
      .maybeSingle();
    const row = {
      user_id: context.userId,
      provider: data.provider,
      status: "connected",
      config: { apiKey: data.apiKey, lastTest: detail },
      updated_at: new Date().toISOString(),
    };
    if (existing?.id) {
      const { error } = await supabaseAdmin.from("integrations").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("integrations").insert(row);
      if (error) throw new Error(error.message);
    }
    return { ok: true as const, detail };
  });

export const disconnectIntegration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((data: unknown) => z.object({ provider: z.enum(PROVIDERS) }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("integrations")
      .delete()
      .eq("user_id", context.userId)
      .eq("provider", data.provider);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
