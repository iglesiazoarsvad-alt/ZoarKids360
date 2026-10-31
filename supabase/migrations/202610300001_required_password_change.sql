alter table public.usuarios
    add column if not exists requiere_cambio_clave boolean not null default false;
