ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE public.usuarios AS usuario
SET auth_user_id = auth_user.id
FROM auth.users AS auth_user
WHERE usuario.auth_user_id IS NULL
  AND lower(trim(usuario.email)) = lower(trim(auth_user.email));

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_auth_user_id_unique
ON public.usuarios (auth_user_id)
WHERE auth_user_id IS NOT NULL;
