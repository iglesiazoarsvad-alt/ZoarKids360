CREATE OR REPLACE FUNCTION public.allow_security_question_attempt(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    attempt_record public.security_question_attempts%rowtype;
BEGIN
    INSERT INTO public.security_question_attempts (email)
    VALUES (lower(trim(p_email)))
    ON CONFLICT (email) DO NOTHING;

    SELECT *
      INTO attempt_record
      FROM public.security_question_attempts
     WHERE email = lower(trim(p_email))
     FOR UPDATE;

    IF attempt_record.window_started_at < now() - interval '15 minutes' THEN
        UPDATE public.security_question_attempts
           SET window_started_at = now(), attempt_count = 1
         WHERE email = lower(trim(p_email));
        RETURN true;
    END IF;

    IF attempt_record.attempt_count >= 100 THEN
        RETURN false;
    END IF;

    UPDATE public.security_question_attempts
       SET attempt_count = attempt_count + 1
     WHERE email = lower(trim(p_email));
    RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.allow_security_question_attempt(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allow_security_question_attempt(text) TO service_role;

UPDATE public.security_question_attempts
   SET window_started_at = now(), attempt_count = 0;
