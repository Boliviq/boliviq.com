
-- Enum for discount type
DO $$ BEGIN
  CREATE TYPE public.discount_type AS ENUM ('percentage', 'fixed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  discount_type public.discount_type NOT NULL DEFAULT 'percentage',
  discount_value NUMERIC(12,2) NOT NULL CHECK (discount_value >= 0),
  active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  expiration_date TIMESTAMPTZ,
  max_total_uses INTEGER,
  max_uses_per_customer INTEGER DEFAULT 1,
  current_uses INTEGER NOT NULL DEFAULT 0,
  restricted_plan TEXT,
  admin_only BOOLEAN NOT NULL DEFAULT false,
  hidden BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX coupons_code_upper_idx ON public.coupons (UPPER(code));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins full access
CREATE POLICY "Admins can view all coupons" ON public.coupons
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert coupons" ON public.coupons
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update coupons" ON public.coupons
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete coupons" ON public.coupons
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Users may look up active, non-hidden, non-admin coupons (for checkout).
-- Admin-only + hidden coupons are never exposed via RLS to non-admins.
CREATE POLICY "Users can view public active coupons" ON public.coupons
  FOR SELECT TO authenticated
  USING (
    active = true
    AND hidden = false
    AND admin_only = false
    AND (start_date IS NULL OR start_date <= now())
    AND (expiration_date IS NULL OR expiration_date >= now())
  );

CREATE TRIGGER coupons_updated_at BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Redemptions table (audit log)
CREATE TABLE public.coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT,
  order_amount NUMERIC(12,2),
  discount_amount NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX coupon_redemptions_coupon_idx ON public.coupon_redemptions(coupon_id);
CREATE INDEX coupon_redemptions_user_idx ON public.coupon_redemptions(user_id);

GRANT SELECT, INSERT ON public.coupon_redemptions TO authenticated;
GRANT ALL ON public.coupon_redemptions TO service_role;

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all redemptions" ON public.coupon_redemptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own redemptions" ON public.coupon_redemptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Seed the two required coupons
INSERT INTO public.coupons (name, code, discount_type, discount_value, active, admin_only, hidden, max_uses_per_customer, notes)
VALUES
  ('Owner Access', 'OWNER100', 'percentage', 100, true, true, true, NULL, 'Administrator use only. Hidden from all users. Unlimited uses by admin accounts.'),
  ('NateB Promotion', 'NateB', 'percentage', 25, true, false, false, 1, 'Public promo. 25% off any eligible plan. One use per customer. Cannot be combined with other coupons.')
ON CONFLICT (code) DO NOTHING;
