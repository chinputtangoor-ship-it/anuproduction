-- D11: Need AF Box may have 0–2 decimal places from Excel import
ALTER TABLE public.production_plan
  ALTER COLUMN need_af_box TYPE numeric(12, 2)
  USING need_af_box::numeric(12, 2);
