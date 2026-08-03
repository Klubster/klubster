-- 20260803180000 — Contrôle terrain : une réponse par statut, pas un booléen.
--
-- `verifier_adherent` répond « réglé / pas réglé » et compte les pièces. Au bord du
-- tapis, ça ne suffit pas : une personne en liste d'attente, une adhésion annulée,
-- remboursée, ou datant de la saison passée affichaient toutes le même « ✕ Non réglé »,
-- et l'encadrant ne savait pas quoi FAIRE. `controler_adherent` rend un statut nommé
-- et l'écran affiche l'action qui va avec.
--
-- FONCTION SÉPARÉE, EXPRÈS. La PR #10 réécrit `verifier_adherent` (adhésion de
-- référence déterministe) ; créer une seconde fonction plutôt que modifier la même
-- évite toute dépendance croisée entre les deux PR. La règle de sélection est la
-- MÊME, volontairement : saison courante d'abord, adhésion active ensuite, puis la
-- plus récente, puis l'identifiant pour rendre l'ordre total.
--
-- CE QUE L'ENCADRANT NE VOIT PAS — c'est une garantie de la fonction, pas de l'écran :
-- aucun montant, aucune donnée Stripe, aucun détail du questionnaire de santé (juste
-- « présent / absent »), aucune donnée d'un autre club (contrôle d'organisation en
-- tête de fonction, avant toute lecture).

create or replace function public.controler_adherent(p_adherent_id uuid)
returns table(
  prenom text,
  nom text,
  cours text,
  statut text,
  pieces_manquantes integer,
  questionnaire_ok boolean,
  present_aujourdhui boolean,
  autres_cours text[]
)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_org uuid;
  v_saison text;
begin
  select organisation_id into v_org from adherents a where a.id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  -- Matrice de rôles EN BASE : contrôle = président ou encadrant. L'interface fait
  -- déjà ce tri, mais un appel direct ne passe pas par l'interface.
  if not (coalesce(is_super_admin(), false) or a_role_asso(array['admin_asso','encadrant'])) then
    raise exception 'Non autorisé.';
  end if;

  v_saison := saison_courante(v_org);

  return query
  select
    a.prenom,
    a.nom,
    (select c.nom from cours c where c.id = ref.cours_id),
    case
      when ref.statut is null then 'aucune_adhesion'
      when ref.saison is distinct from v_saison then 'saison_precedente'
      when ref.statut = 'liste_attente' then 'liste_attente'
      when ref.statut = 'annule' then 'annule'
      when ref.statut = 'rembourse' then 'rembourse'
      when ref.statut = 'en_retard' then 'en_retard'
      when ref.statut = 'en_attente' then 'paiement_attendu'
      -- payé : le questionnaire d'abord (obligation légale), le dossier ensuite
      when not exists (select 1 from questionnaires_sante q
                        where q.adherent_id = a.id and q.adhesion_id = ref.id)
        then 'questionnaire_manquant'
      when (select count(*) from pieces_adherent p
             where p.adherent_id = a.id and p.statut = 'manquante') > 0
        then 'dossier_incomplet'
      else 'a_jour'
    end,
    (select count(*)::int from pieces_adherent p
      where p.adherent_id = a.id and p.statut = 'manquante'),
    exists (select 1 from questionnaires_sante q
             where q.adherent_id = a.id and q.adhesion_id = ref.id),
    exists (select 1 from presences pr
             where pr.adherent_id = a.id and pr.date = current_date),
    -- Plusieurs cours : les AUTRES adhésions vivantes de la saison, nom du cours
    -- seulement — l'encadrant du mercredi voit que la personne fait aussi le samedi.
    coalesce((
      select array_agg(distinct c2.nom order by c2.nom)
      from adhesions ad2
      join cours c2 on c2.id = ad2.cours_id
      where ad2.adherent_id = a.id
        and ad2.id is distinct from ref.id
        and ad2.saison = v_saison
        and ad2.statut in ('paye', 'en_attente', 'en_retard')
    ), '{}')
  from adherents a
  left join lateral (
    select ad.id, ad.cours_id, ad.statut, ad.saison
    from adhesions ad
    where ad.adherent_id = a.id
    order by
      (ad.saison is distinct from v_saison),
      (ad.statut not in ('en_attente', 'paye', 'en_retard')),
      ad.created_at desc,
      ad.id desc
    limit 1
  ) ref on true
  where a.id = p_adherent_id;
end; $function$;

revoke execute on function public.controler_adherent(uuid) from anon, public;
grant execute on function public.controler_adherent(uuid) to authenticated;
