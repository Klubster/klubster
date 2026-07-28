-- Écritures Storage : l'éditeur (super_admin) était bloqué par ses propres politiques.
--
-- `verifierPermission()` laisse un super_admin agir sur n'importe quel club — c'est ce
-- qui permet d'aider un président depuis son cockpit. Mais les politiques d'écriture des
-- buckets `sections`, `logos` et `actualites` ne testaient que `current_org_id()`, or le
-- profil super_admin n'a pas d'organisation : la comparaison échouait, et l'envoi était
-- refusé avec `new row violates row-level security policy` (renvoyé en HTTP 400).
--
-- On aligne ces politiques sur `pieces_admin_read`, qui prévoyait déjà l'échappatoire
-- `is_super_admin()`. La portée reste la même qu'aujourd'hui côté application : l'éditeur
-- peut déjà lire et modifier les données de tous les clubs.

-- sections (photos de sections, chapitres, modèles de pièces)
drop policy if exists sections_admin_insert on storage.objects;
create policy sections_admin_insert on storage.objects
  for insert
  with check (
    bucket_id = 'sections'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists sections_admin_update on storage.objects;
create policy sections_admin_update on storage.objects
  for update
  using (
    bucket_id = 'sections'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  )
  with check (
    bucket_id = 'sections'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists sections_admin_delete on storage.objects;
create policy sections_admin_delete on storage.objects
  for delete
  using (
    bucket_id = 'sections'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

-- logos
drop policy if exists logos_admin_insert on storage.objects;
create policy logos_admin_insert on storage.objects
  for insert
  with check (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists logos_admin_update on storage.objects;
create policy logos_admin_update on storage.objects
  for update
  using (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  )
  with check (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists logos_admin_delete on storage.objects;
create policy logos_admin_delete on storage.objects
  for delete
  using (
    bucket_id = 'logos'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

-- actualites
drop policy if exists actualites_admin_insert on storage.objects;
create policy actualites_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'actualites'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists actualites_admin_update on storage.objects;
create policy actualites_admin_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'actualites'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  )
  with check (
    bucket_id = 'actualites'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );

drop policy if exists actualites_admin_delete on storage.objects;
create policy actualites_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'actualites'
    and ((storage.foldername(name))[1] = (current_org_id())::text or is_super_admin())
  );
