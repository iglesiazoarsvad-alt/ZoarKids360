alter table public.solicitudes
    add column if not exists codigo_usado boolean not null default false;

update public.solicitudes
   set codigo_usado = true
 where coalesce(usuario_registrado, false) is true;

create or replace function private.sync_invitation_code_used()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    if new.usuario_registrado is true then
        new.codigo_usado := true;
    end if;
    return new;
end;
$$;

revoke all on function private.sync_invitation_code_used() from public, anon, authenticated;

drop trigger if exists solicitudes_mark_code_used on public.solicitudes;
create trigger solicitudes_mark_code_used
    before update of usuario_registrado on public.solicitudes
    for each row execute function private.sync_invitation_code_used();
