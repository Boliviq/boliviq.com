import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const submitContactForm = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({
      name: z.string().trim().min(1).max(100),
      email: z.string().trim().email().max(255),
      message: z.string().trim().min(10).max(2000),
      kind: z.enum(["contact", "demo"]).optional(),
    }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("inbound_submissions").insert({
      kind: data.kind ?? "contact",
      name: data.name,
      email: data.email,
      subject: data.kind === "demo" ? "Demo request" : "Contact form",
      body: data.message,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
