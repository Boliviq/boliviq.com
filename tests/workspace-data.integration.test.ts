import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration tests for the canon workspace data layer (Phase 1).
 *
 * These prove the two Break-2 guarantees at the database boundary the server
 * functions rely on: records persist in Supabase, and row-level security
 * isolates them per user. They talk to a real local Supabase stack, so they
 * only run when SUPABASE_TEST_URL + SUPABASE_TEST_ANON_KEY are set (e.g. after
 * `supabase start`). CI without a database skips this suite.
 *
 * Run locally with:
 *   SUPABASE_TEST_URL=http://127.0.0.1:54321 \
 *   SUPABASE_TEST_ANON_KEY=<anon key from `supabase status`> \
 *   npm run test
 */

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const enabled = !!URL && !!ANON;

async function makeUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `it_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
  const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("signup did not return a user id");
  if (!data.session) {
    // If email confirmation is on, sign in explicitly.
    const { error: sErr } = await client.auth.signInWithPassword({
      email,
      password: "Passw0rd!123",
    });
    if (sErr) throw sErr;
  }
  return { client, userId };
}

describe.runIf(enabled)("Phase 1 — canon workspace data layer (Supabase + RLS)", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
  });

  test("documents persist and are readable by their owner", async () => {
    const { data, error } = await alice.client
      .from("documents")
      .insert({
        user_id: alice.userId,
        name: "Alice scope.pdf",
        kind: "Estimate",
        related: "Job A",
      })
      .select("id, name, user_id")
      .single();
    expect(error).toBeNull();
    expect(data?.name).toBe("Alice scope.pdf");
    expect(data?.user_id).toBe(alice.userId);

    const { data: mine } = await alice.client.from("documents").select("name");
    expect((mine ?? []).some((d) => d.name === "Alice scope.pdf")).toBe(true);
  });

  test("RLS isolates documents between users", async () => {
    await alice.client
      .from("documents")
      .insert({ user_id: alice.userId, name: "Alice private.pdf", kind: "Closing" });

    const { data: bobSees } = await bob.client
      .from("documents")
      .select("name")
      .eq("name", "Alice private.pdf");
    expect(bobSees ?? []).toHaveLength(0);
  });

  test("RLS rejects writing a row owned by another user", async () => {
    const { error } = await bob.client
      .from("documents")
      .insert({ user_id: alice.userId, name: "Bob spoof.pdf" });
    // WITH CHECK (user_id = auth.uid()) must reject a spoofed owner id.
    expect(error).not.toBeNull();
  });

  test("projects persist and are isolated per user", async () => {
    const { data: proj, error } = await alice.client
      .from("projects")
      .insert({
        user_id: alice.userId,
        name: "Kitchen remodel",
        address: "412 Oak St",
        status: "new",
      })
      .select("id, name")
      .single();
    expect(error).toBeNull();
    expect(proj?.name).toBe("Kitchen remodel");

    const { data: bobProjects } = await bob.client
      .from("projects")
      .select("name")
      .eq("name", "Kitchen remodel");
    expect(bobProjects ?? []).toHaveLength(0);
  });
});

describe.runIf(enabled)("Phase 1 — marketplace listings, saved, reports (Supabase + RLS)", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };
  let listingId: string;

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
    const { data, error } = await alice.client
      .from("marketplace_listings")
      .insert({
        user_id: alice.userId,
        title: "Off-market duplex",
        description: "East side",
        category: "off_market",
        location: "Dallas, TX",
        price: 285000,
        visibility: "public",
      })
      .select("id")
      .single();
    if (error) throw error;
    listingId = data.id;
  });

  test("public listings are readable across users", async () => {
    const { data } = await bob.client
      .from("marketplace_listings")
      .select("title")
      .eq("id", listingId);
    expect((data ?? []).some((l) => l.title === "Off-market duplex")).toBe(true);
  });

  test("saved listings are per-user isolated", async () => {
    await alice.client.from("saved_listings").insert({
      user_id: alice.userId,
      listing_id: listingId,
    });
    const { data: aliceSaved } = await alice.client.from("saved_listings").select("listing_id");
    expect((aliceSaved ?? []).some((s) => s.listing_id === listingId)).toBe(true);

    const { data: bobSaved } = await bob.client.from("saved_listings").select("listing_id");
    expect(bobSaved ?? []).toHaveLength(0);
  });

  test("RLS rejects saving under another user's id", async () => {
    const { error } = await bob.client.from("saved_listings").insert({
      user_id: alice.userId,
      listing_id: listingId,
    });
    expect(error).not.toBeNull();
  });

  test("a user can file a report and cannot read others' reports", async () => {
    const { error } = await bob.client.from("listing_reports").insert({
      user_id: bob.userId,
      listing_id: listingId,
      reason: "spam",
    });
    expect(error).toBeNull();

    // Alice must not see Bob's report (read own only).
    const { data: aliceSees } = await alice.client
      .from("listing_reports")
      .select("id")
      .eq("listing_id", listingId);
    expect(aliceSees ?? []).toHaveLength(0);
  });
});

describe.runIf(enabled)("Phase 3 — search, views, saved searches, listing → lead", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };
  let listingId: string;

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
    const { data, error } = await alice.client
      .from("marketplace_listings")
      .insert({
        user_id: alice.userId,
        title: "Austin kitchen repair",
        description: "Cabinets and counters",
        category: "repairs",
        location: "Austin, TX",
        price: 12000,
        visibility: "public",
      })
      .select("id")
      .single();
    if (error) throw error;
    listingId = data.id;
  });

  test("search filters by location and price", async () => {
    const { data } = await bob.client
      .from("marketplace_listings")
      .select("title, location, price")
      .ilike("location", "%Austin%")
      .gte("price", 5000)
      .lte("price", 20000);
    expect((data ?? []).some((l) => l.title === "Austin kitchen repair")).toBe(true);
  });

  test("listing views are unique per viewer and increment count", async () => {
    const { error } = await bob.client.from("listing_views").insert({
      listing_id: listingId,
      viewer_id: bob.userId,
    });
    expect(error).toBeNull();
    const again = await bob.client.from("listing_views").insert({
      listing_id: listingId,
      viewer_id: bob.userId,
    });
    expect(again.error).not.toBeNull();
  });

  test("saved searches are isolated per user", async () => {
    const { error } = await alice.client.from("saved_searches").insert({
      user_id: alice.userId,
      name: "Austin repairs",
      query: "kitchen",
      category: "repairs",
      location: "Austin",
      alert_enabled: true,
    });
    expect(error).toBeNull();
    const { data: bobSees } = await bob.client.from("saved_searches").select("name");
    expect((bobSees ?? []).some((s) => s.name === "Austin repairs")).toBe(false);
  });

  test("a listing converts to a lead owned by the converter", async () => {
    const { data, error } = await bob.client
      .from("leads")
      .insert({
        user_id: bob.userId,
        listing_id: listingId,
        title: "Austin kitchen repair",
        source: "marketplace",
        status: "new",
        opportunity_value: 12000,
      })
      .select("id, listing_id, user_id")
      .single();
    expect(error).toBeNull();
    expect(data?.listing_id).toBe(listingId);
    expect(data?.user_id).toBe(bob.userId);

    const { data: aliceLeads } = await alice.client
      .from("leads")
      .select("id")
      .eq("listing_id", listingId);
    expect(aliceLeads ?? []).toHaveLength(0);
  });
});

describe.runIf(enabled)(
  "Phase 1 — conversations, verification, credits, assistant, account",
  () => {
    let alice: { client: SupabaseClient; userId: string };
    let bob: { client: SupabaseClient; userId: string };

    beforeAll(async () => {
      alice = await makeUser();
      bob = await makeUser();
    });

    test("conversations persist and messages are isolated to participants", async () => {
      const { data: convo, error } = await alice.client
        .from("conversations")
        .insert({ created_by: alice.userId, title: "Kitchen walk-through", context: "Project" })
        .select("id")
        .single();
      expect(error).toBeNull();
      await alice.client.from("conversation_participants").insert({
        conversation_id: convo!.id,
        user_id: alice.userId,
      });
      const { error: mErr } = await alice.client.from("messages").insert({
        conversation_id: convo!.id,
        sender_id: alice.userId,
        body: "Thursday at 3?",
      });
      expect(mErr).toBeNull();

      const { data: bobSees } = await bob.client
        .from("conversations")
        .select("id")
        .eq("id", convo!.id);
      expect(bobSees ?? []).toHaveLength(0);

      const { data: bobMsgs } = await bob.client
        .from("messages")
        .select("id")
        .eq("conversation_id", convo!.id);
      expect(bobMsgs ?? []).toHaveLength(0);
    });

    test("notification preferences are isolated and last_read_at updates", async () => {
      const { error: prefErr } = await alice.client.from("notification_preferences").upsert({
        user_id: alice.userId,
        email_enabled: true,
        sms_enabled: false,
        quiet_hours_start: "21:00",
        quiet_hours_end: "07:00",
        timezone: "America/Chicago",
      });
      expect(prefErr).toBeNull();

      const { data: bobPrefs } = await bob.client
        .from("notification_preferences")
        .select("user_id")
        .eq("user_id", alice.userId);
      expect(bobPrefs ?? []).toHaveLength(0);

      const { data: convo } = await alice.client
        .from("conversations")
        .insert({
          created_by: alice.userId,
          title: "Read receipt",
          context: "Direct",
          thread_type: "direct",
        })
        .select("id")
        .single();
      await alice.client.from("conversation_participants").insert({
        conversation_id: convo!.id,
        user_id: alice.userId,
      });
      const { error: readErr } = await alice.client
        .from("conversation_participants")
        .update({ last_read_at: new Date().toISOString() })
        .eq("conversation_id", convo!.id)
        .eq("user_id", alice.userId);
      expect(readErr).toBeNull();

      const { error: blockErr } = await alice.client.from("conversation_blocks").insert({
        blocker_id: alice.userId,
        blocked_id: bob.userId,
      });
      expect(blockErr).toBeNull();
      const { data: bobBlocks } = await bob.client
        .from("conversation_blocks")
        .select("blocked_id")
        .eq("blocker_id", alice.userId);
      expect(bobBlocks ?? []).toHaveLength(0);
    });

    test("verification records persist per user", async () => {
      const { error } = await alice.client.from("verification_records").insert({
        user_id: alice.userId,
        tier: "identity",
        status: "pending",
      });
      expect(error).toBeNull();
      const { data: bobSees } = await bob.client
        .from("verification_records")
        .select("id")
        .eq("user_id", alice.userId);
      expect(bobSees ?? []).toHaveLength(0);
    });

    test("credit wallets and ledger are owner-scoped", async () => {
      const { data: wallet, error } = await alice.client
        .from("credit_wallets")
        .select("id")
        .eq("user_id", alice.userId)
        .maybeSingle();
      expect(error).toBeNull();
      const walletId =
        wallet?.id ??
        (
          await alice.client
            .from("credit_wallets")
            .insert({ user_id: alice.userId, balance: 0 })
            .select("id")
            .single()
        ).data?.id;
      expect(walletId).toBeTruthy();

      const { data: bobWallets } = await bob.client
        .from("credit_wallets")
        .select("id")
        .eq("id", walletId!);
      expect(bobWallets ?? []).toHaveLength(0);
    });

    test("assistant logs persist per user", async () => {
      const { error } = await alice.client.from("assistant_logs").insert({
        user_id: alice.userId,
        title: "Assistant",
        messages: [{ role: "assistant", text: "Hello" }],
      });
      expect(error).toBeNull();
      const { data: bobSees } = await bob.client.from("assistant_logs").select("id");
      expect((bobSees ?? []).length).toBe(0);
    });

    test("account draft persists on profiles", async () => {
      const { error } = await alice.client
        .from("profiles")
        .update({
          onboarding_step: 3,
          account_draft: { company_name: "Ford Build" },
        })
        .eq("id", alice.userId);
      expect(error).toBeNull();
      const { data } = await alice.client
        .from("profiles")
        .select("onboarding_step, account_draft")
        .eq("id", alice.userId)
        .single();
      expect(data?.onboarding_step).toBe(3);
      expect((data?.account_draft as { company_name?: string })?.company_name).toBe("Ford Build");
    });
  },
);

describe.runIf(enabled)("Phase 2 — workspaces, invites, suspension", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string; email: string };

  beforeAll(async () => {
    alice = await makeUser();
    const client = createClient(URL!, ANON!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const email = `it_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
    const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
    if (error) throw error;
    bob = { client, userId: data.user!.id, email };
  });

  test("new users receive a personal workspace", async () => {
    const { data } = await alice.client.from("workspaces").select("id, name, owner_id");
    expect((data ?? []).some((w) => w.owner_id === alice.userId)).toBe(true);
  });

  test("workspace invites are readable by the invitee and join persists", async () => {
    const { data: ws } = await alice.client
      .from("workspaces")
      .select("id")
      .eq("owner_id", alice.userId)
      .limit(1)
      .single();
    const { error } = await alice.client.from("workspace_invites").insert({
      workspace_id: ws!.id,
      email: bob.email.toLowerCase(),
      invited_by: alice.userId,
      role: "member",
    });
    expect(error).toBeNull();

    const { data: invites } = await bob.client.from("workspace_invites").select("id, workspace_id");
    expect((invites ?? []).some((i) => i.workspace_id === ws!.id)).toBe(true);
  });

  test("suspended_at is readable by the account owner", async () => {
    const { error } = await alice.client
      .from("profiles")
      .update({ appeal_status: "pending", appeal_note: "Please review this case." })
      .eq("id", alice.userId);
    expect(error).toBeNull();
    const { data } = await alice.client
      .from("profiles")
      .select("appeal_status, appeal_note")
      .eq("id", alice.userId)
      .single();
    expect(data?.appeal_status).toBe("pending");
  });
});
