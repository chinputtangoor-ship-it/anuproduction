-- Phase 11 clarify: default grants = department_position; position = factory-wide optional.
-- Re-seed plan/ops/quality/post around dept+position; keep position for cross-factory roles.

-- Clear prior position-wide plan "read for everyone" style rows we no longer want as default.
-- (Keep admin/manager/supervisor plan edit via position.)
DELETE FROM public.access_menu_grant
WHERE scope = 'position'
  AND menu_key = 'plan'
  AND position = 'operator'
  AND access_level = 'read';

-- plan read: every department × every position (default layer)
INSERT INTO public.access_menu_grant (scope, department, position, menu_key, access_level)
SELECT
  'department_position',
  d.dept,
  p.pos,
  'plan',
  'read'
FROM (
  VALUES
    ('planner'),
    ('quality'),
    ('production'),
    ('post_production'),
    ('warehouse'),
    ('human_resources'),
    ('account')
) AS d(dept)
CROSS JOIN (VALUES ('admin'), ('manager'), ('supervisor'), ('operator')) AS p(pos)
ON CONFLICT (department, position, menu_key) WHERE (scope = 'department_position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- plan edit: factory-wide approve positions (optional layer)
INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
VALUES
  ('position', 'admin', 'plan', 'edit'),
  ('position', 'manager', 'plan', 'edit'),
  ('position', 'supervisor', 'plan', 'edit')
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

-- ops_dashboard: Planner dept all positions (default) + admin/manager factory-wide
INSERT INTO public.access_menu_grant (scope, department, position, menu_key, access_level)
SELECT
  'department_position',
  'planner',
  p.pos,
  'ops_dashboard',
  'read'
FROM (VALUES ('admin'), ('manager'), ('supervisor'), ('operator')) AS p(pos)
ON CONFLICT (department, position, menu_key) WHERE (scope = 'department_position')
DO UPDATE SET access_level = EXCLUDED.access_level;

INSERT INTO public.access_menu_grant (scope, position, menu_key, access_level)
VALUES
  ('position', 'admin', 'ops_dashboard', 'read'),
  ('position', 'manager', 'ops_dashboard', 'read')
ON CONFLICT (position, menu_key) WHERE (scope = 'position')
DO UPDATE SET access_level = EXCLUDED.access_level;

COMMENT ON TABLE public.access_menu_grant IS
  'Phase 11: default=department_position; position=factory-wide optional; user overrides. Revoke=delete row.';
