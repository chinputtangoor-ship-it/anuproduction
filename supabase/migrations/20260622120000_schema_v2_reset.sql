-- ANU Production Intelligence — Schema v2
-- Drops legacy tables, enables Supabase Auth profiles, strict RLS.

-- ─── Cleanup legacy objects ────────────────────────────────────────────────
DROP TABLE IF EXISTS public.camera_inspection CASCADE;
DROP TABLE IF EXISTS public.rejection CASCADE;
DROP TABLE IF EXISTS public.backlog CASCADE;
DROP TABLE IF EXISTS public.repass CASCADE;
DROP TABLE IF EXISTS public.boxes CASCADE;
DROP TABLE IF EXISTS public.production_plan CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP FUNCTION IF EXISTS public.is_authenticated_active() CASCADE;
DROP FUNCTION IF EXISTS public.has_role(public.user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.is_privileged() CASCADE;
DROP FUNCTION IF EXISTS public.handle_batch_finished() CASCADE;
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;

DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.batch_status CASCADE;
DROP TYPE IF EXISTS public.box_status CASCADE;
DROP TYPE IF EXISTS public.repass_mode CASCADE;

-- ─── Types ───────────────────────────────────────────────────────────────────
CREATE TYPE public.user_role AS ENUM (
  'operator',
  'qc_technician',
  'production_operator',
  'warehouse_operator',
  'supervisor',
  'manager',
  'planner',
  'admin'
);

CREATE TYPE public.batch_status AS ENUM (
  'Planing',
  'Running',
  'Finished',
  'On Hold',
  'Cancelled'
);

CREATE TYPE public.box_status AS ENUM (
  'AF', 'HP', 'HUP', 'Sort', 'PS', 'Scrap', 'HFX'
);

CREATE TYPE public.repass_mode AS ENUM ('Online', 'Offline');

-- ─── Timestamp helpers ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_batch_finished()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.batch_status = 'Finished'
     AND (OLD.batch_status IS DISTINCT FROM NEW.batch_status) THEN
    NEW.batch_finish_date = now();
  END IF;
  RETURN NEW;
END;
$$;

-- ─── Profiles (linked to Supabase Auth) ──────────────────────────────────────
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  fullname text NOT NULL,
  emp_id text UNIQUE,
  role public.user_role NOT NULL DEFAULT 'operator',
  birth_date date,
  join_date date,
  must_change_password boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_format CHECK (username ~ '^[a-z0-9._-]+$')
);

CREATE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Auth / role helpers (after profiles exists) ─────────────────────────────
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
      AND role IN ('admin', 'supervisor', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed public.user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_privileged()
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND is_active = true
        AND role = ANY(allowed)
    );
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_active = true
  );
$$;

-- ─── Production plan ─────────────────────────────────────────────────────────
CREATE TABLE public.production_plan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  size text,
  batch text NOT NULL UNIQUE,
  sap_batch text,
  production_order text,
  inspection_lot text,
  sales_order text,
  sales_order_item text,
  fert_code text,
  semifinish_code text,
  item_qty_million numeric(12, 3),
  need_af_box integer,
  customer_name text,
  country text,
  box_packing text,
  planned_finish_date date,
  to_be_desp_on date,
  metal_detector text,
  print_type text,
  ink_cap text,
  roller_des_cap text,
  ink_body text,
  roller_des_body text,
  batch_status public.batch_status NOT NULL DEFAULT 'Planing',
  batch_finish_date timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  updated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX production_plan_line_status_idx ON public.production_plan (line, batch_status);
CREATE INDEX production_plan_status_idx ON public.production_plan (batch_status);

CREATE TRIGGER production_plan_set_updated_at
  BEFORE UPDATE ON public.production_plan
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER production_plan_batch_finished
  BEFORE UPDATE ON public.production_plan
  FOR EACH ROW EXECUTE FUNCTION public.handle_batch_finished();

-- ─── Box records ─────────────────────────────────────────────────────────────
CREATE TABLE public.boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  box_number integer NOT NULL,
  status public.box_status NOT NULL,
  defects text,
  net_weight_kg numeric(10, 3),
  total_weight_kg numeric(10, 3),
  weight_by text,
  check_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT boxes_batch_box_unique UNIQUE (batch, box_number)
);

CREATE INDEX boxes_batch_idx ON public.boxes (batch);
CREATE INDEX boxes_line_status_idx ON public.boxes (line, status);

CREATE TRIGGER boxes_set_updated_at
  BEFORE UPDATE ON public.boxes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─── Rejection weights ───────────────────────────────────────────────────────
