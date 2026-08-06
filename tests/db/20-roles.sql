-- LA MATRICE DES RÔLES, ÉPROUVÉE LIGNE PAR LIGNE EN SESSION RÉELLE.
--
-- Ce fichier remplace celui qui, jusqu'au 02/08/2026, se contentait de PROUVER QUE LA
-- MATRICE ÉTAIT INAPPLICABLE : `profiles_role_check` refusait `tresorier`, `secretaire`
-- et `lecture`, et toutes les branches de politique qui les nomment étaient mortes.
--
-- `20260802120000_roles_attribuables.sql` a élargi la contrainte. Les droits que ces
-- branches accordent s'appliquent donc POUR LA PREMIÈRE FOIS. C'est un élargissement
-- réel : jusqu'ici le produit était plus fermé qu'annoncé, et personne ne l'avait vu
-- parce que rien ne l'exerçait. D'où ce test, qui vaut autant que la migration.
--
-- Chaque assertion s'exécute dans une VRAIE session — `set local role authenticated` +
-- `request.jwt.claims`, comme PostgREST les dépose. Jamais `service_role`, qui contourne
-- les RLS et rendrait tout vert sans rien prouver.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 0. LES CINQ RÔLES SONT ENREGISTRABLES
-- ═══════════════════════════════════════════════════════════════════════════════
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

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LE PRÉSIDENT PEUT CONSTITUER SON ÉQUIPE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- `equipe_ajouter` écrit `role = coalesce(nullif(role,'adherent'),'lecture')`. Un compte
-- ordinaire porte `adherent`, donc la valeur écrite est `lecture` — refusée par l'ancienne
-- contrainte. **Ajouter le moindre membre échouait**, quel que soit le rôle visé. Ce n'est
-- pas un test de confort : c'est le geste que le produit promet et ne tenait pas.
begin;
  -- Le compte LIBRE naît côté fixtures (superutilisateur du harnais), AVANT la bascule
  -- authenticated : la RLS interdit — à raison — à un président de créer un profil.
  insert into auth.users (id, email)
  values ('0a000000-0000-4000-8000-00000000009f', 'libre@example.com');
  insert into public.profiles (id, email, role)
  values ('0a000000-0000-4000-8000-00000000009f', 'libre@example.com', 'adherent');
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  declare resultat text; role_apres text;
  begin
    -- Depuis 20260802200000, un compte DÉJÀ rattaché au club (l'adhérent du club A
    -- porte organisation_id = A) rend « deja_membre » : l'écran affiche alors le
    -- message exact au lieu d'un ajout fantôme. C'est le contrat, on le vérifie.
    select public.equipe_ajouter('adherent.a@example.com') into resultat;
    if resultat <> 'deja_membre' then
      raise exception 'equipe_ajouter (déjà rattaché) devrait rendre « deja_membre », a rendu « % »', resultat;
    end if;

    -- Le chemin « ok » se prouve sur le compte réellement LIBRE créé en fixture.
    select public.equipe_ajouter('libre@example.com') into resultat;
    if resultat <> 'ok' then raise exception 'equipe_ajouter (compte libre) a rendu « % »', resultat; end if;

    select role into role_apres from public.profiles where email = 'libre@example.com';
    if role_apres <> 'lecture' then
      raise exception 'un membre ajouté devrait être en lecture, trouvé « % »', role_apres;
    end if;

    -- Puis on promeut l'adhérent trésorier — le geste exact de l'écran Équipe.
    perform public.equipe_definir_role('0a000000-0000-4000-8000-0000000000a3'::uuid, 'tresorier');
    select role into role_apres from public.profiles where email = 'adherent.a@example.com';
    if role_apres <> 'tresorier' then
      raise exception 'le rôle attribué devrait être tresorier, trouvé « % »', role_apres;
    end if;
    raise notice 'Équipe : deja_membre exact, ajout d''un compte libre, promotion en trésorier — les trois aboutissent.';
  end $$;
rollback;

-- Le président ne peut pas se retirer lui-même, ni s'auto-déclasser.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  declare a_reussi boolean := false;
  begin
    begin
      perform public.equipe_definir_role('0a000000-0000-4000-8000-0000000000a1'::uuid, 'lecture');
      a_reussi := true;
    exception when others then a_reussi := false;
    end;
    if a_reussi then raise exception 'le président a pu changer son propre rôle'; end if;
  end $$;
rollback;

