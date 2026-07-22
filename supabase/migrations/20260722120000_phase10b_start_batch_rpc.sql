-- Phase 10B: allow Box Grade (any authenticated role that can insert boxes)
-- to flip Planing → Running when grading box #1, without opening full plan UPDATE.

CREATE OR REPLACE FUNCTION public.start_batch_from_first_grade(
  p_line text,
  p_batch text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  UPDATE public.production_plan
  SET
    batch_status = 'Running',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE line = p_line
    AND batch = p_batch
    AND batch_status = 'Planing';

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n > 0;
END;
$$;

REVOKE ALL ON FUNCTION public.start_batch_from_first_grade(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_batch_from_first_grade(text, text) TO authenticated;

COMMENT ON FUNCTION public.start_batch_from_first_grade(text, text) IS
  'Phase 10B: Planing→Running when QC grades box #1. Idempotent if already Running.';
