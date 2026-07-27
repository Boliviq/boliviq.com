
-- Add missing lead statuses
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'researching';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'attempting_contact';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'offer_preparation';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'offer_submitted';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'follow_up_later';
ALTER TYPE public.lead_status ADD VALUE IF NOT EXISTS 'lost';

-- Extend properties table
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS lot_size numeric,
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS listing_agent text,
  ADD COLUMN IF NOT EXISTS agent_phone text,
  ADD COLUMN IF NOT EXISTS agent_email text,
  ADD COLUMN IF NOT EXISTS listing_url text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS days_on_market integer,
  ADD COLUMN IF NOT EXISTS cap_rate numeric,
  ADD COLUMN IF NOT EXISTS saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS strategy text,
  ADD COLUMN IF NOT EXISTS motivation text;

-- Extend leads table
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS priority text,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_follow_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS opportunity_value numeric;

-- Extend tasks table
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS task_type text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to text,
  ADD COLUMN IF NOT EXISTS reminder_at timestamptz;