-- Et un trésorier ne gère pas l'équipe : `equipe_definir_role` est réservée au président.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a4","role":"authenticated"}';
  do $$
  declare a_reussi boolean := false;
  begin
    begin
      perform public.equipe_definir_role('0a000000-0000-4000-8000-0000000000a2'::uuid, 'admin_asso');
      a_reussi := true;
    exception when others then a_reussi := false;
    end;
    if a_reussi then raise exception 'ÉLÉVATION : un trésorier a pu nommer un président'; end if;
    raise notice 'Trésorier : gestion d''équipe refusée.';
  end $$;
rollback;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. LA MATRICE, RÔLE PAR RÔLE
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Un seul bloc générique, nourri d'une table d'attentes : ajouter un rôle ou une table
-- ne demande qu'une ligne, et aucune assertion ne peut être oubliée en chemin.
--
-- `sante` est la colonne qui compte le plus : les questionnaires relèvent de l'article 9
-- du RGPD. Le trésorier et l'encadrant ne doivent jamais les voir.
drop table if exists attentes;
create temp table attentes (
  acteur   text,
  uid      uuid,
  tbl      text,
  peut_lire boolean,
  peut_ecrire boolean
);

insert into attentes values
  -- Président : tout son club, y compris santé et paiements.
  ('président',  '0a000000-0000-4000-8000-0000000000a1', 'adherents',            true,  true),
  ('président',  '0a000000-0000-4000-8000-0000000000a1', 'reglements',           true,  true),
  ('président',  '0a000000-0000-4000-8000-0000000000a1', 'questionnaires_sante', true,  false),
  ('président',  '0a000000-0000-4000-8000-0000000000a1', 'presences',            true,  true),

  -- Trésorier : l'argent, et la lecture des adhérents pour savoir qui doit quoi.
  -- PAS la santé. PAS l'écriture sur les dossiers.
  ('trésorier',  '0a000000-0000-4000-8000-0000000000a4', 'adherents',            true,  false),
  ('trésorier',  '0a000000-0000-4000-8000-0000000000a4', 'reglements',           true,  true),
  ('trésorier',  '0a000000-0000-4000-8000-0000000000a4', 'questionnaires_sante', false, false),
  ('trésorier',  '0a000000-0000-4000-8000-0000000000a4', 'presences',            true,  false),

  -- Secrétaire : les dossiers et la santé. Pas l'argent — et pas même en lecture :
  -- `0026_reglements_rls_par_role` réserve la lecture des règlements au président et au
  -- trésorier. Mes attentes disaient d'abord l'inverse ; c'est le produit qui avait raison,
  -- et il est cohérent avec CLAUDE.md (« règlements → président/trésorier »).
  ('secrétaire', '0a000000-0000-4000-8000-0000000000a5', 'adherents',            true,  true),
  ('secrétaire', '0a000000-0000-4000-8000-0000000000a5', 'reglements',           false, false),
  ('secrétaire', '0a000000-0000-4000-8000-0000000000a5', 'questionnaires_sante', true,  false),
  ('secrétaire', '0a000000-0000-4000-8000-0000000000a5', 'presences',            true,  false),

  -- Encadrant : le terrain. Ni argent, ni santé.
  ('encadrant',  '0a000000-0000-4000-8000-0000000000a2', 'adherents',            true,  false),
  ('encadrant',  '0a000000-0000-4000-8000-0000000000a2', 'reglements',           false, false),
  ('encadrant',  '0a000000-0000-4000-8000-0000000000a2', 'questionnaires_sante', false, false),
  ('encadrant',  '0a000000-0000-4000-8000-0000000000a2', 'presences',            true,  true),

  -- Lecture seule : elle lit ce que son club expose, et n'écrit rien. Nulle part.
  -- La trésorerie ne fait pas partie de ce qu'elle expose : un compte « consultation »
  -- ne voit pas qui a payé quoi. C'est un choix de confidentialité, pas un oubli.
  ('lecture',    '0a000000-0000-4000-8000-0000000000a6', 'adherents',            true,  false),
  ('lecture',    '0a000000-0000-4000-8000-0000000000a6', 'reglements',           false, false),
  ('lecture',    '0a000000-0000-4000-8000-0000000000a6', 'questionnaires_sante', false, false),
  ('lecture',    '0a000000-0000-4000-8000-0000000000a6', 'presences',            true,  false);

do $$
declare
  a       record;
  n       integer;
  ecarts  text := '';
  a_ecrit boolean;
  org_a   uuid := '0a000000-0000-4000-8000-000000000001';
