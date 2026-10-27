begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_app_role()
returns text
language sql
stable
set search_path = ''
as $$
    select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
set search_path = ''
as $$
    select private.current_app_role() in ('admin', 'pastor', 'maestro');
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
    select private.current_app_role() = 'admin';
$$;

grant execute on function private.current_app_role() to authenticated, service_role;
grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

alter table public.asistencia add column if not exists maestro_email text;
create table if not exists public.push_tokens (
    email text not null,
    token text not null,
    actualizado_en timestamptz not null default now()
);
alter table public.push_tokens
    add column if not exists actualizado_en timestamptz not null default now();

alter table public.alumnos enable row level security;
alter table public.usuarios enable row level security;
alter table public.lecciones enable row level security;
alter table public.mensajes enable row level security;
alter table public.asistencia enable row level security;
alter table public.preguntas_seguridad enable row level security;
alter table public.push_tokens enable row level security;
grant select, insert, update, delete on public.push_tokens to authenticated;

do $$
declare
    existing_policy record;
begin
    for existing_policy in
        select schemaname, tablename, policyname
          from pg_policies
         where schemaname = 'public'
           and tablename = any(array[
               'alumnos',
               'usuarios',
               'lecciones',
               'mensajes',
               'asistencia',
               'preguntas_seguridad',
               'push_tokens'
           ])
    loop
        execute format(
            'drop policy if exists %I on %I.%I',
            existing_policy.policyname,
            existing_policy.schemaname,
            existing_policy.tablename
        );
    end loop;
end;
$$;

drop policy if exists alumnos_read_staff on public.alumnos;
create policy alumnos_read_staff on public.alumnos
    for select to authenticated using (private.is_staff());
drop policy if exists alumnos_insert_staff on public.alumnos;
create policy alumnos_insert_staff on public.alumnos
    for insert to authenticated with check (private.is_staff());
drop policy if exists alumnos_update_admin on public.alumnos;
create policy alumnos_update_admin on public.alumnos
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists alumnos_delete_admin on public.alumnos;
create policy alumnos_delete_admin on public.alumnos
    for delete to authenticated using (private.is_admin());

drop policy if exists usuarios_read_staff on public.usuarios;
create policy usuarios_read_staff on public.usuarios
    for select to authenticated using (private.is_staff());
drop policy if exists usuarios_insert_self_teacher on public.usuarios;
create policy usuarios_insert_self_teacher on public.usuarios
    for insert to authenticated
    with check (
        lower(email) = lower(auth.jwt() ->> 'email')
        and rol = 'maestro'
        and private.current_app_role() = 'maestro'
    );
drop policy if exists usuarios_update_admin on public.usuarios;
create policy usuarios_update_admin on public.usuarios
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists usuarios_delete_admin on public.usuarios;
create policy usuarios_delete_admin on public.usuarios
    for delete to authenticated using (private.is_admin());

drop policy if exists lecciones_read_staff on public.lecciones;
create policy lecciones_read_staff on public.lecciones
    for select to authenticated using (private.is_staff());
drop policy if exists lecciones_insert_staff on public.lecciones;
create policy lecciones_insert_staff on public.lecciones
    for insert to authenticated with check (private.is_staff());
drop policy if exists lecciones_update_admin on public.lecciones;
create policy lecciones_update_admin on public.lecciones
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists lecciones_delete_admin on public.lecciones;
create policy lecciones_delete_admin on public.lecciones
    for delete to authenticated using (private.is_admin());

drop policy if exists mensajes_read_staff on public.mensajes;
create policy mensajes_read_staff on public.mensajes
    for select to authenticated using (private.is_staff());
drop policy if exists mensajes_insert_self on public.mensajes;
create policy mensajes_insert_self on public.mensajes
    for insert to authenticated
    with check (
        private.is_staff()
        and lower(emisor) = lower(auth.jwt() ->> 'email')
    );
drop policy if exists mensajes_update_admin on public.mensajes;
create policy mensajes_update_admin on public.mensajes
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists mensajes_delete_admin on public.mensajes;
create policy mensajes_delete_admin on public.mensajes
    for delete to authenticated using (private.is_admin());

