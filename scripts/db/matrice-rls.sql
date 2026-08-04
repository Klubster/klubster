-- Génère la matrice RLS : qui peut faire quoi, mesuré et non déclaré.
--
-- POURQUOI MESURER PLUTÔT QUE LIRE LES POLITIQUES.
--
-- Une politique se lit ; ce qu'elle produit ne se devine pas. Elles se composent (OR
-- entre politiques permissives), s'ajoutent aux GRANT par colonne, se heurtent à des
-- triggers d'immuabilité, et `is_super_admin()` en court-circuite plusieurs. Le seul
-- moyen honnête de dire ce qu'un rôle peut faire est de le lui faire tenter.
--
-- Chaque case est donc une VRAIE tentative, dans une VRAIE session
-- (`set role` + `request.jwt.claims`), sur les fixtures des deux clubs. Rien n'est
-- déduit. Tout est annulé : le fichier entier vit dans une transaction qui se termine
-- par `rollback`.
--
-- LECTURE DU TABLEAU. Pour un SELECT, le chiffre est le nombre de lignes visibles sur
-- les 2 ou 3 posées. Pour une écriture : `oui` si elle a abouti, `non` si elle a été
-- refusée — par la RLS, par un GRANT ou par un trigger, la distinction étant faite en
-- note quand elle change le sens.

begin;



create temp table matrice (
  acteur  text,
  tbl     text,
  op      text,
  verdict text
) on commit drop;

do $$
declare
  a         record;
  t         text;
  n         integer;
  verdict   text;
  claims    text;
  org_a     uuid := '0a000000-0000-4000-8000-000000000001';
  tables    text[] := array[
    'organisations','adherents','adhesions','cours','reglements',
    'pieces_adherent','questionnaires_sante','presences'
  ];
begin
  for a in
    select * from (values
      ('anon',              null::uuid,                                     'anon'),
      ('président club A',  '0a000000-0000-4000-8000-0000000000a1'::uuid,   'authenticated'),
      ('encadrant club A',  '0a000000-0000-4000-8000-0000000000a2'::uuid,   'authenticated'),
      ('adhérent club A',   '0a000000-0000-4000-8000-0000000000a3'::uuid,   'authenticated'),
      ('président club B',  '0b000000-0000-4000-8000-0000000000b1'::uuid,   'authenticated'),
      ('super-admin',       'ff000000-0000-4000-8000-0000000000f1'::uuid,   'authenticated')
    ) as x(nom, uid, pg_role)
  loop
    claims := case when a.uid is null
                then '{"role":"anon"}'
                else format('{"sub":"%s","role":"authenticated"}', a.uid) end;

    foreach t in array tables loop
      -- ——— LECTURE ————————————————————————————————————————————————————————————
      execute format('set local role %I', a.pg_role);
      execute format('set local request.jwt.claims = %L', claims);
      begin
        execute format('select count(*) from public.%I', t) into n;
        verdict := n::text;
      exception when others then
        verdict := 'refus';
      end;
      reset role;
      insert into matrice values (a.nom, t, 'select', verdict);

      -- ——— ÉCRITURE ———————————————————————————————————————————————————————————
      -- Une seule écriture représentative par table, toujours DANS le club A : ce qui
      -- nous intéresse est de savoir qui peut écrire chez A, y compris le président de B.
      execute format('set local role %I', a.pg_role);
      execute format('set local request.jwt.claims = %L', claims);
      begin
        case t
          when 'organisations' then
            update public.organisations set nom = 'Essai' where id = org_a;
            verdict := case when found then 'oui' else 'non' end;
          when 'adherents' then
            insert into public.adherents (organisation_id, nom, prenom, email)
            values (org_a, 'Essai', 'Essai', 'essai@example.com');
            verdict := 'oui';
          when 'adhesions' then
            insert into public.adhesions (organisation_id, adherent_id, saison, montant_centimes, statut)
            values (org_a, '0a000000-0000-4000-8000-0000000000d2', '2025-2026', 1000, 'en_attente');
            verdict := 'oui';
          when 'cours' then
            insert into public.cours (organisation_id, nom, tarif_centimes)
            values (org_a, 'Essai', 1000);
            verdict := 'oui';
          when 'reglements' then
            insert into public.reglements (organisation_id, adhesion_id, montant_centimes, mode)
            values (org_a, '0a000000-0000-4000-8000-0000000000e2', 1000, 'especes');
            verdict := 'oui';
          when 'pieces_adherent' then
            insert into public.pieces_adherent (organisation_id, adherent_id, cle, label, statut)
            values (org_a, '0a000000-0000-4000-8000-0000000000d2', 'essai', 'Essai', 'manquante');
            verdict := 'oui';
          when 'questionnaires_sante' then
            insert into public.questionnaires_sante (organisation_id, adherent_id, type, resultat)
            values (org_a, '0a000000-0000-4000-8000-0000000000d2', 'adulte', 'atteste_negatif');
            verdict := 'oui';
          when 'presences' then
            insert into public.presences (organisation_id, adherent_id, date)
            values (org_a, '0a000000-0000-4000-8000-0000000000d2', current_date - 1);
            verdict := 'oui';
        end case;
        -- ANNULATION OBLIGATOIRE DE L'ÉCRITURE RÉUSSIE.
        --
        -- Sans elle, la matrice se ment à elle-même : la ligne insérée par le président
        -- reste visible, et l'acteur suivant compte une ligne de plus. Première version
        -- mesurée : « adhérent club A » voyait 3 adhérents et « super-admin » 4, alors
        -- que les fixtures n'en posent que 3. On ne mesurait plus un état, on mesurait
        -- l'ordre de la boucle.
        --
        -- Lever une exception annule le sous-bloc — donc l'écriture — sans annuler la
        -- variable `verdict`, les variables PL/pgSQL n'étant pas transactionnelles.
        -- `KB000` est un SQLSTATE de classe utilisateur, choisi pour ne se confondre avec
        -- aucune erreur réelle.
        raise exception using errcode = 'KB000';
      exception
        when sqlstate 'KB000' then null;   -- l'écriture a abouti puis a été annulée
        when others then verdict := 'non'; -- elle a été refusée
      end;
      reset role;
      insert into matrice values (a.nom, t, 'ecriture', verdict);
    end loop;
  end loop;
