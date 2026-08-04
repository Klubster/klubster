-- 20260803180000 — Contrôle terrain : un statut par situation, et un pointage PAR COURS.
--
-- DEUX RÈGLES MÉTIER, PAS UNE.
--
-- 1. `verifier_adherent` répond « réglé / pas réglé » : une personne en liste d'attente,
--    annulée, remboursée ou de la saison passée affichaient toutes « Non réglé », sans
--    dire quoi FAIRE. `controler_adherent` rend un statut nommé et l'écran affiche
--    l'action qui va avec.
--
-- 2. Une présence était « adhérent + date » : une personne inscrite à deux cours le
--    même jour ne pouvait être pointée qu'une fois, et le statut affiché pouvait venir
--    d'une adhésion choisie en silence. Désormais l'encadrant choisit SON cours, le
--    statut concerne CE cours, et la présence est « adhérent + cours + date ».
--
-- FONCTION SÉPARÉE, EXPRÈS. La PR #10 réécrit `verifier_adherent` ; créer
-- `controler_adherent` plutôt que modifier la même fonction évite toute dépendance
-- croisée entre les deux PR.
--
-- CE QUE L'ENCADRANT NE VOIT PAS — garanti par la fonction, pas par l'écran :
-- aucun montant, aucune donnée Stripe, aucun détail du questionnaire de santé (juste
-- présent / absent), aucune donnée d'un autre club (contrôles d'organisation en tête,
-- avant toute lecture).
--
-- RETOUR ARRIÈRE : recréer `marquer_present(uuid)` depuis la migration 0013, supprimer
-- `controler_adherent`, `marquer_present(uuid, uuid)`, la colonne `presences.cours_id`
-- et sa contrainte, restaurer `presences_adherent_id_date_key`.

-- ——— 1. La présence porte le cours ——————————————————————————————————————

alter table public.presences add column if not exists cours_id uuid references public.cours(id);

-- L'unicité passe de (adhérent, date) à (adhérent, cours, date).
-- `nulls not distinct` : les lignes historiques (cours inconnu, au plus une par jour
-- grâce à l'ancienne contrainte) restent uniques entre elles — on ne réécrit pas
-- l'histoire, on ne la duplique pas non plus.
alter table public.presences drop constraint if exists presences_adherent_id_date_key;
alter table public.presences drop constraint if exists presences_adherent_cours_date_key;
alter table public.presences add constraint presences_adherent_cours_date_key
  unique nulls not distinct (adherent_id, cours_id, date);

create index if not exists idx_presences_cours_date on public.presences (cours_id, date);

-- ——— 2. Le contrôle, pour UN cours choisi ———————————————————————————————

-- L'ancienne version (un seul argument) choisissait une adhésion de référence en
-- silence : supprimée avant d'installer le contrat explicite.
drop function if exists public.controler_adherent(uuid);

create or replace function public.controler_adherent(p_adherent_id uuid, p_cours_id uuid)
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
  v_org_cours uuid;
  v_saison text;
begin
  -- Contrôles d'appartenance AVANT toute lecture métier.
  select organisation_id into v_org from adherents a where a.id = p_adherent_id;
  if v_org is null then raise exception 'Adhérent introuvable.'; end if;
  select organisation_id into v_org_cours from cours c where c.id = p_cours_id;
  if v_org_cours is null then raise exception 'Cours introuvable.'; end if;
  if not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false)) then
    raise exception 'Non autorisé.';
  end if;
  if v_org_cours is distinct from v_org then
    raise exception 'Non autorisé.';
  end if;
  -- Matrice de rôles EN BASE : contrôle = président ou encadrant.
  if not (coalesce(is_super_admin(), false) or a_role_asso(array['admin_asso','encadrant'])) then
    raise exception 'Non autorisé.';
  end if;

  v_saison := saison_courante(v_org);

  return query
  select
    a.prenom,
    a.nom,
    (select c.nom from cours c where c.id = p_cours_id),
    case
      -- Le statut concerne LE cours sélectionné, jamais une adhésion choisie en silence.
      when ref.statut is null then
        case
          when exists (select 1 from adhesions ad where ad.adherent_id = a.id
                        and ad.cours_id = p_cours_id and ad.saison is distinct from v_saison)
            then 'saison_precedente'
          when exists (select 1 from adhesions ad where ad.adherent_id = a.id
                        and ad.saison = v_saison
                        and ad.statut in ('paye', 'en_attente', 'en_retard'))
            then 'non_inscrit_ce_cours'
          else 'aucune_adhesion'
        end
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
    -- Présence du jour POUR CE COURS : deux cours le même jour = deux pointages.
    exists (select 1 from presences pr
             where pr.adherent_id = a.id and pr.cours_id = p_cours_id and pr.date = current_date),
    -- Information : les autres cours vivants de la saison.
    coalesce((
      select array_agg(distinct c2.nom order by c2.nom)
      from adhesions ad2
      join cours c2 on c2.id = ad2.cours_id
      where ad2.adherent_id = a.id
        and ad2.cours_id is distinct from p_cours_id
        and ad2.saison = v_saison
        and ad2.statut in ('paye', 'en_attente', 'en_retard')
    ), '{}')
  from adherents a
  -- L'adhésion DU cours sélectionné, saison courante. S'il en existe plusieurs
  -- (correction saisie le jour même), la plus vivante puis la plus récente, puis
  -- l'identifiant pour rendre l'ordre total — les mêmes départages que la PR #10.
  left join lateral (
    select ad.id, ad.statut
    from adhesions ad
    where ad.adherent_id = a.id
      and ad.cours_id = p_cours_id
      and ad.saison = v_saison
    order by
      (ad.statut not in ('en_attente', 'paye', 'en_retard')),
      ad.created_at desc,
      ad.id desc
    limit 1
  ) ref on true
  where a.id = p_adherent_id;
end; $function$;

revoke execute on function public.controler_adherent(uuid, uuid) from anon, public;
grant execute on function public.controler_adherent(uuid, uuid) to authenticated;

-- ——— 3. Le pointage porte le cours ——————————————————————————————————————

-- L'ancienne signature (adhérent seul) ne peut plus choisir le cours à la place de
-- l'encadrant : supprimée. Retour arrière : la recréer depuis la migration 0013.
drop function if exists public.marquer_present(uuid);

create or replace function public.marquer_present(p_adherent_id uuid, p_cours_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_org uuid; v_org_cours uuid;
begin
  select organisation_id into v_org from adherents where id = p_adherent_id;
  select organisation_id into v_org_cours from cours where id = p_cours_id;
  if v_org is null or v_org_cours is null
     or not (coalesce(v_org = current_org_id(), false) or coalesce(is_super_admin(), false))
     or v_org_cours is distinct from v_org then
    raise exception 'Non autorisé.';
  end if;
  if not (coalesce(is_super_admin(), false) or a_role_asso(array['admin_asso','encadrant'])) then
    raise exception 'Non autorisé.';
  end if;
  -- Idempotent : deux clics (ou deux scans) simultanés pour le même adhérent, le même
  -- cours et le même jour produisent UNE ligne. Un autre cours le même jour en produit
  -- une autre — c'est le but.
  insert into presences (organisation_id, adherent_id, cours_id, date)
  values (v_org, p_adherent_id, p_cours_id, current_date)
  on conflict on constraint presences_adherent_cours_date_key do nothing;
end; $function$;

revoke execute on function public.marquer_present(uuid, uuid) from anon, public;
grant execute on function public.marquer_present(uuid, uuid) to authenticated;
