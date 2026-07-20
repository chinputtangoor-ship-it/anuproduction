-- Phase 9: feature flags, single-session columns, realtime publication

-- ─── Feature flags ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  description text,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_feature_flags (key, enabled, description) VALUES
  ('realtime', false, 'Supabase Realtime live updates on hot tables'),
  ('pwa_install_banner', true, 'Show PWA install banner for 20 seconds'),
  ('single_session', true, 'One login / one active device session'),
  ('swr_client_cache', true, 'SWR stale-while-revalidate client cache')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_feature_flags_select ON public.app_feature_flags;
CREATE POLICY app_feature_flags_select ON public.app_feature_flags
  FOR SELECT TO authenticated
  USING (private.is_authenticated_active());

DROP POLICY IF EXISTS app_feature_flags_admin_all ON public.app_feature_flags;
CREATE POLICY app_feature_flags_admin_all ON public.app_feature_flags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = true AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_active = true AND role = 'admin'
    )
  );

GRANT SELECT ON public.app_feature_flags TO authenticated;
GRANT UPDATE ON public.app_feature_flags TO authenticated;

-- ─── Single session on profiles ──────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_session_id text,
  ADD COLUMN IF NOT EXISTS active_session_version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS active_device_label text,
  ADD COLUMN IF NOT EXISTS session_updated_at timestamptz;

-- Users may update their own session claim fields
DROP POLICY IF EXISTS profiles_update_session_self ON public.profiles;
CREATE POLICY profiles_update_session_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() AND private.is_authenticated_active())
  WITH CHECK (id = auth.uid());

-- ─── Realtime (hot tables) ───────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.boxes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.production_plan;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rejection;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.backlog;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
