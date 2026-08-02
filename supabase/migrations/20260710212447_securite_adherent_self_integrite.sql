-- ADHÉRENTS : un adhérent (politique self) pouvait changer son organisation_id, son
-- user_id ou son jsonb infos. On limite les colonnes modifiables via authenticated à
-- l'état civil éditable. Le président édite les mêmes colonnes (modifierAdherent) ;
-- organisation_id / user_id / infos ne sont écrits qu'à l'INSERT (service_role ou
-- création côté club), jamais en UPDATE — le verrou ne casse donc aucun flux.
revoke update on public.adherents from authenticated;
grant update (prenom, nom, email, telephone) on public.adherents to authenticated;

-- PIÈCES : la politique self était en ALL — un adhérent pouvait marquer sa propre
-- pièce « recue » (dossier faussement complet avant un contrôle terrain) ou la supprimer.
-- On sépare : lecture libre de ses pièces, écriture possible SAUF passer à « recue »
-- (la validation reste au club, via la politique pieces_same_org).
drop policy if exists pieces_self on public.pieces_adherent;

create policy pieces_self_read on public.pieces_adherent
  for select using (
    adherent_id in (select id from public.adherents where user_id = auth.uid())
  );

create policy pieces_self_upload on public.pieces_adherent
  for update using (
    adherent_id in (select id from public.adherents where user_id = auth.uid())
  ) with check (
    adherent_id in (select id from public.adherents where user_id = auth.uid())
    and statut <> 'recue'
  );