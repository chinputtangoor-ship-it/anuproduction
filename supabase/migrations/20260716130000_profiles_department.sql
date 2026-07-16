-- Phase 1: department field on profiles (alongside role)
-- Values: planner | quality | production | post_production | warehouse | human_resources | account

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department text;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_department_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_department_check
  CHECK (
    department IS NULL
    OR department IN (
      'planner',
      'quality',
      'production',
      'post_production',
      'warehouse',
      'human_resources',
      'account'
    )
  );

COMMENT ON COLUMN public.profiles.department IS
  'Shop-floor department (extra field alongside role). See docs/decisions.md D5.';
