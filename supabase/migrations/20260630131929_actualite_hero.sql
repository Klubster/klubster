
alter table public.organisations add column if not exists actualite jsonb;

-- Bucket public pour l'image d'actualité (lecture publique, écriture limitée à l'admin du club).
insert into storage.buckets (id, name, public)
values ('actualites', 'actualites', true)
on conflict (id) do nothing;

drop policy if exists "actualites_public_read" on storage.objects;
create policy "actualites_public_read" on storage.objects
  for select to public
  using (bucket_id = 'actualites');

drop policy if exists "actualites_admin_insert" on storage.objects;
create policy "actualites_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'actualites' and (storage.foldername(name))[1] = public.current_org_id()::text);

drop policy if exists "actualites_admin_update" on storage.objects;
create policy "actualites_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'actualites' and (storage.foldername(name))[1] = public.current_org_id()::text)
  with check (bucket_id = 'actualites' and (storage.foldername(name))[1] = public.current_org_id()::text);

drop policy if exists "actualites_admin_delete" on storage.objects;
create policy "actualites_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'actualites' and (storage.foldername(name))[1] = public.current_org_id()::text);
