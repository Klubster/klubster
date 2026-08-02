-- LA MATRICE DES RÔLES — et le défaut qu'elle met au jour.
--
-- `CLAUDE.md` pose la règle : « Matrice de rôles EN BASE, pas seulement en UI :
-- règlements → président/trésorier ; cours et adhérents → président/secrétaire ;
-- présences → président/encadrant. Lecture des pièces et des questionnaires de santé :
-- président et secrétaire uniquement. »
--
-- Les politiques de `0008` sont bien écrites en ce sens. Ce fichier vérifie qu'elles
-- font ce qu'elles disent — et découvre que deux des cinq rôles ne peuvent pas exister.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LE TRÉSORIER ET LE SECRÉTAIRE SONT INATTRIBUABLES
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Trois faits, chacun vérifiable dans le dépôt :
--
--   a) `src/lib/roles.ts` propose cinq rôles au président : admin_asso, tresorier,
--      secretaire, encadrant, lecture.
--   b) `equipe_definir_role` (0013) les accepte explicitement tous les cinq :
--        if p_role not in ('admin_asso','tresorier','secretaire','encadrant','lecture')
--          then raise exception 'Rôle invalide.'; end if;
--   c) la contrainte de `profiles.role`, posée par `0001` et jamais élargie, n'autorise
--      que quatre valeurs :
--        CHECK (role = ANY (ARRAY['super_admin','admin_asso','encadrant','adherent']))
--
-- [Vérifié le 02/08/2026] cette contrainte est IDENTIQUE sur la base de production. Ce
-- n'est donc pas un artefact de reconstruction : un président qui nomme quelqu'un
-- « Trésorier » ou « Secrétaire » dans le cockpit déclenche une violation de contrainte.
-- Des cinq rôles proposés, seul « Encadrant » est réellement attribuable.
--
-- CONSÉQUENCE. Toutes les branches `tresorier` et `secretaire` des politiques de `0008`
-- sont du code mort : aucune ligne de `profiles` ne peut porter ces valeurs. La matrice
-- des rôles se réduit en pratique à président / encadrant / adhérent, et
-- `peut(role, action)` de `src/lib/roles.ts` décrit des droits que la base ne connaît pas.
--
-- La migration qui aurait élargi cette contrainte s'appelle `roles_benevoles_rbac`
-- (11/07/2026) — elle fait partie des 47 migrations appliquées en production mais
-- absentes du dépôt. Elle n'a manifestement pas touché à cette contrainte.
--
-- Ce test PROUVE l'échec plutôt que de le contourner. Le jour où la contrainte sera
-- élargie, il échouera — et ce sera le signal que le défaut est corrigé, pas une gêne.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  declare
    a_reussi boolean := false;
    message  text;
  begin
    begin
      perform public.equipe_definir_role('0a000000-0000-4000-8000-0000000000a4'::uuid, 'tresorier');
      a_reussi := true;
    exception when others then
      message := sqlerrm;
    end;

    if a_reussi then
      raise exception 'RÉSOLU : « tresorier » est désormais attribuable. Mettre à jour ce test et CLAUDE.md.';
    end if;

    -- On vérifie que l'échec vient bien de la CONTRAINTE, et pas d'un contrôle de rôle
    -- ou d'une faute de frappe : un test qui accepte n'importe quelle erreur finit par
    -- passer pour de mauvaises raisons.
    if message not like '%profiles_role_check%' and message not like '%violates check constraint%' then
      raise exception 'échec inattendu (pas la contrainte) : %', message;
    end if;
    raise notice '[DÉFAUT CONFIRMÉ] « tresorier » refusé par profiles_role_check.';
  end $$;
rollback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. CE QUE LES RÔLES RÉELLEMENT ATTRIBUABLES PEUVENT FAIRE
-- ═══════════════════════════════════════════════════════════════════════════════

-- L'encadrant pointe les présences — c'est tout son métier, au bord du tapis.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
  do $$
  declare ok boolean := false;
  begin
    begin
      insert into public.presences (organisation_id, adherent_id, date)
      values ('0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d2', current_date);
      ok := true;
    exception when others then ok := false;
    end;
    if not ok then raise exception 'un encadrant ne peut pas pointer une présence'; end if;
    raise notice 'encadrant : présence pointée.';
  end $$;
rollback;

-- Mais il ne touche pas à l'argent. `0026` réserve l'écriture financière au président et
-- au trésorier — et comme le trésorier est inattribuable, au président seul.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
  do $$
  declare a_ecrit boolean := false;
  begin
    begin
      insert into public.reglements (organisation_id, adhesion_id, montant_centimes, mode)
      values ('0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000e2', 5000, 'especes');
      a_ecrit := true;
    exception when others then a_ecrit := false;
    end;
    if a_ecrit then raise exception 'FUITE : un encadrant a enregistré un règlement'; end if;
    raise notice 'encadrant : écriture financière refusée.';
  end $$;
rollback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. LES DONNÉES DE SANTÉ (art. 9 RGPD)
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- `0008` réserve la lecture des questionnaires et des pièces à `admin_asso` et
-- `secretaire`. Le secrétaire étant inattribuable, seul le président lit — ce qui est
-- PLUS restrictif que la règle écrite, donc sans danger. On mesure les deux côtés.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  declare n integer;
  begin
    select count(*) into n from public.questionnaires_sante;
    if n <> 1 then raise exception 'le président voit % questionnaire(s), attendu 1', n; end if;
    select count(*) into n from public.pieces_adherent;
    if n <> 1 then raise exception 'le président voit % piece(s), attendu 1', n; end if;
  end $$;
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a2","role":"authenticated"}';
  do $$
  declare n integer;
  begin
    -- L'encadrant n'a rien à faire dans les dossiers médicaux.
    select count(*) into n from public.questionnaires_sante;
    if n <> 0 then raise exception 'FUITE SANTÉ : un encadrant voit % questionnaire(s)', n; end if;
    select count(*) into n from public.pieces_adherent;
    if n <> 0 then raise exception 'FUITE : un encadrant voit % piece(s)', n; end if;
    raise notice 'encadrant : santé et pièces invisibles.';
  end $$;
rollback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. LE SUPER-ADMIN VOIT TOUT — ET C'EST VOULU
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- `is_super_admin()` ouvre toutes les politiques. C'est un choix assumé, documenté au
-- registre des traitements. Le test le fixe pour qu'un élargissement accidentel du rôle
-- se voie : si un jour un compte non super-admin passait ce test, c'est qu'il aurait
-- gagné une portée qu'il ne devrait pas avoir.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"ff000000-0000-4000-8000-0000000000f1","role":"authenticated"}';
  do $$
  declare n integer;
  begin
    select count(*) into n from public.adherents;
    if n <> 3 then raise exception 'le super-admin voit % adherents, attendu 3 (les deux clubs)', n; end if;
    raise notice 'super-admin : les deux clubs visibles (choix assumé).';
  end $$;
rollback;
