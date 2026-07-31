-- Les règlements ne se lisent plus par simple appartenance au club.
--
-- CE QUI ÉTAIT OUVERT
-- `reglements_read_org` autorisait la lecture à tout membre dont `current_org_id()`
-- correspond, sans distinction de rôle. Or `reglements` porte le carnet de chèques du
-- club, et il se joint sans effort à `adhesions` puis `adherents` — eux aussi lisibles
-- par toute l'organisation. Une seule requête PostgREST suffisait :
--
--   GET /rest/v1/reglements?select=montant_centimes,mode,created_at,remis_le,
--       adhesion:adhesions(adherent:adherents(prenom,nom),cours:cours(nom))
--
-- et un encadrant, ou un accès en lecture seule, repartait avec les montants, les noms
-- des payeurs, les cours, les dates d'encaissement et l'état de remise de tout le club.
--
-- L'écriture, elle, était déjà correctement restreinte (`reglements_write_role` :
-- président et trésorier). C'était donc bien la LECTURE, et elle seule, qui était ouverte.
--
-- POURQUOI C'EST RESTÉ INVISIBLE
-- Parce que l'interface, elle, était fermée : `/cockpit/paiements` et
-- `/cockpit/paiements/relances` appellent `peut(profile.role, "paiements")`. Un garde de
-- page ne protège que la page. C'est exactement la faille relevée le 30/07 sur les
-- campagnes de messages, sur une autre table.
--
-- CE QUE FAIT CETTE MIGRATION
-- Elle aligne la politique sur la matrice de `src/lib/roles.ts` :
--   peut(role, "paiements") === role ∈ { admin_asso, tresorier }  (+ super_admin)
-- Ni le secrétaire, ni l'encadrant, ni la lecture seule ne lisent plus les règlements.
--
-- CE QUI N'EST PAS CASSÉ, ET POURQUOI ON LE SAIT
-- 1. L'espace adhérent. Les profils `adherent` ont `organisation_id = NULL` en base
--    (vérifié en production le 30/07/2026) : `current_org_id()` renvoie NULL et
--    `organisation_id = NULL` n'est jamais vrai. Un adhérent ne lisait donc DÉJÀ pas
--    cette table. `espace/facture` l'avait anticipé et retombe sur le montant de
--    l'adhésion acquittée — le commentaire y est écrit noir sur blanc.
-- 2. Le webhook Stripe écrit en `service_role`, hors RLS.
-- 3. La console super-admin passe par `is_super_admin()`, préservé.
--
-- CE QUI CHANGE POUR LE SECRÉTAIRE, ET C'EST VOULU
-- Sa fiche d'adhérent n'affiche plus le total réglé, le reste dû ni l'historique des
-- règlements. C'est conforme à la description de son rôle — « Adhérents, dossiers,
-- pièces, santé, messages, site » — qui ne mentionne pas l'argent. Le code applicatif
-- masque désormais ces blocs au lieu d'afficher des zéros, parce qu'un « Réglé : 0 € »
-- provoqué par une RLS serait pire que rien : ce serait faux.

begin;

drop policy if exists reglements_read_org on public.reglements;

create policy reglements_read_role on public.reglements
  for select to authenticated
  using (
    (organisation_id = current_org_id() and a_role_asso(array['admin_asso','tresorier']))
    or is_super_admin()
  );

comment on policy reglements_read_role on public.reglements is
  'Lecture réservée aux rôles portant la permission « paiements » (président, trésorier) et au super-admin. Doit rester alignée sur MATRICE dans src/lib/roles.ts — tests/paiements-permissions.test.ts vérifie que les deux ne divergent pas.';

commit;