drop policy if exists asistencia_read_staff on public.asistencia;
create policy asistencia_read_staff on public.asistencia
    for select to authenticated using (private.is_staff());
drop policy if exists asistencia_insert_self on public.asistencia;
create policy asistencia_insert_self on public.asistencia
    for insert to authenticated
    with check (
        private.is_staff()
        and lower(maestro_email) = lower(auth.jwt() ->> 'email')
    );
drop policy if exists asistencia_update_admin on public.asistencia;
create policy asistencia_update_admin on public.asistencia
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists asistencia_delete_admin on public.asistencia;
create policy asistencia_delete_admin on public.asistencia
    for delete to authenticated using (private.is_admin());

create or replace function private.sync_alumno_clases_totales()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    alumno_afectado integer;
begin
    if tg_op = 'DELETE' then
        alumno_afectado := old.alumno_id;
    else
        alumno_afectado := new.alumno_id;
    end if;

    update public.alumnos
       set clases_totales = (
           select count(*)
             from public.asistencia
            where alumno_id = alumno_afectado
              and presente is true
       )
     where id = alumno_afectado;

    if tg_op = 'DELETE' then
        return old;
    end if;
    return new;
end;
$$;
revoke all on function private.sync_alumno_clases_totales() from public, anon, authenticated;

drop trigger if exists asistencia_sync_clases_totales on public.asistencia;
create trigger asistencia_sync_clases_totales
    after insert or delete on public.asistencia
    for each row execute function private.sync_alumno_clases_totales();

drop policy if exists preguntas_seguridad_read_admin on public.preguntas_seguridad;
create policy preguntas_seguridad_read_admin on public.preguntas_seguridad
    for select to authenticated using (private.is_admin());
