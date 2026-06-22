-- Move RLS helpers to private schema (not exposed via PostgREST RPC)
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_privileged()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
      AND role IN ('admin', 'supervisor', 'manager')
  );
$$;

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

CREATE OR REPLACE FUNCTION private.is_authenticated_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

DROP FUNCTION IF EXISTS public.is_privileged();
DROP FUNCTION IF EXISTS public.has_role(public.user_role[]);
DROP FUNCTION IF EXISTS public.is_authenticated_active();
