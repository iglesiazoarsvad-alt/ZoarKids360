begin;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select private.current_app_role() in ('admin', 'pastor', 'maestro')
       and exists (
           select 1
             from public.usuarios as app_user
            where app_user.auth_user_id = auth.uid()
              and app_user.rol = private.current_app_role()
       );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
    select private.current_app_role() = 'admin'
       and exists (
           select 1
             from public.usuarios as app_user
            where app_user.auth_user_id = auth.uid()
              and app_user.rol = 'admin'
       );
$$;

revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

drop policy if exists usuarios_insert_self_teacher on public.usuarios;

commit;
