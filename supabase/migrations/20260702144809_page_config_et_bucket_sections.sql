-- Mode édition de la page club : ordre des sections + sections personnalisées (photo/texte).
alter table public.organisations
  add column if not exists page_config jsonb;

-- Bucket public pour les photos des sections personnalisées.
insert into storage.buckets (id, name, public)
values ('sections', 'sections', true)
on conflict (id) do nothing;

drop policy if exists "sections_public_read" on storage.objects;
create policy "sections_public_read" on storage.objects
  for select using (bucket_id = 'sections');

drop policy if exists "sections_admin_insert" on storage.objects;
create policy "sections_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'sections' and (storage.foldername(name))[1] = (current_org_id())::text
  );

drop policy if exists "sections_admin_update" on storage.objects;
create policy "sections_admin_update" on storage.objects
  for update
  using (bucket_id = 'sections' and (storage.foldername(name))[1] = (current_org_id())::text)
  with check (bucket_id = 'sections' and (storage.foldername(name))[1] = (current_org_id())::text);

drop policy if exists "sections_admin_delete" on storage.objects;
create policy "sections_admin_delete" on storage.objects
  for delete using (
    bucket_id = 'sections' and (storage.foldername(name))[1] = (current_org_id())::text
  );