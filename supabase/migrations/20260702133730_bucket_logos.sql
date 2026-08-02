-- Bucket public pour les logos de clubs (uploadé à la création via /creer, modifiable ensuite).
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos_public_read" on storage.objects;
create policy "logos_public_read" on storage.objects
  for select using (bucket_id = 'logos');

drop policy if exists "logos_admin_insert" on storage.objects;
create policy "logos_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'logos' and (storage.foldername(name))[1] = (current_org_id())::text
  );

drop policy if exists "logos_admin_update" on storage.objects;
create policy "logos_admin_update" on storage.objects
  for update
  using (bucket_id = 'logos' and (storage.foldername(name))[1] = (current_org_id())::text)
  with check (bucket_id = 'logos' and (storage.foldername(name))[1] = (current_org_id())::text);

drop policy if exists "logos_admin_delete" on storage.objects;
create policy "logos_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'logos' and (storage.foldername(name))[1] = (current_org_id())::text
  );