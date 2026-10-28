begin;

alter table public.mensajes
    add column if not exists eliminado_para text[] not null default '{}';

drop policy if exists mensajes_update_own_soft_delete on public.mensajes;
create policy mensajes_update_own_soft_delete on public.mensajes
    for update to authenticated
    using (lower(emisor) = lower(auth.jwt() ->> 'email'))
    with check (lower(emisor) = lower(auth.jwt() ->> 'email'));

revoke update on public.mensajes from authenticated;
grant update (eliminado_para) on public.mensajes to authenticated;

create or replace function private.validar_borrado_logico_mensaje()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    correo text := lower(auth.jwt() ->> 'email');
    eliminados_anteriores text[] := coalesce(old.eliminado_para, '{}'::text[]);
    eliminados_nuevos text[] := coalesce(new.eliminado_para, '{}'::text[]);
begin
    if private.is_admin() then
        return new;
    end if;
    if lower(old.emisor) <> correo
       or not (eliminados_nuevos @> eliminados_anteriores)
       or not (eliminados_nuevos @> array[correo])
       or not (eliminados_nuevos <@ (eliminados_anteriores || array[correo])) then
        raise exception 'Solo puedes ocultar tus propios mensajes para tu cuenta';
    end if;
    return new;
end;
$$;

drop trigger if exists validar_borrado_logico_mensaje on public.mensajes;
create trigger validar_borrado_logico_mensaje
    before update of eliminado_para on public.mensajes
    for each row execute function private.validar_borrado_logico_mensaje();

drop policy if exists push_tokens_read_self on public.push_tokens;
drop policy if exists push_tokens_read_chat_participants on public.push_tokens;
create policy push_tokens_read_chat_participants on public.push_tokens
    for select to authenticated
    using (
        lower(email) = lower(auth.jwt() ->> 'email')
        or private.is_admin()
        or exists (
            select 1
              from public.mensajes m
             where lower(m.emisor) = lower(auth.jwt() ->> 'email')
               and lower(m.receptor) = lower(push_tokens.email)
        )
    );

commit;
