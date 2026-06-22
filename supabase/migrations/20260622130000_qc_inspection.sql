-- QC inspection records — one row per box, sequential box_number per batch

CREATE TABLE public.qc_inspection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  line text NOT NULL,
  batch text NOT NULL REFERENCES public.production_plan(batch) ON UPDATE CASCADE,
  box_number integer NOT NULL CHECK (box_number > 0),
  form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  inspected_by text,
  recorded_by uuid REFERENCES public.profiles(id),
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qc_inspection_batch_box_unique UNIQUE (batch, box_number)
);

CREATE INDEX qc_inspection_batch_box_idx ON public.qc_inspection (batch, box_number);

ALTER TABLE public.qc_inspection ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.qc_inspection TO authenticated;

CREATE POLICY qc_inspection_select ON public.qc_inspection
  FOR SELECT TO authenticated
  USING (private.is_authenticated_active());

CREATE POLICY qc_inspection_insert ON public.qc_inspection
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(ARRAY['qc_technician', 'admin', 'supervisor']::public.user_role[]));
