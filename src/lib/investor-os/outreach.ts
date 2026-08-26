/** Owner outreach helpers with suppression / compliance guardrails. */

export type OutreachChannel = "phone" | "ai_call" | "sms" | "email" | "direct_mail" | "postcard";

export function isSuppressed(
  suppressions: Array<{ channel: string; destination: string }>,
  channel: OutreachChannel,
  destination: string,
): { suppressed: boolean; reason?: string } {
  const dest = destination.trim().toLowerCase();
  const hit = suppressions.find(
    (s) => s.channel === channel && s.destination.trim().toLowerCase() === dest,
  );
  if (hit) return { suppressed: true, reason: "Destination is on suppression / opt-out list" };
  return { suppressed: false };
}

export function withinCallingHours(
  now = new Date(),
  timeZoneOffsetHours = -5,
): { ok: boolean; reason?: string } {
  // Simple policy: 9am–8pm local (offset configurable); not a substitute for state-specific rules.
  const localHour = (now.getUTCHours() + timeZoneOffsetHours + 24) % 24;
  if (localHour < 9 || localHour >= 20) {
    return { ok: false, reason: "Outside default calling hours (9am–8pm local policy)" };
  }
  return { ok: true };
}

export function draftOwnerOutreach(opts: {
  ownerName?: string | null;
  address?: string | null;
  channel: OutreachChannel;
  mentionDistress: boolean;
}): { body: string; complianceNote: string } {
  const name = opts.ownerName?.split(" ")[0] || "there";
  const address = opts.address || "your property";
  const complianceNote =
    "Do not claim foreclosure/tax distress unless legally permissible and policy-approved. Respect TCPA/DNC/SMS consent/email rules.";

  if (opts.channel === "sms") {
    return {
      body: `Hi ${name} — investors interested in ${address}. If a flexible cash option would help, reply YES. Opt out: STOP.`,
      complianceNote,
    };
  }
  if (opts.channel === "email") {
    return {
      body: `Subject: Options for ${address}\n\nHi ${name},\n\nI help owners evaluate straightforward sale options on their timeline. If a no-obligation cash conversation would be useful for ${address}, I’m happy to share a range.\n\nBest regards`,
      complianceNote,
    };
  }
  if (opts.channel === "direct_mail" || opts.channel === "postcard") {
    return {
      body: `Dear Property Owner,\n\nI’m an investor interested in ${address}. If you’d like a straightforward cash offer, call or text [phone].\n\nSincerely,\n[Name]`,
      complianceNote,
    };
  }
  // phone / ai_call — never auto-mention foreclosure
  const distressLine = opts.mentionDistress
    ? "\n(INFERENCE/POLICY GATE: distress mention blocked by default — enable only with compliance approval.)"
    : "";
  return {
    body: `Hi ${name}, this is [Name] with Boliviq investors. I’m reaching out about ${address}. I work with owners who want a flexible cash option — is now a bad time?${distressLine}`,
    complianceNote,
  };
}
