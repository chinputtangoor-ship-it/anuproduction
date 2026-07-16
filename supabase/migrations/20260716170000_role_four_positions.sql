-- Simplify positions to admin / manager / supervisor / operator (+ department).

-- 1) Migrate legacy role values
UPDATE public.profiles
SET role = 'operator'::public.user_role
WHERE role::text IN ('qc_technician', 'production_operator', 'warehouse_operator', 'planner');

-- 2) Cross-department = admin + manager only (not supervisor)
CREATE OR REPLACE FUNCTION private.is_privileged()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
      AND role IN ('admin', 'manager')
  );
$$;

-- 3) Approve = admin + manager + supervisor
CREATE OR REPLACE FUNCTION private.can_approve()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
      AND role IN ('admin', 'manager', 'supervisor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_approve()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT private.can_approve();
$$;

-- 4) has_role: privileged bypass OR explicit role match (supervisor no longer auto-bypass)
CREATE OR REPLACE FUNCTION private.has_role(allowed public.user_role[])
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT private.is_privileged()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = true AND role = ANY(allowed)
    );
$$;

GRANT EXECUTE ON FUNCTION public.can_approve() TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_approve() TO authenticated;

-- 5) production_plan — approve positions only
DROP POLICY IF EXISTS production_plan_insert ON public.production_plan;
CREATE POLICY production_plan_insert ON public.production_plan
  FOR INSERT TO authenticated
  WITH CHECK (public.can_approve());

DROP POLICY IF EXISTS production_plan_update ON public.production_plan;
CREATE POLICY production_plan_update ON public.production_plan
  FOR UPDATE TO authenticated
  USING (public.can_approve())
  WITH CHECK (public.can_approve());

-- 6) Operational tables — all four positions
DROP POLICY IF EXISTS boxes_insert ON public.boxes;
CREATE POLICY boxes_insert ON public.boxes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS boxes_update ON public.boxes;
CREATE POLICY boxes_update ON public.boxes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  )
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS rejection_insert ON public.rejection;
CREATE POLICY rejection_insert ON public.rejection
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS backlog_insert ON public.backlog;
CREATE POLICY backlog_insert ON public.backlog
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );

-- 7) QC inspection — all positions (department scoped in app)
DROP POLICY IF EXISTS qc_inspection_insert ON public.qc_inspection;
CREATE POLICY qc_inspection_insert ON public.qc_inspection
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );

-- 8) Camera / repass — approve only
DROP POLICY IF EXISTS camera_insert ON public.camera_inspection;
CREATE POLICY camera_insert ON public.camera_inspection
  FOR INSERT TO authenticated
  WITH CHECK (public.can_approve());

DROP POLICY IF EXISTS repass_insert ON public.repass;
CREATE POLICY repass_insert ON public.repass
  FOR INSERT TO authenticated
  WITH CHECK (public.can_approve());

DROP POLICY IF EXISTS repass_update_boxes ON public.boxes;
CREATE POLICY repass_update_boxes ON public.boxes
  FOR UPDATE TO authenticated
  USING (public.can_approve())
  WITH CHECK (public.can_approve());

-- 9) Box change log — all positions may write history on operational edits
DROP POLICY IF EXISTS box_change_log_insert ON public.box_change_log;
CREATE POLICY box_change_log_insert ON public.box_change_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['admin', 'manager', 'supervisor', 'operator']::public.user_role[]
    )
  );