end $$;

-- ——— Le document ——————————————————————————————————————————————————————————————
\pset format unaligned
\pset tuples_only on

select '# Matrice RLS — qui peut quoi, mesuré' || E'\n\n'
    || '> **Document généré.** Ne pas l''éditer à la main :' || E'\n'
    || '> `bash scripts/db/harnais.sh matrice > docs/finalisation-klubster/matrice-rls.md`' || E'\n\n'
    || 'Chaque case est une **tentative réelle** dans une session réelle (`set role` +' || E'\n'
    || '`request.jwt.claims`), sur les fixtures de `tests/db/00-fixtures.sql` : deux clubs,' || E'\n'
    || 'trois adhérents (2 au club A, 1 au club B), une ligne sensible par table et par club.' || E'\n'
    || 'Rien n''est déduit de la lecture des politiques. Tout est annulé en fin de fichier.' || E'\n\n'
    || '**Lecture** : pour `select`, le nombre de lignes visibles. Pour `écriture`, `oui` si' || E'\n'
    || 'l''écriture dans le **club A** a abouti, `non` si elle a été refusée — par une RLS, un' || E'\n'
    || 'GRANT ou un trigger.' || E'\n\n'
    || '⚠️ **Trésorier, secrétaire et lecture seule n''apparaissent pas** : la contrainte' || E'\n'
    || '`profiles_role_check` ne les autorise pas comme valeurs de `profiles.role`, en' || E'\n'
    || 'production comme ici. Ces rôles sont proposés par le cockpit et acceptés par' || E'\n'
    || '`equipe_definir_role`, mais inattribuables. Voir `tests/db/20-roles.sql`.' || E'\n';

select E'\n## Lecture (`select`)\n';
select '| Table | ' || string_agg(distinct acteur, ' | ' order by acteur) || ' |' from matrice;
select '| --- | ' || string_agg('---', ' | ') || ' |' from (select distinct acteur from matrice) t;
select '| `' || tbl || '` | '
    || string_agg(verdict, ' | ' order by acteur) || ' |'
  from matrice where op = 'select' group by tbl order by tbl;

select E'\n## Écriture dans le club A\n';
select '| Table | ' || string_agg(distinct acteur, ' | ' order by acteur) || ' |' from matrice;
select '| --- | ' || string_agg('---', ' | ') || ' |' from (select distinct acteur from matrice) t;
select '| `' || tbl || '` | '
    || string_agg(verdict, ' | ' order by acteur) || ' |'
  from matrice where op = 'ecriture' group by tbl order by tbl;

rollback;
