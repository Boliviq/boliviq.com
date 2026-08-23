import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationThreadTypeId, NotificationChannelId } from "@/lib/canons";

export type NotificationPreferenceView = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  timezone: string;
  optedOutAt: string | null;
};

export function inferThreadType(input: {
  property?: string | null;
  project?: string | null;
  listingId?: string | null;
  participantCount?: number;
}): ConversationThreadTypeId {
  if (input.project) return "project";
  if (input.property || input.listingId) return "property";
  if ((input.participantCount ?? 0) > 2) return "group";
  return "direct";
}

function timeToMinutes(value: string): number | null {
  const match = /^([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function minutesInTimeZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

/** True when `now` falls in [start, end), including ranges that wrap midnight. */
export function isWithinQuietHours(
  now: Date,
  start: string | null | undefined,
  end: string | null | undefined,
  timeZone = "UTC",
): boolean {
  if (!start || !end) return false;
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null) return false;
  const nowMin = minutesInTimeZone(now, timeZone);
  if (startMin === endMin) return true;
  if (startMin < endMin) return nowMin >= startMin && nowMin < endMin;
  return nowMin >= startMin || nowMin < endMin;
}

export function maySendOutbound(
  channel: NotificationChannelId,
  prefs: NotificationPreferenceView,
  now = new Date(),
): { allowed: boolean; reason: string } {
  if (channel === "in_app") return { allowed: true, reason: "in_app" };
  if (prefs.optedOutAt) return { allowed: false, reason: "opted_out" };
  if (channel === "email" && !prefs.emailEnabled) {
    return { allowed: false, reason: "email_disabled" };
  }
  if (channel === "sms" && !prefs.smsEnabled) {
    return { allowed: false, reason: "sms_disabled" };
  }
  if (isWithinQuietHours(now, prefs.quietHoursStart, prefs.quietHoursEnd, prefs.timezone)) {
    return { allowed: false, reason: "quiet_hours" };
  }
  return { allowed: true, reason: "ok" };
}

const DEFAULT_PREFS: NotificationPreferenceView = {
  emailEnabled: true,
  smsEnabled: false,
  quietHoursStart: null,
  quietHoursEnd: null,
  timezone: "America/Chicago",
  optedOutAt: null,
};

export type PlannedNotificationIntent = {
  userId: string;
  channel: NotificationChannelId;
  status: "queued" | "skipped";
  skipReason: string | null;
};

export function planOutboundIntents(
  recipientIds: string[],
  prefsByUser: Record<string, NotificationPreferenceView>,
  now = new Date(),
): PlannedNotificationIntent[] {
  const channels: NotificationChannelId[] = ["in_app", "email", "sms"];
  return recipientIds.flatMap((userId) => {
    const prefs = prefsByUser[userId] ?? DEFAULT_PREFS;
    return channels.map((channel) => {
      const result = maySendOutbound(channel, prefs, now);
      return {
        userId,
        channel,
        status: result.allowed ? ("queued" as const) : ("skipped" as const),
        skipReason: result.allowed ? null : result.reason,
      };
    });
  });
}

export async function persistNotificationIntents(
  supabase: SupabaseClient,
  intents: PlannedNotificationIntent[],
  conversationId: string,
  messageId: string,
): Promise<void> {
  if (intents.length === 0) return;
  const { error } = await supabase.from("notification_intents").insert(
    intents.map((intent) => ({
      user_id: intent.userId,
      channel: intent.channel,
      status: intent.status,
      skip_reason: intent.skipReason,
      conversation_id: conversationId,
      message_id: messageId,
      payload: { source: "message" },
    })),
  );
  if (error) throw new Error(error.message);
}

export async function attachMessageFile(
  supabase: SupabaseClient,
  userId: string,
  input: {
    messageId: string;
    storagePath: string;
    fileName: string;
    contentType?: string;
    byteSize?: number;
  },
): Promise<{ id: string }> {
  const { data: message, error: readErr } = await supabase
    .from("messages")
    .select("id, sender_id")
    .eq("id", input.messageId)
    .maybeSingle();
  if (readErr) throw new Error(readErr.message);
  if (!message) throw new Error("Message not found");
  if (message.sender_id !== userId) throw new Error("Forbidden");

  const { data, error } = await supabase
    .from("message_attachments")
    .insert({
      message_id: input.messageId,
      storage_path: input.storagePath,
      file_name: input.fileName,
      content_type: input.contentType ?? null,
      byte_size: input.byteSize ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return { id: data.id };
}
