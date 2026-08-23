import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachMessageFile } from "@/lib/communication";

export const attachMessageFileFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z
      .object({
        messageId: z.string().uuid(),
        storagePath: z.string().trim().min(3).max(500),
        fileName: z.string().trim().min(1).max(200),
        contentType: z.string().trim().max(120).optional(),
        byteSize: z.number().int().positive().max(10_485_760).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => attachMessageFile(context.supabase, context.userId, data));
