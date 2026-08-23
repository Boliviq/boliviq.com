import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { PLAN_TO_CANON_GROUP, SUBSCRIPTION_GROUPS } from "../src/lib/canons";
import { plans } from "../src/lib/plans";
import {
  attachMessageFile,
  inferThreadType,
  isWithinQuietHours,
  maySendOutbound,
  persistNotificationIntents,
  planOutboundIntents,
} from "../src/lib/communication";

describe("communication protocol", () => {
  test("infers canon thread types from linked records", () => {
    expect(inferThreadType({ project: "Oak rehab" })).toBe("project");
    expect(inferThreadType({ listingId: "abc" })).toBe("property");
    expect(inferThreadType({ participantCount: 3 })).toBe("group");
    expect(inferThreadType({})).toBe("direct");
  });

  test("quiet hours wrap midnight and skip when unset", () => {
    const evening = new Date("2026-08-23T03:00:00.000Z");
    expect(isWithinQuietHours(evening, "21:00", "07:00", "UTC")).toBe(true);
    expect(isWithinQuietHours(evening, "08:00", "17:00", "UTC")).toBe(false);
    expect(isWithinQuietHours(evening, null, null, "UTC")).toBe(false);
  });

  test("outbound email/SMS honor opt-out, consent, and quiet hours", () => {
    const prefs = {
      emailEnabled: true,
      smsEnabled: false,
      quietHoursStart: "00:00",
      quietHoursEnd: "23:59",
      timezone: "UTC",
      optedOutAt: null,
    };
    expect(maySendOutbound("in_app", prefs).allowed).toBe(true);
    expect(maySendOutbound("sms", prefs).reason).toBe("sms_disabled");
    expect(maySendOutbound("email", prefs).reason).toBe("quiet_hours");
    expect(
      maySendOutbound("email", { ...prefs, optedOutAt: new Date().toISOString() }).reason,
    ).toBe("opted_out");
  });

  test("plans in-app always and skips email during quiet hours", () => {
    const now = new Date("2026-08-23T03:00:00.000Z");
    const planned = planOutboundIntents(
      ["user-1"],
      {
        "user-1": {
          emailEnabled: true,
          smsEnabled: true,
          quietHoursStart: "21:00",
          quietHoursEnd: "07:00",
          timezone: "UTC",
          optedOutAt: null,
        },
      },
      now,
    );
    expect(planned.find((p) => p.channel === "in_app")?.status).toBe("queued");
    expect(planned.find((p) => p.channel === "email")?.skipReason).toBe("quiet_hours");
    expect(planned.find((p) => p.channel === "sms")?.skipReason).toBe("quiet_hours");
  });
});

describe("billing catalog mapping", () => {
  test("every sellable plan maps onto a Canon 8 group", () => {
    for (const plan of plans) {
      expect(SUBSCRIPTION_GROUPS).toContain(PLAN_TO_CANON_GROUP[plan.tier]);
    }
    expect(PLAN_TO_CANON_GROUP.free).toBe("Homeowner Free");
    expect(PLAN_TO_CANON_GROUP.professional_ai_max).toBe("Professional + AI");
  });
});

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const enabled = !!URL && !!ANON;

async function makeUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `comm_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
  const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

describe.runIf(enabled)("communication attachments and intents (Supabase)", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
  });

  test("sender attaches a file; recipient gets in-app intent and skipped SMS", async () => {
    const { data: convo, error } = await alice.client
      .from("conversations")
      .insert({
        created_by: alice.userId,
        title: "Scope photos",
        context: "Project",
        thread_type: "project",
      })
      .select("id")
      .single();
    expect(error).toBeNull();
    await alice.client.from("conversation_participants").insert([
      { conversation_id: convo!.id, user_id: alice.userId },
      { conversation_id: convo!.id, user_id: bob.userId },
    ]);

    const { data: message, error: mErr } = await alice.client
      .from("messages")
      .insert({
        conversation_id: convo!.id,
        sender_id: alice.userId,
        body: "Photos attached",
      })
      .select("id")
      .single();
    expect(mErr).toBeNull();

    const attached = await attachMessageFile(alice.client, alice.userId, {
      messageId: message!.id,
      storagePath: `${alice.userId}/${convo!.id}/scope.pdf`,
      fileName: "scope.pdf",
      contentType: "application/pdf",
      byteSize: 1024,
    });
    expect(attached.id).toBeTruthy();

    await expect(
      attachMessageFile(bob.client, bob.userId, {
        messageId: message!.id,
        storagePath: `${bob.userId}/${convo!.id}/hack.pdf`,
        fileName: "hack.pdf",
      }),
    ).rejects.toThrow(/Forbidden/);

    const { data: bobSees } = await bob.client
      .from("message_attachments")
      .select("file_name")
      .eq("message_id", message!.id);
    expect((bobSees ?? []).some((a) => a.file_name === "scope.pdf")).toBe(true);

    await persistNotificationIntents(
      alice.client,
      planOutboundIntents([bob.userId], {
        [bob.userId]: {
          emailEnabled: true,
          smsEnabled: false,
          quietHoursStart: null,
          quietHoursEnd: null,
          timezone: "UTC",
          optedOutAt: null,
        },
      }),
      convo!.id,
      message!.id,
    );

    const { data: intents } = await bob.client
      .from("notification_intents")
      .select("channel, status, skip_reason")
      .eq("message_id", message!.id);
    expect((intents ?? []).find((i) => i.channel === "in_app")?.status).toBe("queued");
    expect((intents ?? []).find((i) => i.channel === "email")?.status).toBe("queued");
    expect((intents ?? []).find((i) => i.channel === "sms")?.status).toBe("skipped");
    expect((intents ?? []).find((i) => i.channel === "sms")?.skip_reason).toBe("sms_disabled");

    const { data: aliceIntents } = await alice.client
      .from("notification_intents")
      .select("id")
      .eq("message_id", message!.id);
    expect(aliceIntents ?? []).toHaveLength(0);
  });
});
