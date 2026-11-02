CREATE TABLE IF NOT EXISTS public.legacy_auth_migration_attempts (
    email text PRIMARY KEY,
    window_started_at timestamptz NOT NULL DEFAULT now(),
    attempt_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.legacy_auth_migration_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_auth_migration_attempts FROM public, anon, authenticated;
GRANT ALL ON public.legacy_auth_migration_attempts TO service_role;

CREATE OR REPLACE FUNCTION public.allow_legacy_auth_migration_attempt(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    attempt_record public.legacy_auth_migration_attempts%rowtype;
BEGIN
    INSERT INTO public.legacy_auth_migration_attempts (email)
    VALUES (lower(trim(p_email)))
    ON CONFLICT (email) DO NOTHING;

    SELECT *
      INTO attempt_record
      FROM public.legacy_auth_migration_attempts
     WHERE email = lower(trim(p_email))
     FOR UPDATE;

    IF attempt_record.window_started_at < now() - interval '15 minutes' THEN
        UPDATE public.legacy_auth_migration_attempts
           SET window_started_at = now(), attempt_count = 1
         WHERE email = lower(trim(p_email));
        RETURN true;
    END IF;

    IF attempt_record.attempt_count >= 5 THEN
        RETURN false;
    END IF;

    UPDATE public.legacy_auth_migration_attempts
       SET attempt_count = attempt_count + 1
     WHERE email = lower(trim(p_email));
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.allow_legacy_auth_migration_attempt(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_legacy_auth_migration_attempt(text) TO service_role;
