-- Phase 3: manager may write plans; all authenticated users already have SELECT.

DROP POLICY IF EXISTS production_plan_insert ON public.production_plan;
CREATE POLICY production_plan_insert ON public.production_plan
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY['planner', 'admin', 'supervisor', 'manager']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS production_plan_update ON public.production_plan;
CREATE POLICY production_plan_update ON public.production_plan
  FOR UPDATE TO authenticated
  USING (
    public.has_role(
      ARRAY['planner', 'admin', 'supervisor', 'manager']::public.user_role[]
    )
  )
  WITH CHECK (
    public.has_role(
      ARRAY['planner', 'admin', 'supervisor', 'manager']::public.user_role[]
    )
  );
