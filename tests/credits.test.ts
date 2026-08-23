import { describe, expect, test, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_WALLET_OPERATIONS } from "../src/lib/canons";
import {
  chargeCredits,
  grantCredits,
  loadCreditWallet,
  openReservedTotal,
  refundCredits,
  releaseCredits,
  reserveCredits,
} from "../src/lib/credits";
import { grantAdminRole } from "./helpers/local-sql";

describe("credit wallet law", () => {
  test("Canon 7 operations are reserve/charge/release/refund plus grants", () => {
    expect(CREDIT_WALLET_OPERATIONS).toEqual([
      "reserve",
      "charge",
      "release",
      "refund",
      "admin_adjust",
      "referral_reward",
      "promotional_grant",
    ]);
  });

  test("open reserved ignores charged and released holds", () => {
    expect(
      openReservedTotal([
        { id: "r1", delta: -10, status: "reserved" },
        { id: "c1", delta: -10, status: "posted", reservationId: "r1" },
        { id: "r2", delta: -4, status: "reserved" },
      ]),
    ).toBe(4);
  });
});

const URL = process.env.SUPABASE_TEST_URL;
const ANON = process.env.SUPABASE_TEST_ANON_KEY;
const enabled = !!URL && !!ANON;

async function makeUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(URL!, ANON!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const email = `cred_${Date.now()}_${Math.random().toString(36).slice(2, 10)}@boliviq.test`;
  const { data, error } = await client.auth.signUp({ email, password: "Passw0rd!123" });
  if (error) throw error;
  return { client, userId: data.user!.id };
}

describe.runIf(enabled)("credit reserve charge release (Supabase)", () => {
  let alice: { client: SupabaseClient; userId: string };
  let bob: { client: SupabaseClient; userId: string };
  let admin: { client: SupabaseClient; userId: string };

  beforeAll(async () => {
    alice = await makeUser();
    bob = await makeUser();
    admin = await makeUser();
    grantAdminRole(admin.userId);
  });

  test("reserve is idempotent; charge cannot be double-spent; bob cannot see alice", async () => {
    const wallet = await loadCreditWallet(alice.client, alice.userId);
    await grantCredits(admin.client, admin.userId, {
      walletId: wallet.walletId,
      amount: 40,
      label: "Test grant",
      idempotencyKey: `grant-${alice.userId}`,
    });

    const first = await reserveCredits(alice.client, alice.userId, {
      amount: 10,
      label: "AI estimate",
      idempotencyKey: `reserve-${alice.userId}-est`,
    });
    const again = await reserveCredits(alice.client, alice.userId, {
      amount: 10,
      label: "AI estimate",
      idempotencyKey: `reserve-${alice.userId}-est`,
    });
    expect(again.id).toBe(first.id);

    const afterReserve = await loadCreditWallet(alice.client, alice.userId);
    expect(afterReserve.balance).toBe(40);
    expect(afterReserve.reserved).toBe(10);
    expect(afterReserve.available).toBe(30);

    await expect(
      reserveCredits(alice.client, alice.userId, {
        amount: 35,
        label: "too much",
        idempotencyKey: `reserve-${alice.userId}-over`,
      }),
    ).rejects.toThrow(/Insufficient/);

    const charged = await chargeCredits(alice.client, alice.userId, {
      amount: 10,
      label: "AI estimate",
      reservationId: first.id,
      idempotencyKey: `charge-${first.id}`,
    });
    expect(charged.status).toBe("posted");

    const chargedAgain = await chargeCredits(alice.client, alice.userId, {
      amount: 10,
      label: "AI estimate",
      reservationId: first.id,
      idempotencyKey: `charge-${first.id}-retry`,
    });
    expect(chargedAgain.id).toBe(charged.id);

    const afterCharge = await loadCreditWallet(alice.client, alice.userId);
    expect(afterCharge.balance).toBe(30);
    expect(afterCharge.reserved).toBe(0);
    expect(afterCharge.available).toBe(30);

    const hold = await reserveCredits(alice.client, alice.userId, {
      amount: 5,
      label: "hold",
      idempotencyKey: `reserve-${alice.userId}-hold`,
    });
    const released = await releaseCredits(alice.client, alice.userId, {
      amount: 5,
      label: "hold released",
      reservationId: hold.id,
      idempotencyKey: `release-${hold.id}`,
    });
    expect(released.status).toBe("released");
    const afterRelease = await loadCreditWallet(alice.client, alice.userId);
    expect(afterRelease.balance).toBe(30);
    expect(afterRelease.reserved).toBe(0);

    const refunded = await refundCredits(alice.client, alice.userId, {
      amount: 10,
      label: "refund estimate",
      idempotencyKey: `refund-${alice.userId}`,
    });
    expect(refunded.status).toBe("refunded");
    const afterRefund = await loadCreditWallet(alice.client, alice.userId);
    expect(afterRefund.balance).toBe(40);

    const { data: bobSees } = await bob.client
      .from("credit_wallets")
      .select("id")
      .eq("id", wallet.walletId);
    expect(bobSees ?? []).toHaveLength(0);

    await expect(
      grantCredits(alice.client, alice.userId, {
        walletId: wallet.walletId,
        amount: 99,
        label: "self grant",
        idempotencyKey: `self-${alice.userId}`,
      }),
    ).rejects.toThrow(/Forbidden/);
  });

  test("direct ledger inserts no longer mint credits", async () => {
    const { data: wallet } = await alice.client
      .from("credit_wallets")
      .select("id")
      .eq("user_id", alice.userId)
      .single();
    const { error } = await alice.client.from("credit_ledger").insert({
      wallet_id: wallet!.id,
      label: "forged",
      delta: 999,
      status: "posted",
    });
    expect(error).not.toBeNull();
  });
});
