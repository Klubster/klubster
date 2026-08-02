
insert into storage.buckets (id, name, public)
values ('pieces', 'pieces', false)
on conflict (id) do nothing;

-- Membre : gère les fichiers de SON dossier (chemin = orgId/adherentId/fichier)
drop policy if exists "pieces_member_rw" on storage.objects;
create policy "pieces_member_rw" on storage.objects
  for all to authenticated
  using (bucket_id = 'pieces' and (storage.foldername(name))[2] in (select id::text from public.adherents where user_id = auth.uid()))
  with check (bucket_id = 'pieces' and (storage.foldername(name))[2] in (select id::text from public.adherents where user_id = auth.uid()));

-- Club : lit les fichiers de ses adhérents (chemin commence par son orgId)
drop policy if exists "pieces_admin_read" on storage.objects;
create policy "pieces_admin_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pieces' and ((storage.foldername(name))[1] = public.current_org_id()::text or public.is_super_admin()));
