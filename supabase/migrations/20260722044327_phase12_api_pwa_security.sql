-- Phase 12: API rate limit + auth/session idempotency (server/service_role only)

-- ─── Rate limit ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.api_rate_limit (
  bucket text NOT NULL,
  subject text NOT NULL,
  window_started_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, subject)
);

CREATE INDEX IF NOT EXISTS api_rate_limit_window_idx
  ON public.api_rate_limit (window_started_at);

ALTER TABLE public.api_rate_limit ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_rate_limit FROM PUBLIC;
REVOKE ALL ON TABLE public.api_rate_limit FROM anon, authenticated;
GRANT ALL ON TABLE public.api_rate_limit TO service_role;

COMMENT ON TABLE public.api_rate_limit IS
  'Phase 12: fixed-window rate counters. Access only via service_role / SECURITY DEFINER RPC.';

CREATE OR REPLACE FUNCTION public.check_and_increment_rate_limit(
  p_bucket text,
  p_subject text,
  p_window_seconds integer,
  p_max_hits integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_row public.api_rate_limit%ROWTYPE;
  v_retry integer;
  v_window interval;
BEGIN
  IF p_bucket IS NULL OR length(trim(p_bucket)) = 0 THEN
    RAISE EXCEPTION 'bucket required';
  END IF;
  IF p_subject IS NULL OR length(trim(p_subject)) = 0 THEN
    RAISE EXCEPTION 'subject required';
  END IF;
  IF p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'window_seconds invalid';
  END IF;
  IF p_max_hits IS NULL OR p_max_hits < 1 THEN
    RAISE EXCEPTION 'max_hits invalid';
  END IF;

  v_window := make_interval(secs => p_window_seconds);

  -- Opportunistic cleanup of stale windows
  DELETE FROM public.api_rate_limit
  WHERE window_started_at < v_now - greatest(v_window * 3, interval '1 hour');

  LOOP
    SELECT * INTO v_row
    FROM public.api_rate_limit
    WHERE bucket = p_bucket AND subject = p_subject
    FOR UPDATE;

    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.api_rate_limit (bucket, subject, window_started_at, hit_count)
        VALUES (p_bucket, p_subject, v_now, 1);
        RETURN jsonb_build_object(
          'allowed', true,
          'remaining', p_max_hits - 1,
          'retry_after', 0
        );
      EXCEPTION
        WHEN unique_violation THEN
          CONTINUE;
      END;
    END IF;

    IF v_row.window_started_at + v_window <= v_now THEN
      UPDATE public.api_rate_limit
      SET window_started_at = v_now, hit_count = 1
      WHERE bucket = p_bucket AND subject = p_subject;
      RETURN jsonb_build_object(
        'allowed', true,
        'remaining', p_max_hits - 1,
        'retry_after', 0
      );
    END IF;

    IF v_row.hit_count >= p_max_hits THEN
      v_retry := ceil(
        extract(epoch FROM (v_row.window_started_at + v_window - v_now))
      )::integer;
      RETURN jsonb_build_object(
        'allowed', false,
        'remaining', 0,
        'retry_after', greatest(v_retry, 1)
      );
    END IF;

    UPDATE public.api_rate_limit
    SET hit_count = hit_count + 1
    WHERE bucket = p_bucket AND subject = p_subject;

    RETURN jsonb_build_object(
      'allowed', true,
      'remaining', p_max_hits - v_row.hit_count - 1,
      'retry_after', 0
    );
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) TO service_role;

COMMENT ON FUNCTION public.check_and_increment_rate_limit(text, text, integer, integer) IS
  'Phase 12: atomic fixed-window rate limit. service_role only.';

-- ─── Idempotency (auth/session) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.api_idempotency (
  scope text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  idempotency_key text NOT NULL,
  status_code integer NOT NULL,
  response_body jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  PRIMARY KEY (scope, user_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS api_idempotency_expires_idx
  ON public.api_idempotency (expires_at);

ALTER TABLE public.api_idempotency ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_idempotency FROM PUBLIC;
REVOKE ALL ON TABLE public.api_idempotency FROM anon, authenticated;
GRANT ALL ON TABLE public.api_idempotency TO service_role;

COMMENT ON TABLE public.api_idempotency IS
  'Phase 12: short-lived idempotent API responses. service_role only. Scope auth_session first.';
