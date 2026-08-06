-- Rendre attribuables les rôles que le produit propose depuis le 11/07/2026.
--
-- ═══ LE DÉFAUT ═══════════════════════════════════════════════════════════════════
--
-- `roles_benevoles_rbac` (20260711071424) introduit cinq rôles, crée `role_asso()` et
-- `a_role_asso()`, et s'en sert immédiatement dans les politiques RLS. Son propre
-- commentaire les énumère : admin_asso, tresorier, secretaire, encadrant, lecture.
--
-- Elle ne touche jamais à `profiles_role_check`. La contrainte posée par
-- `init_multitenant` le 29/06 n'a donc jamais été élargie :
--
--     CHECK (role = ANY (ARRAY['super_admin','admin_asso','encadrant','adherent']))
--
-- Le RBAC a été construit sur des valeurs que la table refuse d'enregistrer.
--
-- ═══ CE QUE ÇA CASSE, ET CE N'EST PAS SEULEMENT DEUX RÔLES ═══════════════════════
--
-- `equipe_ajouter` (20260711071601) rattache un compte à l'association ainsi :
--
--     update profiles set organisation_id = v_org,
--            role = coalesce(nullif(role,'adherent'),'lecture') where id = v_id;
--
-- Un compte ordinaire a `role = 'adherent'`. `nullif` rend donc `null`, et `coalesce`
-- rend `'lecture'` — une valeur hors contrainte. **Ajouter le moindre membre à son
-- équipe échoue.** Ce n'est pas une limitation de deux rôles sur cinq : c'est la
-- fonctionnalité Équipe entière qui ne fonctionne pas, depuis le premier jour.
--
-- Et `equipe_definir_role` valide explicitement les cinq rôles avant de faire un
-- `update` que la contrainte rejette : le président reçoit une erreur de contrainte
-- Postgres, pas un message du produit.
--
-- ═══ L'EFFET SUR LA CONFIDENTIALITÉ EST PROTECTEUR — À NE PAS INVERSER ═══════════
--
-- Aucune donnée n'a fuité par ce défaut, et c'est important de le dire dans ce sens :
-- les politiques qui accordent des droits à `tresorier` et `secretaire` n'ont jamais pu
-- matcher, donc elles étaient plus FERMÉES que ce qu'elles annonçaient. Élargir la
-- contrainte les rend actives pour la première fois. Ce n'est pas un simple déblocage
-- d'interface : c'est le moment où le RBAC commence réellement à accorder des droits.
--
-- D'où les tests d'accompagnement (`tests/db/20-roles.sql`), qui vérifient que chaque
-- rôle obtient EXACTEMENT ce que la matrice prévoit — en particulier qu'un trésorier ne
-- voit pas les questionnaires de santé (données art. 9 RGPD).
--
-- ═══ CE QUE FAIT CETTE MIGRATION ═════════════════════════════════════════════════
--
-- Elle élargit la contrainte aux sept valeurs réellement employées par le produit. Rien
-- d'autre : les politiques RLS, les RPC et la matrice de `src/lib/roles.ts` sont déjà
-- écrites pour ces rôles et n'ont pas besoin d'être touchées.
--
-- Aucune donnée n'est modifiée. Aucune ligne existante ne devient invalide : les quatre
-- valeurs actuelles restent autorisées. La migration est donc sûre à rejouer, et son
-- retour arrière consiste à reposer l'ancienne contrainte — possible tant qu'aucun
-- profil ne porte encore l'une des trois nouvelles valeurs.

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'super_admin',  -- exploitant Klubster, hors association
    'admin_asso',   -- président : tout
    'tresorier',    -- paiements et trésorerie ; JAMAIS les données de santé
    'secretaire',   -- adhérents, dossiers, pièces, santé, messages, site
    'encadrant',    -- contrôle terrain et présences ; ni santé ni paiements
    'lecture',      -- consultation seule
    'adherent'      -- membre côté public, hors équipe
  ));

comment on column public.profiles.role is
  'super_admin | admin_asso | tresorier | secretaire | encadrant | lecture | adherent. '
  'La matrice applicative correspondante est dans src/lib/roles.ts, et les droits en base '
  'dans les politiques de 0008, 0026 et roles_benevoles_rbac.';

-- ——— Le contrôle qui aurait évité tout ceci ————————————————————————————————————
--
-- La contrainte et la liste acceptée par `equipe_definir_role` doivent rester d'accord.
-- Elles ont divergé pendant trois semaines sans que rien ne le signale. On le vérifie
-- désormais à l'application de la migration : si une valeur acceptée par la RPC est
-- refusée par la contrainte, la migration échoue ici plutôt qu'en production, un soir de
-- forum des associations.
--
-- ON LIT LA DÉFINITION DE LA CONTRAINTE, ON N'ESSAIE PAS D'INSÉRER. Une première version
-- tentait un `insert` jetable par rôle : `profiles.id` référence `auth.users`, si bien que
-- la clé étrangère sautait AVANT la contrainte de rôle. Le contrôle échouait donc pour une
-- raison sans rapport avec ce qu'il prétendait vérifier — le pire état pour un garde-fou,
-- puisqu'il aurait fallu le débrancher pour avancer.
do $$
declare def text; manquants text := '';
         r text;
begin
  select pg_get_constraintdef(con.oid) into def
    from pg_constraint con join pg_class c on c.oid = con.conrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname = 'profiles' and con.conname = 'profiles_role_check';
  if def is null then raise exception 'profiles_role_check est absente.'; end if;

  foreach r in array array['admin_asso','tresorier','secretaire','encadrant','lecture'] loop
    if def not like '%' || r || '%' then manquants := manquants || r || ' '; end if;
  end loop;
  if manquants <> '' then
    raise exception 'Rôle(s) proposé(s) par equipe_definir_role mais absent(s) de profiles_role_check : %', manquants;
  end if;
  raise notice 'Les cinq rôles d''équipe sont attribuables.';
end $$;
