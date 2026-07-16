-- Phase 2: QC Box Grade can insert graded boxes; Post Production weighs them.
-- qc_technician may INSERT boxes (grade only, weights null).
-- operator / production_operator / privileged roles UPDATE for weighing.

DROP POLICY IF EXISTS boxes_insert ON public.boxes;
CREATE POLICY boxes_insert ON public.boxes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(
      ARRAY[
        'qc_technician',
        'operator',
        'production_operator',
        'admin',
        'supervisor',
        'manager'
      ]::public.user_role[]
    )
  );

DROP POLICY IF EXISTS boxes_update ON public.boxes;
CREATE POLICY boxes_update ON public.boxes
  FOR UPDATE TO authenticated
  USING (
    public.has_role(
      ARRAY[
        'operator',
        'production_operator',
        'qc_technician',
        'admin',
        'supervisor',
        'manager'
      ]::public.user_role[]
    )
  )
  WITH CHECK (
    public.has_role(
      ARRAY[
        'operator',
        'production_operator',
        'qc_technician',
        'admin',
        'supervisor',
        'manager'
      ]::public.user_role[]
    )
  );