CREATE TABLE public.rejection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  ats_kg numeric(10, 3) NOT NULL DEFAULT 0,
  print_kg numeric(10, 3) NOT NULL DEFAULT 0,
  cam_kg numeric(10, 3) NOT NULL DEFAULT 0,
  total_kg numeric(10, 3) GENERATED ALWAYS AS (ats_kg + print_kg + cam_kg) STORED,
  check_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX rejection_batch_idx ON public.rejection (batch, recorded_at DESC);

-- ─── Backlog snapshots ───────────────────────────────────────────────────────
CREATE TABLE public.backlog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  ats_box integer NOT NULL DEFAULT 0,
  print_box integer NOT NULL DEFAULT 0,
  cam_box integer NOT NULL DEFAULT 0,
  total_backlog integer GENERATED ALWAYS AS (ats_box + print_box + cam_box) STORED,
  record_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX backlog_batch_idx ON public.backlog (batch, recorded_at DESC);

-- ─── Camera inspection ───────────────────────────────────────────────────────
CREATE TABLE public.camera_inspection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  cam1_pass_rate numeric(5, 2),
  cam1_defects text,
  cam1_total_qty integer,
  cam2_pass_rate numeric(5, 2),
  cam2_defects text,
  cam2_total_qty integer,
  check_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX camera_inspection_batch_idx ON public.camera_inspection (batch, recorded_at DESC);

-- ─── Re-pass ─────────────────────────────────────────────────────────────────
CREATE TABLE public.repass (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  box_number integer NOT NULL,
  previous_status text NOT NULL,
  result_status public.box_status NOT NULL,
  new_defects text,
  type public.repass_mode,
  reason text,
  start_time timestamptz,
  complete_time timestamptz,
  repass_by text,
  check_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX repass_batch_idx ON public.repass (batch, recorded_at DESC);
CREATE INDEX repass_line_idx ON public.repass (line, recorded_at DESC);

-- ─── Grants (authenticated only; anon has no table access) ───────────────────
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ─── Row Level Security ──────────────────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rejection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backlog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_inspection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repass ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_privileged() OR public.has_role(ARRAY['admin']::public.user_role[]));

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.has_role(ARRAY['admin']::public.user_role[]))
  WITH CHECK (public.has_role(ARRAY['admin']::public.user_role[]));

-- production_plan
CREATE POLICY production_plan_select ON public.production_plan
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY production_plan_insert ON public.production_plan
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['planner', 'admin', 'supervisor']::public.user_role[]));

CREATE POLICY production_plan_update ON public.production_plan
  FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['planner', 'admin', 'supervisor']::public.user_role[]))
  WITH CHECK (public.has_role(ARRAY['planner', 'admin', 'supervisor']::public.user_role[]));

CREATE POLICY production_plan_delete ON public.production_plan
  FOR DELETE TO authenticated
  USING (public.has_role(ARRAY['admin']::public.user_role[]));

-- boxes
CREATE POLICY boxes_select ON public.boxes
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY boxes_insert ON public.boxes
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['operator', 'production_operator', 'admin', 'supervisor']::public.user_role[]));

CREATE POLICY boxes_update ON public.boxes
  FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['operator', 'production_operator', 'admin', 'supervisor']::public.user_role[]))
  WITH CHECK (public.has_role(ARRAY['operator', 'production_operator', 'admin', 'supervisor']::public.user_role[]));

-- rejection
CREATE POLICY rejection_select ON public.rejection
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY rejection_insert ON public.rejection
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['operator', 'production_operator', 'admin', 'supervisor']::public.user_role[]));

-- backlog
CREATE POLICY backlog_select ON public.backlog
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY backlog_insert ON public.backlog
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['operator', 'production_operator', 'admin', 'supervisor']::public.user_role[]));

-- camera_inspection
CREATE POLICY camera_select ON public.camera_inspection
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY camera_insert ON public.camera_inspection
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'supervisor']::public.user_role[]));

-- repass
CREATE POLICY repass_select ON public.repass
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

CREATE POLICY repass_insert ON public.repass
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(ARRAY['admin', 'supervisor']::public.user_role[]));

CREATE POLICY repass_update_boxes ON public.boxes
  FOR UPDATE TO authenticated
  USING (public.has_role(ARRAY['admin', 'supervisor']::public.user_role[]))
  WITH CHECK (public.has_role(ARRAY['admin', 'supervisor']::public.user_role[]));

-- Restrict helper functions
REVOKE ALL ON FUNCTION public.is_privileged() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(public.user_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_active() TO authenticated;
