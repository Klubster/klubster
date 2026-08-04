-- 20260804100000 — Storage : la lecture des pièces suit la matrice de rôles.
--
-- La promesse publique dit : « les pièces ne sont visibles que par les personnes
-- autorisées de votre association ». Les tables tiennent cette promesse depuis 0008
-- (lecture pieces_adherent : président et secrétaire). Mais la politique STORAGE
-- `pieces_admin_read` (0013) autorisait la lecture de tout le préfixe de
-- l'organisation à N'IMPORTE QUEL membre authentifié du club — trésorier, encadrant
-- et lecture seule compris. La barrière par rôle n'existait que dans l'application
-- (la route de consultation). Un appel Storage direct la contournait.
--
-- La politique s'aligne sur la matrice : président, secrétaire, super-admin.
-- L'adhérent garde l'accès à SON dossier (pieces_member_rw, inchangée).
--
-- RETOUR ARRIÈRE : rejouer le bloc `pieces_admin_read` de la migration 0013.

do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'pieces_admin_read') then
    drop policy pieces_admin_read on storage.objects;
  end if;
  create policy pieces_admin_read on storage.objects
    for select to authenticated
    using (
      bucket_id = 'pieces'
      and (
        (
          (storage.foldername(name))[1] = public.current_org_id()::text
          and public.a_role_asso(array['admin_asso','secretaire'])
        )
        or public.is_super_admin()
      )
    );
end $$;
