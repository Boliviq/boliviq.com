-- Canon 7 wallet: reserve → charge → release/refund as an immutable ledger.
-- Authenticated clients keep SELECT. Mutations go through apply_credit_operation.

ALTER TABLE public.credit_ledger
  ADD COLUMN IF NOT EXISTS operation TEXT,
  ADD COLUMN IF NOT EXISTS reservation_id UUID REFERENCES public.credit_ledger(id) ON DELETE SET NULL;

ALTER TABLE public.credit_ledger
  DROP CONSTRAINT IF EXISTS credit_ledger_operation_check;

ALTER TABLE public.credit_ledger
  ADD CONSTRAINT credit_ledger_operation_check
  CHECK (
    operation IS NULL
    OR operation IN (
      'reserve',
      'charge',
      'release',
      'refund',
      'admin_adjust',
      'referral_reward',
      'promotional_grant'
    )
  );

CREATE INDEX IF NOT EXISTS credit_ledger_reservation_id_idx
  ON public.credit_ledger (reservation_id);

CREATE INDEX IF NOT EXISTS credit_ledger_wallet_status_idx
  ON public.credit_ledger (wallet_id, status);

DROP POLICY IF EXISTS "wallet owner writes ledger" ON public.credit_ledger;

DROP POLICY IF EXISTS "own wallet update" ON public.credit_wallets;

CREATE OR REPLACE FUNCTION public.apply_credit_operation(
  p_wallet_id uuid,
  p_operation text,
  p_amount numeric,
  p_label text,
  p_idempotency_key text DEFAULT NULL,
  p_reservation_id uuid DEFAULT NULL
)
RETURNS public.credit_ledger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_wallet public.credit_wallets%ROWTYPE;
  v_existing public.credit_ledger%ROWTYPE;
  v_reserve public.credit_ledger%ROWTYPE;
  v_open numeric;
  v_available numeric;
  v_status public.credit_entry_status;
  v_delta numeric;
  v_row public.credit_ledger%ROWTYPE;
  v_is_admin boolean;
BEGIN
  IF p_operation NOT IN (
    'reserve', 'charge', 'release', 'refund',
    'admin_adjust', 'referral_reward', 'promotional_grant'
  ) THEN
    RAISE EXCEPTION 'Unknown credit operation';
  END IF;

  IF p_operation = 'admin_adjust' THEN
    IF p_amount IS NULL OR p_amount = 0 THEN
      RAISE EXCEPTION 'Amount cannot be zero';
    END IF;
  ELSIF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing
    FROM public.credit_ledger
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
  END IF;

  SELECT * INTO v_wallet
  FROM public.credit_wallets
  WHERE id = p_wallet_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin');

  IF p_operation IN ('admin_adjust', 'referral_reward', 'promotional_grant') THEN
    IF NOT v_is_admin THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  ELSIF v_wallet.user_id IS DISTINCT FROM v_uid AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT COALESCE(SUM(ABS(l.delta)), 0) INTO v_open
  FROM public.credit_ledger l
  WHERE l.wallet_id = p_wallet_id
    AND l.status = 'reserved'
    AND NOT EXISTS (
      SELECT 1
      FROM public.credit_ledger c
      WHERE c.reservation_id = l.id
        AND c.status IN ('posted', 'released', 'refunded')
    );

  v_available := COALESCE(v_wallet.balance, 0) - v_open;

  IF p_operation = 'reserve' THEN
    IF v_available < p_amount THEN
      RAISE EXCEPTION 'Insufficient available credits';
    END IF;
    INSERT INTO public.credit_ledger (
      wallet_id, label, delta, status, idempotency_key, operation, reservation_id
    ) VALUES (
      p_wallet_id, p_label, -p_amount, 'reserved', p_idempotency_key, p_operation, NULL
    )
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF p_operation IN ('charge', 'release') THEN
    IF p_reservation_id IS NULL THEN
      RAISE EXCEPTION 'Reservation required';
    END IF;
    SELECT * INTO v_reserve
    FROM public.credit_ledger
    WHERE id = p_reservation_id AND wallet_id = p_wallet_id
    FOR UPDATE;
    IF NOT FOUND OR v_reserve.status <> 'reserved' THEN
      RAISE EXCEPTION 'Reservation not found';
    END IF;

    SELECT * INTO v_existing
    FROM public.credit_ledger
    WHERE reservation_id = p_reservation_id
      AND status IN ('posted', 'released', 'refunded')
    LIMIT 1;
    IF FOUND THEN
      RETURN v_existing;
    END IF;

    IF ABS(v_reserve.delta) <> p_amount THEN
      RAISE EXCEPTION 'Amount must match reservation';
    END IF;

    IF p_operation = 'charge' THEN
      v_status := 'posted';
      v_delta := -p_amount;
      UPDATE public.credit_wallets
        SET balance = balance - p_amount, updated_at = now()
        WHERE id = p_wallet_id;
    ELSE
      v_status := 'released';
      v_delta := p_amount;
    END IF;

    INSERT INTO public.credit_ledger (
      wallet_id, label, delta, status, idempotency_key, operation, reservation_id
    ) VALUES (
      p_wallet_id, p_label, v_delta, v_status, p_idempotency_key, p_operation, p_reservation_id
    )
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  IF p_operation = 'refund' THEN
    UPDATE public.credit_wallets
      SET balance = balance + p_amount, updated_at = now()
      WHERE id = p_wallet_id;
    INSERT INTO public.credit_ledger (
      wallet_id, label, delta, status, idempotency_key, operation, reservation_id
    ) VALUES (
      p_wallet_id, p_label, p_amount, 'refunded', p_idempotency_key, p_operation, p_reservation_id
    )
    RETURNING * INTO v_row;
    RETURN v_row;
  END IF;

  v_status := CASE WHEN p_operation = 'admin_adjust' THEN 'adjustment' ELSE 'posted' END;
  UPDATE public.credit_wallets
    SET balance = balance + p_amount, updated_at = now()
    WHERE id = p_wallet_id;
  INSERT INTO public.credit_ledger (
    wallet_id, label, delta, status, idempotency_key, operation, reservation_id
  ) VALUES (
    p_wallet_id, p_label, p_amount, v_status, p_idempotency_key, p_operation, NULL
  )
  RETURNING * INTO v_row;
  RETURN v_row;
EXCEPTION
  WHEN unique_violation THEN
    IF p_idempotency_key IS NULL THEN
      RAISE;
    END IF;
    SELECT * INTO v_existing
    FROM public.credit_ledger
    WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
      RETURN v_existing;
    END IF;
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_credit_operation(uuid, text, numeric, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_credit_operation(uuid, text, numeric, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_operation(uuid, text, numeric, text, text, uuid) TO service_role;
