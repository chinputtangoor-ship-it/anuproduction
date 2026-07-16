-- Fix: admin API uses service_role; schema v2 only granted table access to authenticated.
-- Also restore public RLS helper wrappers removed in hardening migration.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

-- authenticated users evaluate RLS policies that call helper functions
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- Public wrappers keep existing policies working after helpers moved to private schema
CREATE OR REPLACE FUNCTION public.is_privileged()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_privileged();
$$;

CREATE OR REPLACE FUNCTION public.has_role(allowed public.user_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.has_role(allowed);
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.is_authenticated_active();
$$;

REVOKE ALL ON FUNCTION public.is_privileged() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(public.user_role[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_authenticated_active() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_privileged() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(public.user_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated_active() TO authenticated;