begin
  for a in select * from attentes order by acteur, tbl loop
    -- ——— LECTURE ———————————————————————————————————————————————————————————
    execute 'set local role authenticated';
    execute format('set local request.jwt.claims = %L',
                   format('{"sub":"%s","role":"authenticated"}', a.uid));
    begin
      execute format('select count(*) from public.%I', a.tbl) into n;
    exception when others then n := 0;
    end;
    reset role;
    if (n > 0) <> a.peut_lire then
      ecarts := ecarts || format(E'\n    %s / %s : lecture %s, attendu %s',
        a.acteur, a.tbl, case when n > 0 then 'OUI' else 'non' end,
        case when a.peut_lire then 'OUI' else 'non' end);
    end if;

    -- ——— ÉCRITURE ——————————————————————————————————————————————————————————
    -- Une écriture représentative, toujours annulée : le sous-bloc est défait par une
    -- exception volontaire, sans quoi l'acteur suivant mesurerait un état modifié.
    execute 'set local role authenticated';
    execute format('set local request.jwt.claims = %L',
                   format('{"sub":"%s","role":"authenticated"}', a.uid));
    a_ecrit := false;
    begin
      case a.tbl
        when 'adherents' then
          insert into public.adherents (organisation_id, nom, prenom, email)
          values (org_a, 'Essai', 'Essai', 'essai@example.com');
        when 'reglements' then
          insert into public.reglements (organisation_id, adhesion_id, montant_centimes, mode)
          values (org_a, '0a000000-0000-4000-8000-0000000000e2', 1000, 'especes');
        when 'questionnaires_sante' then
          insert into public.questionnaires_sante (organisation_id, adherent_id, type, resultat)
          values (org_a, '0a000000-0000-4000-8000-0000000000d2', 'adulte', 'atteste_negatif');
        when 'presences' then
          insert into public.presences (organisation_id, adherent_id, date)
          values (org_a, '0a000000-0000-4000-8000-0000000000d2', current_date - 1);
      end case;
      a_ecrit := true;
      raise exception using errcode = 'KB000';
    exception
      when sqlstate 'KB000' then null;
      when others then a_ecrit := false;
    end;
    reset role;
    if a_ecrit <> a.peut_ecrire then
      ecarts := ecarts || format(E'\n    %s / %s : écriture %s, attendu %s',
        a.acteur, a.tbl, case when a_ecrit then 'OUI' else 'non' end,
        case when a.peut_ecrire then 'OUI' else 'non' end);
    end if;
  end loop;

  if ecarts <> '' then
    raise exception E'La matrice des rôles n''est pas respectée :%', ecarts;
  end if;
  raise notice 'Matrice des rôles : 5 rôles × 4 tables, lecture et écriture — conforme.';
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUCUN RÔLE NE FRANCHIT LA FRONTIÈRE DU CLUB
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- Élargir les rôles élargit la surface : cinq identités peuvent désormais lire là où deux
-- le pouvaient. Le cloisonnement doit tenir pour chacune, sans exception.
do $$
declare a record; n integer; fuites text := '';
begin
  for a in select distinct acteur, uid from attentes loop
    execute 'set local role authenticated';
    execute format('set local request.jwt.claims = %L',
                   format('{"sub":"%s","role":"authenticated"}', a.uid));
    begin
      select count(*) into n from public.adherents
       where organisation_id = '0b000000-0000-4000-8000-000000000001';
    exception when others then n := 0;
    end;
    if n > 0 then fuites := fuites || format(E'\n    %s voit %s adhérent(s) du club B', a.acteur, n); end if;

    begin
      select count(*) into n from public.questionnaires_sante
       where organisation_id = '0b000000-0000-4000-8000-000000000001';
    exception when others then n := 0;
    end;
    if n > 0 then fuites := fuites || format(E'\n    %s voit %s questionnaire(s) SANTÉ du club B', a.acteur, n); end if;

    begin
      select count(*) into n from public.reglements
       where organisation_id = '0b000000-0000-4000-8000-000000000001';
    exception when others then n := 0;
    end;
    if n > 0 then fuites := fuites || format(E'\n    %s voit %s règlement(s) du club B', a.acteur, n); end if;
    reset role;
  end loop;

  if fuites <> '' then
    raise exception E'CLOISONNEMENT ROMPU :%', fuites;
  end if;
  raise notice 'Cloisonnement : les 5 rôles du club A ne voient rien du club B.';
end $$;