drop policy if exists preguntas_seguridad_insert_self on public.preguntas_seguridad;
create policy preguntas_seguridad_insert_self on public.preguntas_seguridad
    for insert to authenticated
    with check (lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists preguntas_seguridad_update_admin on public.preguntas_seguridad;
create policy preguntas_seguridad_update_admin on public.preguntas_seguridad
    for update to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists preguntas_seguridad_delete_admin on public.preguntas_seguridad;
create policy preguntas_seguridad_delete_admin on public.preguntas_seguridad
    for delete to authenticated using (private.is_admin());

with legacy_answers as (
    select ctid, encode(extensions.gen_random_bytes(16), 'hex') as salt
      from public.preguntas_seguridad
     where respuesta_hash is not null
       and respuesta_hash !~ '^sha256\$[a-f0-9]{32}\$[a-f0-9]{64}$'
)
update public.preguntas_seguridad as questions
   set respuesta_hash = 'sha256$' || legacy_answers.salt || '$' ||
       encode(
           extensions.digest(
               convert_to(legacy_answers.salt || ':' || lower(trim(questions.respuesta_hash)), 'UTF8'),
               'sha256'
           ),
           'hex'
       )
  from legacy_answers
 where questions.ctid = legacy_answers.ctid;

create table if not exists public.security_question_attempts (
    email text primary key,
    window_started_at timestamptz not null default now(),
    attempt_count integer not null default 0
);
alter table public.security_question_attempts enable row level security;
revoke all on public.security_question_attempts from public, anon, authenticated;
grant all on public.security_question_attempts to service_role;

create or replace function public.allow_security_question_attempt(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
    attempt_record public.security_question_attempts%rowtype;
begin
    insert into public.security_question_attempts (email)
    values (lower(trim(p_email)))
    on conflict (email) do nothing;

    select *
      into attempt_record
      from public.security_question_attempts
     where email = lower(trim(p_email))
     for update;

    if attempt_record.window_started_at < now() - interval '15 minutes' then
        update public.security_question_attempts
           set window_started_at = now(), attempt_count = 1
         where email = lower(trim(p_email));
        return true;
    end if;

    if attempt_record.attempt_count >= 5 then
        return false;
    end if;

    update public.security_question_attempts
       set attempt_count = attempt_count + 1
     where email = lower(trim(p_email));
    return true;
end;
$$;

revoke all on function public.allow_security_question_attempt(text) from public, anon, authenticated;
grant execute on function public.allow_security_question_attempt(text) to service_role;

create or replace function public.register_teacher_profile(
    p_auth_user_id uuid,
    p_email text,
    p_nombre text,
    p_codigo text,
    p_pregunta text,
    p_respuesta_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
    solicitud_id bigint;
    nombre_solicitud text;
begin
    if lower(trim(p_email)) !~ '^[^@[:space:]]+@iglesiazoarsv\.org$'
       or p_nombre is null or length(trim(p_nombre)) < 2
       or p_pregunta is null or length(trim(p_pregunta)) < 2
       or p_respuesta_hash !~ '^sha256\$[a-f0-9]{32}\$[a-f0-9]{64}$' then
        raise exception 'Datos de registro no válidos.';
    end if;

    if not exists (
        select 1
          from auth.users au
         where au.id = p_auth_user_id
           and lower(au.email) = lower(trim(p_email))
    ) then
        raise exception 'La cuenta de autenticación no existe.';
    end if;

    if exists (select 1 from public.usuarios u where lower(u.email) = lower(trim(p_email))) then
        raise exception 'El correo ya está registrado.';
    end if;

    select s.id, s.nombre
      into solicitud_id, nombre_solicitud
      from public.solicitudes s
     where s.codigo = upper(trim(p_codigo))
       and s.codigo_valido is true
       and coalesce(s.usuario_registrado, false) is false
       and s.codigo_expiracion > now()
     for update;

    if solicitud_id is null then
        raise exception 'El código es inválido, expiró o ya fue utilizado.';
    end if;

    insert into public.usuarios (
        email, nombre, rol, politicas_aceptadas, politicas_fecha, onboarding_completado
    )
    values (lower(trim(p_email)), nombre_solicitud, 'maestro', true, now(), false);

    insert into public.preguntas_seguridad (email, pregunta, respuesta_hash)
    values (lower(trim(p_email)), trim(p_pregunta), p_respuesta_hash);

    update public.solicitudes
       set usuario_registrado = true, codigo_valido = false
     where id = solicitud_id;
    return nombre_solicitud;
end;
$$;

revoke all on function public.register_teacher_profile(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_teacher_profile(uuid, text, text, text, text, text) to service_role;

create or replace function private.sync_user_role_claim()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    if new.rol not in ('admin', 'pastor', 'maestro') then
        raise exception 'Rol de usuario no válido.';
    end if;
    update auth.users
       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
           || jsonb_build_object('role', new.rol)
     where lower(email) = lower(new.email);
    return new;
end;
$$;
revoke all on function private.sync_user_role_claim() from public, anon, authenticated;

drop trigger if exists usuarios_sync_app_role on public.usuarios;
create trigger usuarios_sync_app_role
    after insert or update of rol on public.usuarios
    for each row execute function private.sync_user_role_claim();

update auth.users as auth_user
   set raw_app_meta_data = coalesce(auth_user.raw_app_meta_data, '{}'::jsonb)
       || jsonb_build_object('role', app_user.rol)
  from public.usuarios as app_user
 where lower(auth_user.email) = lower(app_user.email)
   and app_user.rol in ('admin', 'pastor', 'maestro');

delete from public.push_tokens older
 using public.push_tokens newer
 where older.email = newer.email
   and older.token = newer.token
   and older.ctid < newer.ctid;

create unique index if not exists push_tokens_email_token_uidx
    on public.push_tokens (email, token);
drop policy if exists push_tokens_read_self on public.push_tokens;
create policy push_tokens_read_self on public.push_tokens
    for select to authenticated
    using (lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists push_tokens_insert_self on public.push_tokens;
create policy push_tokens_insert_self on public.push_tokens
    for insert to authenticated
    with check (lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists push_tokens_update_self on public.push_tokens;
create policy push_tokens_update_self on public.push_tokens
    for update to authenticated
    using (lower(email) = lower(auth.jwt() ->> 'email'))
    with check (lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists push_tokens_delete_self on public.push_tokens;
create policy push_tokens_delete_self on public.push_tokens
    for delete to authenticated
    using (lower(email) = lower(auth.jwt() ->> 'email'));
alter table public.push_tokens enable row level security;

commit;
