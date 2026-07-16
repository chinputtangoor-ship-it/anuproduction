-- Phase 4: per-box edit history + updated_by stamp on boxes.

ALTER TABLE public.boxes
  ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES public.profiles(id);

CREATE TABLE IF NOT EXISTS public.box_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  box_id uuid NOT NULL REFERENCES public.boxes(id) ON DELETE CASCADE,
  batch text NOT NULL,
  box_number integer NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  changed_by uuid REFERENCES public.profiles(id),
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS box_change_log_box_id_idx
  ON public.box_change_log (box_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS box_change_log_batch_idx
  ON public.box_change_log (batch, box_number);

ALTER TABLE public.box_change_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS box_change_log_select ON public.box_change_log;
CREATE POLICY box_change_log_select ON public.box_change_log
  FOR SELECT TO authenticated
  USING (public.is_authenticated_active());

DROP POLICY IF EXISTS box_change_log_insert ON public.box_change_log;
CREATE POLICY box_change_log_insert ON public.box_change_log
  FOR INSERT TO authenticated
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
