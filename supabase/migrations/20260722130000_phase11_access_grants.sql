-- Phase 11: configurable menu access grants (read / edit)

CREATE TABLE IF NOT EXISTS public.access_menu_grant (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('user', 'department_position', 'position')),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  department text,
  position text,
  menu_key text NOT NULL,
  access_level text NOT NULL CHECK (access_level IN ('read', 'edit')),
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_grant_scope_shape CHECK (
    (scope = 'user' AND user_id IS NOT NULL AND department IS NULL AND position IS NULL)
    OR (
      scope = 'department_position'
      AND user_id IS NULL
      AND department IS NOT NULL
      AND position IS NOT NULL
    )
    OR (scope = 'position' AND user_id IS NULL AND department IS NULL AND position IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS access_grant_user_menu_uidx
  ON public.access_menu_grant (user_id, menu_key)
  WHERE scope = 'user';

CREATE UNIQUE INDEX IF NOT EXISTS access_grant_dept_pos_menu_uidx
  ON public.access_menu_grant (department, position, menu_key)
  WHERE scope = 'department_position';

CREATE UNIQUE INDEX IF NOT EXISTS access_grant_pos_menu_uidx
  ON public.access_menu_grant (position, menu_key)
  WHERE scope = 'position';

CREATE INDEX IF NOT EXISTS access_grant_menu_key_idx
  ON public.access_menu_grant (menu_key);

DROP TRIGGER IF EXISTS access_menu_grant_set_updated_at ON public.access_menu_grant;
CREATE TRIGGER access_menu_grant_set_updated_at
  BEFORE UPDATE ON public.access_menu_grant
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.access_menu_grant ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_active = true AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

DROP POLICY IF EXISTS access_grant_select ON public.access_menu_grant;
CREATE POLICY access_grant_select ON public.access_menu_grant
  FOR SELECT TO authenticated
  USING (private.is_authenticated_active());

DROP POLICY IF EXISTS access_grant_insert ON public.access_menu_grant;
CREATE POLICY access_grant_insert ON public.access_menu_grant
  FOR INSERT TO authenticated
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS access_grant_update ON public.access_menu_grant;
CREATE POLICY access_grant_update ON public.access_menu_grant
  FOR UPDATE TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS access_grant_delete ON public.access_menu_grant;
CREATE POLICY access_grant_delete ON public.access_menu_grant
  FOR DELETE TO authenticated
  USING (private.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_menu_grant TO authenticated;

-- ─── Seed (idempotent) ───────────────────────────────────────────────────────
-- One row per (scope key, menu_key). Higher level wins in app resolve if multiple scopes match.

-- plan: operator read · approve positions edit
INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
VALUES
  ('position', 'operator', 'plan', 'read'),
  ('position', 'admin', 'plan', 'edit'),
  ('position', 'manager', 'plan', 'edit'),
  ('position', 'supervisor', 'plan', 'edit')
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- ops_dashboard: admin/manager + planner supervisors
INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
VALUES
  ('position', 'admin', 'ops_dashboard', 'read'),
  ('position', 'manager', 'ops_dashboard', 'read')
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

INSERT INTO public.access_menu_grant (scope, department, position, menu_key, access_level)
VALUES
  ('department_position', 'planner', 'supervisor', 'ops_dashboard', 'read'),
  ('department_position', 'planner', 'operator', 'ops_dashboard', 'read'),
  ('department_position', 'planner', 'admin', 'ops_dashboard', 'read'),
  ('department_position', 'planner', 'manager', 'ops_dashboard', 'read')
ON CONFLICT (department, position, menu_key) WHERE (scope = 'department_position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- Quality screens: quality dept all positions + admin/manager position
INSERT INTO public.access_menu_grant (scope, department, position, menu_key, access_level)
SELECT
  'department_position',
  'quality',
  p.pos,
  m.menu_key,
  'edit'
FROM (VALUES ('admin'), ('manager'), ('supervisor'), ('operator')) AS p(pos)
CROSS JOIN (VALUES ('qc_form'), ('box_grade')) AS m(menu_key)
ON CONFLICT (department, position, menu_key) WHERE (scope = 'department_position')
DO UPDATE SET access_level = EXCLUDED.access_level;

INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
VALUES
  ('position', 'admin', 'qc_form', 'edit'),
  ('position', 'admin', 'box_grade', 'edit'),
  ('position', 'manager', 'qc_form', 'edit'),
  ('position', 'manager', 'box_grade', 'edit')
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- Post Production entry screens
INSERT INTO public.access_menu_grant (scope, department, position, menu_key, access_level)
SELECT
  'department_position',
  'post_production',
  p.pos,
  m.menu_key,
  'edit'
FROM (VALUES ('admin'), ('manager'), ('supervisor'), ('operator')) AS p(pos)
CROSS JOIN (
  VALUES ('box_status'), ('batch_detail'), ('rejection'), ('backlog')
) AS m(menu_key)
ON CONFLICT (department, position, menu_key) WHERE (scope = 'department_position')
DO UPDATE SET access_level = EXCLUDED.access_level;

INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
SELECT
  'position',
  p.pos,
  m.menu_key,
  'edit'
FROM (VALUES ('admin'), ('manager')) AS p(pos)
CROSS JOIN (
  VALUES ('box_status'), ('batch_detail'), ('rejection'), ('backlog')
) AS m(menu_key)
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- camera / repass: approve positions
INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
SELECT
  'position',
  p.pos,
  m.menu_key,
  'edit'
FROM (VALUES ('admin'), ('manager'), ('supervisor')) AS p(pos)
CROSS JOIN (VALUES ('camera'), ('repass')) AS m(menu_key)
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

COMMENT ON TABLE public.access_menu_grant IS
  'Phase 11 menu grants: user > department_position > position. Levels: read|edit.';
