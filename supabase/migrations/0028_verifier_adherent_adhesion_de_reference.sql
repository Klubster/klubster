-- `verifier_adherent` — une seule adhésion de référence, choisie par une règle explicite.
--
-- ═══ CE QUI NE VA PAS DANS LA VERSION 0013 ═══════════════════════════════════════
--
-- Elle pose DEUX sous-requêtes indépendantes :
--
--     (select c.nom from adhesions ad … order by ad.created_at desc limit 1)   -- le cours
--     (select ad.statut = 'paye' from adhesions ad … order by ad.created_at desc limit 1)
--
-- Deux défauts se cumulent, et le second est plus grave que celui qui était consigné :
--
--   1. `created_at` est une DATE, pas un instant. Deux adhésions du même jour sont ex
--      æquo, et `order by … limit 1` n'est alors pas un ordre total : Postgres rend
--      l'une ou l'autre, sans garantie de rendre la même deux fois de suite.
--
--   2. Les deux sous-requêtes sont ÉVALUÉES SÉPARÉMENT. Rien n'oblige Postgres à
--      départager les ex æquo de la même façon dans les deux. L'écran du contrôle peut
--      donc afficher le COURS d'une adhésion et le RÈGLEMENT d'une autre — « Yoga
--      Nidra · à jour » pour quelqu'un qui a payé le Hatha et pas le Nidra.
--
-- Ce n'est pas une hypothèse de laboratoire : le cas se produit dès qu'un club saisit
-- un renouvellement le jour de l'inscription, ou corrige une adhésion dans la foulée.
--
-- ═══ LA RÈGLE MÉTIER, ÉCRITE PLUTÔT QUE DÉDUITE ══════════════════════════════════
--
-- La question posée au bord du tapis est : « cette personne peut-elle entrer ce soir,
-- et à quel cours ? ». L'adhésion de référence est donc, dans cet ordre :
--
--   1. LA SAISON COURANTE D'ABORD. Une adhésion de l'an dernier ne dit rien de ce soir.
--      Quelqu'un qui a renouvelé sans payer doit apparaître « non réglé », même si la
--      saison passée était soldée — c'était déjà l'intention de 0013, mais elle reposait
--      sur `created_at` seul, ce qui n'est pas la saison.
--
--   2. UNE ADHÉSION ACTIVE PRIME. `paye`, `en_attente` et `en_retard` décrivent une
--      inscription vivante. `liste_attente`, `annule` et `rembourse` ne donnent aucun
--      droit d'entrer : elles ne servent de référence que faute de mieux.
--
--   3. PUIS LA PLUS RÉCENTE (`created_at desc`).
--
--   4. PUIS L'IDENTIFIANT (`id desc`), UNIQUEMENT pour rendre l'ordre TOTAL. Un uuid ne
--      porte aucun sens chronologique ; il ne tranche donc rien de métier, il garantit
--      seulement que deux appels rendent la même ligne. C'est un départage de dernier
--      recours, et il ne doit jamais être le premier critère — c'est la raison pour
--      laquelle `docs/defauts-a-corriger.md` déconseillait de l'ajouter seul.
--
-- ═══ CE QUE CETTE MIGRATION NE FAIT PAS ══════════════════════════════════════════
--
-- Additive : elle remplace le corps d'une fonction, ne touche aucune table, aucune
-- colonne, aucune donnée. Retour arrière = rejouer le corps de 0013.
-- La signature est inchangée : `scanner/actions.ts` n'a pas besoin d'être modifié.

CREATE OR REPLACE FUNCTION public.verifier_adherent(p_adherent_id uuid)
 RETURNS TABLE(prenom text, nom text, cours text, regle boolean, pieces_manquantes integer, present_aujourdhui boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_org uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;

  return query
  select
    a.prenom,
    a.nom,
    -- `cours` ET `regle` sortent du MÊME `ref` : c'est tout l'objet de cette migration.
    (select c.nom from cours c where c.id = ref.cours_id),
    coalesce(ref.statut = 'paye', false),
    (select count(*)::int from pieces_adherent p
      where p.adherent_id = a.id and p.statut = 'manquante'),
    exists(select 1 from presences pr
            where pr.adherent_id = a.id and pr.date = current_date)
  from adherents a
  -- LATERAL : l'adhésion de référence est choisie UNE fois, par la règle ci-dessus.
  left join lateral (
    select ad.cours_id, ad.statut
    from adhesions ad
    where ad.adherent_id = a.id
    order by
      -- 1. saison courante d'abord
      (ad.saison is distinct from saison_courante(a.organisation_id)),
      -- 2. adhésion active d'abord
      (ad.statut not in ('en_attente', 'paye', 'en_retard')),
      -- 3. la plus récente
      ad.created_at desc,
      -- 4. ordre total, sans signification métier
      ad.id desc
    limit 1
  ) ref on true
  where a.id = p_adherent_id;
end; $function$;

-- Droits inchangés : la fonction reste interdite à `anon` et à `public`.
revoke execute on function public.verifier_adherent(uuid) from anon, public;
grant execute on function public.verifier_adherent(uuid) to authenticated;

-- L'index qui sert cette règle. `created_at desc, id desc` correspond aux critères 3 et
-- 4 ; les deux premiers sont des expressions booléennes que Postgres évalue par ligne,
-- sur un ensemble déjà réduit aux adhésions d'UNE personne — quelques lignes au plus.
create index if not exists idx_adhesions_adherent_reference
  on public.adhesions (adherent_id, created_at desc, id desc);
