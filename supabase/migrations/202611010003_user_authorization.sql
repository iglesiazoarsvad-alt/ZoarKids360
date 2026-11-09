begin;

alter table public.usuarios
    add column if not exists autorizado boolean not null default false;

alter table public.usuarios
    add column if not exists activo boolean not null default true;

update public.usuarios
   set autorizado = true
 where rol in ('admin', 'pastor');

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
              and app_user.autorizado is true
              and app_user.activo is true
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
              and app_user.autorizado is true
              and app_user.activo is true
       );
$$;

drop policy if exists usuarios_read_own_profile on public.usuarios;
create policy usuarios_read_own_profile on public.usuarios
    for select to authenticated
    using (auth_user_id = auth.uid());

revoke all on function private.is_staff() from public, anon;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_staff() to authenticated, service_role;
grant execute on function private.is_admin() to authenticated, service_role;

commit;
