import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_WALLET_OPERATIONS } from "@/lib/canons";
import type { CreditLedgerRow } from "@/lib/workspace-store";

export type CreditOperation = (typeof CREDIT_WALLET_OPERATIONS)[number];

export type CreditLedgerEntry = CreditLedgerRow & {
  operation: CreditOperation | null;
  reservationId: string | null;
  idempotencyKey: string | null;
};

export type CreditWalletSnapshot = {
  walletId: string;
  balance: number;
  reserved: number;
  available: number;
  ledger: CreditLedgerEntry[];
};

export function openReservedTotal(
  rows: { id: string; delta: number; status: string; reservationId?: string | null }[],
): number {
  const closed = new Set(
    rows
      .filter(
        (r) =>
          r.reservationId &&
          (r.status === "posted" || r.status === "released" || r.status === "refunded"),
      )
      .map((r) => r.reservationId as string),
  );
  return rows
    .filter((r) => r.status === "reserved" && !closed.has(r.id))
    .reduce((sum, r) => sum + Math.abs(Number(r.delta)), 0);
}

type LedgerRpcRow = {
  id: string;
  wallet_id: string;
  label: string;
  delta: number;
  status: CreditLedgerRow["status"];
  operation: string | null;
  reservation_id: string | null;
  idempotency_key: string | null;
  created_at: string;
};

function asEntry(row: LedgerRpcRow): CreditLedgerEntry {
  return {
    id: row.id,
    at: row.created_at,
    label: row.label,
    delta: Number(row.delta),
    status: row.status,
    operation: (row.operation as CreditOperation | null) ?? null,
    reservationId: row.reservation_id,
    idempotencyKey: row.idempotency_key,
  };
}

async function applyOperation(
  supabase: SupabaseClient,
  input: {
    walletId: string;
    operation: CreditOperation;
    amount: number;
    label: string;
    idempotencyKey?: string;
    reservationId?: string;
  },
): Promise<CreditLedgerEntry> {
  const { data, error } = await supabase.rpc("apply_credit_operation", {
    p_wallet_id: input.walletId,
    p_operation: input.operation,
    p_amount: input.amount,
    p_label: input.label,
    p_idempotency_key: input.idempotencyKey ?? null,
    p_reservation_id: input.reservationId ?? null,
  });
  if (error) throw new Error(error.message);
  return asEntry(data as LedgerRpcRow);
}

export async function ensureWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ id: string; balance: number }> {
  const { data: existing, error } = await supabase
    .from("credit_wallets")
    .select("id, balance")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return { id: existing.id, balance: Number(existing.balance ?? 0) };

  const { data: created, error: cErr } = await supabase
    .from("credit_wallets")
    .insert({ user_id: userId, balance: 0 })
    .select("id, balance")
    .single();
  if (cErr) throw new Error(cErr.message);
  return { id: created.id, balance: Number(created.balance ?? 0) };
}

export async function loadCreditWallet(
  supabase: SupabaseClient,
  userId: string,
): Promise<CreditWalletSnapshot> {
  const wallet = await ensureWallet(supabase, userId);
  const { data: rows, error } = await supabase
    .from("credit_ledger")
    .select("id, label, delta, status, operation, reservation_id, idempotency_key, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const ledger: CreditLedgerEntry[] = (rows ?? []).map((r) => ({
    id: r.id,
    at: r.created_at,
    label: r.label,
    delta: Number(r.delta),
    status: r.status as CreditLedgerRow["status"],
    operation: (r.operation as CreditOperation | null) ?? null,
    reservationId: r.reservation_id,
    idempotencyKey: r.idempotency_key,
  }));
  const reserved = openReservedTotal(
    ledger.map((r) => ({
      id: r.id,
      delta: r.delta,
      status: r.status,
      reservationId: r.reservationId,
    })),
  );
  const balance = Number(wallet.balance ?? 0);
  return {
    walletId: wallet.id,
    balance,
    reserved,
    available: balance - reserved,
    ledger,
  };
}

export async function reserveCredits(
  supabase: SupabaseClient,
  userId: string,
  input: { amount: number; label: string; idempotencyKey: string },
): Promise<CreditLedgerEntry> {
  const wallet = await ensureWallet(supabase, userId);
  return applyOperation(supabase, {
    walletId: wallet.id,
    operation: "reserve",
    amount: input.amount,
    label: input.label,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function chargeCredits(
  supabase: SupabaseClient,
  userId: string,
  input: { amount: number; label: string; reservationId: string; idempotencyKey: string },
): Promise<CreditLedgerEntry> {
  const wallet = await ensureWallet(supabase, userId);
  return applyOperation(supabase, {
    walletId: wallet.id,
    operation: "charge",
    amount: input.amount,
    label: input.label,
    reservationId: input.reservationId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function releaseCredits(
  supabase: SupabaseClient,
  userId: string,
  input: { amount: number; label: string; reservationId: string; idempotencyKey: string },
): Promise<CreditLedgerEntry> {
  const wallet = await ensureWallet(supabase, userId);
  return applyOperation(supabase, {
    walletId: wallet.id,
    operation: "release",
    amount: input.amount,
    label: input.label,
    reservationId: input.reservationId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function refundCredits(
  supabase: SupabaseClient,
  userId: string,
  input: { amount: number; label: string; idempotencyKey: string; reservationId?: string },
): Promise<CreditLedgerEntry> {
  const wallet = await ensureWallet(supabase, userId);
  return applyOperation(supabase, {
    walletId: wallet.id,
    operation: "refund",
    amount: input.amount,
    label: input.label,
    reservationId: input.reservationId,
    idempotencyKey: input.idempotencyKey,
  });
}

export async function grantCredits(
  supabase: SupabaseClient,
  _adminId: string,
  input: {
    walletId: string;
    amount: number;
    label: string;
    idempotencyKey: string;
    operation?: Extract<CreditOperation, "promotional_grant" | "referral_reward" | "admin_adjust">;
  },
): Promise<CreditLedgerEntry> {
  return applyOperation(supabase, {
    walletId: input.walletId,
    operation: input.operation ?? "promotional_grant",
    amount: input.amount,
    label: input.label,
    idempotencyKey: input.idempotencyKey,
  });
}
