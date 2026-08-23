import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicBadges, publicDisplayLabel, reviewVerification } from "../src/lib/trust";
import { VERIFICATION_DISCLAIMER } from "../src/lib/canons";
import { grantAdminRole } from "./helpers/local-sql";

describe("trust display law", () => {
  test("pending is not a public badge", () => {
    expect(
      publicDisplayLabel(
        publicBadges([
          { tier: "identity", status: "pending" },
          { tier: "license", status: "rejected" },
        ]),
      ),
    ).toBe("unverified");
    expect(publicBadges([{ tier: "identity", status: "granted" }])).toEqual(["identity"]);
  });
});

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const enabled = !!URL && !!ANON;

async function makeUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `trust_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
  const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

describe.runIf(enabled)("verification admin review", () => {
  let alice: { client: SupabaseClient; userId: string };
  let admin: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    alice = await makeUser();
    admin = await makeUser();
    grantAdminRole(admin.userId);
  });

  test("non-admin cannot grant; admin grant writes audit and badge", async () => {
    const { data: req, error } = await alice.client
      .from("verification_records")
      .insert({ user_id: alice.userId, tier: "identity", status: "pending" })
      .select("id")
      .single();
    expect(error).toBeNull();

    await expect(
      reviewVerification(alice.client, alice.userId, {
        id: req!.id,
        decision: "granted",
        reason: "Looks fine",
      }),
    ).rejects.toThrow(/Forbidden/);

    const granted = await reviewVerification(admin.client, admin.userId, {
      id: req!.id,
      decision: "granted",
      reason: "ID matches profile",
    });
    expect(granted.status).toBe("granted");
    expect(granted.disclaimer).toBe(VERIFICATION_DISCLAIMER);

    const { data: aliceRow } = await alice.client
      .from("verification_records")
      .select("status, tier")
      .eq("id", req!.id)
      .single();
    expect(aliceRow?.status).toBe("granted");
    expect(
      publicDisplayLabel(publicBadges([{ tier: aliceRow!.tier, status: aliceRow!.status }])),
    ).toEqual(["identity"]);

    const { data: audit } = await admin.client
      .from("admin_audit_logs")
      .select("action, reason")
      .eq("record_id", req!.id);
    expect((audit ?? []).some((a) => a.action === "verification_granted")).toBe(true);
  });
});
