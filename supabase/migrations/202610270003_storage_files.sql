begin;

alter table public.lecciones
    add column if not exists hoja_trabajo text;

grant insert, delete on storage.objects to authenticated;

drop policy if exists zoarkids_staff_upload_own_media on storage.objects;
create policy zoarkids_staff_upload_own_media on storage.objects
    for insert to authenticated
    with check (
        bucket_id in ('galeria', 'lecciones')
        and private.is_staff()
        and lower((storage.foldername(name))[1]) = lower(auth.jwt() ->> 'email')
    );

drop policy if exists zoarkids_staff_delete_own_media on storage.objects;
create policy zoarkids_staff_delete_own_media on storage.objects
    for delete to authenticated
    using (
        bucket_id in ('galeria', 'lecciones')
        and private.is_staff()
        and lower((storage.foldername(name))[1]) = lower(auth.jwt() ->> 'email')
    );

commit;
