-- Catalog prices the master admin can edit from /admin/pricing.
-- Display sites and checkout read from this table (falling back to code defaults).

CREATE TABLE public.platform_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  master_admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.platform_settings (id, master_admin_user_id)
SELECT 'default', ur.user_id
FROM public.user_roles ur
WHERE ur.role = 'admin'
ORDER BY ur.created_at ASC, ur.user_id ASC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.platform_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.ensure_master_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'admin' THEN
    UPDATE public.platform_settings
    SET master_admin_user_id = NEW.user_id, updated_at = now()
    WHERE id = 'default' AND master_admin_user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ensure_master_admin
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.ensure_master_admin();

CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  ) AND (
    COALESCE(
      (SELECT master_admin_user_id FROM public.platform_settings WHERE id = 'default'),
      (SELECT user_id FROM public.user_roles WHERE role = 'admin' ORDER BY created_at ASC, user_id ASC LIMIT 1)
    ) = _user_id
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_master_admin(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.ensure_master_admin() FROM PUBLIC, anon, authenticated;

CREATE TABLE public.plan_prices (
  tier text PRIMARY KEY,
  monthly numeric NOT NULL CHECK (monthly >= 0),
  annual numeric NOT NULL CHECK (annual >= 0),
  extra_seat_monthly numeric CHECK (extra_seat_monthly IS NULL OR extra_seat_monthly >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

INSERT INTO public.plan_prices (tier, monthly, annual, extra_seat_monthly) VALUES
  ('free', 0, 0, NULL),
  ('beginner', 49, 470, NULL),
  ('professional', 149, 1430, NULL),
  ('professional_ai_max', 499, 4790, NULL),
  ('team', 399, 3830, 99),
  ('team_ai_max', 1299, 12470, 99)
ON CONFLICT (tier) DO NOTHING;

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can read plan prices"
  ON public.plan_prices FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "master admin can update plan prices"
  ON public.plan_prices FOR UPDATE
  TO authenticated
  USING (public.is_master_admin(auth.uid()))
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "master admin can insert plan prices"
  ON public.plan_prices FOR INSERT
  TO authenticated
  WITH CHECK (public.is_master_admin(auth.uid()));

CREATE POLICY "admins can read platform settings"
  ON public.platform_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

GRANT SELECT ON public.plan_prices TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.plan_prices TO authenticated;
GRANT ALL ON public.plan_prices TO service_role;
GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
