-- RLS par rôle sur les tables sensibles (3e audit externe, 22/07/2026).
--
-- Constat : les policies `*_same_org` étaient en `FOR ALL` et ne vérifiaient que
-- l'appartenance au club. Comme le rôle `authenticated` dispose des droits INSERT/UPDATE/
-- DELETE sur ces tables, un membre de l'équipe avec un rôle faible (encadrant, lecture)
-- pouvait, en appelant PostgREST directement (hors interface), fabriquer des règlements,
-- modifier des adhérents ou altérer des pièces — en contournant la matrice de rôles que
-- les Server Actions appliquent pourtant côté serveur.
--
-- (Ce n'est ni inter-club — le cloisonnement par organisation tient — ni une escalade
-- super_admin : `profiles` n'accorde à `authenticated` qu'un UPDATE sur `nom`/`prenom`.)
--
-- Correctif : lecture large pour l'équipe (inchangé, sauf les pièces), mais ÉCRITURE
-- réservée aux rôles qui en ont l'usage. Les policies « self » (adhérent sur sa propre
-- fiche / ses pièces) sont préservées. Les écritures légitimes du produit passent soit
-- par une Server Action au rôle déjà contrôlé, soit par une RPC `SECURITY DEFINER` ou le
-- `service_role` (qui contournent la RLS) : aucune n'est cassée.
--
-- Mécanique : une policy `FOR SELECT` large + une policy `FOR ALL` au rôle. Sur SELECT,
-- les deux sont permissives et s'additionnent (lecture large) ; sur INSERT/UPDATE/DELETE,
-- seule la policy au rôle s'applique.

begin;

-- Helper de lecture large (équipe du club).
-- ADHÉRENTS — écriture : président, secrétaire (permission « adherents_ecriture »).
drop policy if exists adherents_same_org on public.adherents;
create policy adherents_read_org on public.adherents for select
  using (organisation_id = current_org_id() or is_super_admin());
create policy adherents_write_role on public.adherents for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());

-- ADHÉSIONS — écriture : président, secrétaire.
drop policy if exists adhesions_same_org on public.adhesions;
create policy adhesions_read_org on public.adhesions for select
  using (organisation_id = current_org_id() or is_super_admin());
create policy adhesions_write_role on public.adhesions for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());

-- COURS — écriture : président, secrétaire (permission « site »).
drop policy if exists cours_same_org on public.cours;
create policy cours_write_role on public.cours for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());
-- (la lecture publique cours_read_public + la lecture club existent déjà ; on rajoute la
--  lecture club « équipe » pour ne pas la perdre en retirant la policy FOR ALL)
create policy cours_read_org on public.cours for select
  using (organisation_id = current_org_id() or is_super_admin());

-- RÈGLEMENTS — écriture : président, trésorier (permission « paiements »).
-- Aucune écriture directe par le client authentifié dans le code : tout passe par les RPC
-- `enregistrer_reglement*` (SECURITY DEFINER) ou le webhook (service_role). La restriction
-- est donc de la défense en profondeur, sans impact fonctionnel.
drop policy if exists reglements_same_org on public.reglements;
create policy reglements_read_org on public.reglements for select
  using (organisation_id = current_org_id() or is_super_admin());
create policy reglements_write_role on public.reglements for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','tresorier'])) or is_super_admin());

-- PRÉSENCES — écriture : président, encadrant (permission « controle »).
drop policy if exists presences_same_org on public.presences;
create policy presences_read_org on public.presences for select
  using (organisation_id = current_org_id() or is_super_admin());
create policy presences_write_role on public.presences for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','encadrant'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','encadrant'])) or is_super_admin());

-- PIÈCES ADHÉRENT — documents sensibles (certificats médicaux, pièces de mineurs).
-- Lecture RESTREINTE au président et au secrétaire (au lieu de tout membre du club), plus
-- l'adhérent sur ses propres pièces (policy pieces_self_read conservée). Écriture : mêmes
-- rôles, plus le dépôt par l'adhérent (pieces_self_upload conservée).
drop policy if exists pieces_same_org on public.pieces_adherent;
create policy pieces_read_role on public.pieces_adherent for select
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());
create policy pieces_write_role on public.pieces_adherent for all
  using ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin())
  with check ((organisation_id = current_org_id() and a_role_asso(array['admin_asso','secretaire'])) or is_super_admin());

commit;
