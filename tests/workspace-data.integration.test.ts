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
