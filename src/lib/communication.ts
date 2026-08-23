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
