-- ASSERTION — plus aucun prérequis ne subsiste après la dernière migration.
--
-- POURQUOI C'EST L'ASSERTION LA PLUS IMPORTANTE DU HARNAIS.
--
-- Les prérequis de `scripts/db/bootstrap/` déclarent neuf fonctions avec un corps
-- minimal : `current_org_id()` rend `null`, `a_role_asso()` rend `false`, les webhooks
-- ne font rien. Si l'un d'eux survivait à la chaîne, TOUS LES TESTS DE RLS QUI SUIVENT
-- PASSERAIENT AU VERT — non parce que le cloisonnement fonctionne, mais parce que plus
-- rien n'est visible de personne. Le harnais testerait ses propres cales en croyant
-- mesurer le produit, et rendrait le verdict le plus rassurant possible sur la base la
-- plus cassée possible.
--
-- Ce fichier échoue donc bruyamment si une seule des fonctions posées par le bootstrap
-- a encore, à la fin, la définition qu'elle avait au moment du bootstrap.
--
-- LA LISTE N'EST PAS ÉCRITE À LA MAIN. Elle vient de `harnais.empreinte`, remplie par
-- différence d'instantanés autour de chaque fichier de bootstrap. Ajouter un prérequis
-- l'ajoute automatiquement ici ; en retirer un le retire. Aucune liste ne dérive.

do $$
declare
  n_fonctions integer;
  liste       text;
begin
  -- ——— 0. L'assertion mord-elle ? —————————————————————————————————————————————
  -- Une assertion qui n'inspecte rien passe pour toujours. Si `harnais.empreinte` est
  -- vide, ce n'est pas que tout va bien : c'est que le mécanisme d'empreinte est cassé.
  if to_regclass('harnais.empreinte') is null then
    raise exception 'harnais.empreinte est absente — le mécanisme d''empreinte n''a pas tourné.';
  end if;

  select count(*) into n_fonctions from harnais.empreinte where genre = 'function';
  if n_fonctions = 0 then
    raise exception 'aucune fonction de bootstrap enregistrée — cette assertion ne prouverait rien.';
  end if;
  raise notice '% fonction(s) de bootstrap sous surveillance.', n_fonctions;

  -- ——— 1. Elle existe toujours, sous la même signature ————————————————————————
  -- Un `drop` suivi d'un `create` changerait l'oid : la fonction serait bien là, mais
  -- l'empreinte ne la reconnaîtrait plus, et le contrôle du corps ci-dessous passerait
  -- à côté. On l'attrape ici plutôt que de laisser un trou silencieux.
  select string_agg(e.objet, E'\n    ' order by e.objet) into liste
    from harnais.empreinte e
   where e.genre = 'function'
     and not exists (select 1 from pg_proc p where p.oid = e.oid);
  if liste is not null then
    raise exception E'Fonction(s) de bootstrap disparue(s) ou recréée(s) sous un autre oid :\n    %', liste;
  end if;

  -- ——— 2. Son corps n'est plus le corps minimal ———————————————————————————————
  -- Restreint aux prérequis REPRIS : eux seuls ont une définition réelle plus loin dans
  -- le dépôt, donc eux seuls doivent avoir été remplacés. Exiger la même chose d'un
  -- prérequis ABSENT serait exiger l'impossible — rien ne le remplace, et c'est
  -- exactement ce que l'inventaire des dépendances manquantes constate.
  select string_agg(e.objet, E'\n    ' order by e.objet) into liste
    from harnais.empreinte e
   where e.genre = 'function' and e.categorie = 'repris'
     and pg_get_functiondef(e.oid) = e.definition_bootstrap;
  if liste is not null then
    raise exception E'CORPS MINIMAL SURVIVANT — aucune migration ne remplace ces fonctions :\n    %\n  Tout test de RLS exécuté dans cet état serait vert pour la mauvaise raison.', liste;
  end if;

  -- ——— 3. Langage, SECURITY DEFINER, search_path ——————————————————————————————
  -- Les règles que `CLAUDE.md` pose sur les fonctions d'autorisation, vérifiées sur la
  -- définition FINALE, pas sur celle du bootstrap.
  select string_agg(e.objet || ' (langage ' || l.lanname || ')', E'\n    ' order by e.objet) into liste
    from harnais.empreinte e
    join pg_proc p on p.oid = e.oid
    join pg_language l on l.oid = p.prolang
   where e.genre = 'function' and l.lanname not in ('sql', 'plpgsql');
  if liste is not null then
    raise exception E'Fonction(s) dans un langage inattendu :\n    %', liste;
  end if;

  select string_agg(e.objet, E'\n    ' order by e.objet) into liste
    from harnais.empreinte e join pg_proc p on p.oid = e.oid
   where e.genre = 'function' and not p.prosecdef;
  if liste is not null then
    raise exception E'Fonction(s) qui ont perdu SECURITY DEFINER :\n    %', liste;
  end if;

  select string_agg(e.objet, E'\n    ' order by e.objet) into liste
    from harnais.empreinte e join pg_proc p on p.oid = e.oid
   where e.genre = 'function'
     and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=%';
  if liste is not null then
    raise exception E'Fonction(s) SECURITY DEFINER sans search_path figé :\n    %', liste;
  end if;
end $$;

-- ——— 4. Droits d'exécution ————————————————————————————————————————————————————
--
-- La règle du 4ᵉ audit, telle que `CLAUDE.md` la formule : « Une RPC conçue pour la
-- `service_role` doit être révoquée de `anon`, `authenticated` et `public`. » C'était la
-- vraie faille de cet audit — les deux RPC de webhook étaient exécutables par n'importe
-- quel compte connecté. Le harnais la garde ouverte à la relecture.
--
-- Les fonctions destinées au cockpit (`marquer_relance`, `promouvoir_liste_attente`) sont
-- au contraire accordées à `authenticated` par `0013` : on vérifie seulement qu'`anon`
-- en est exclu.
do $$
declare fautives text;
begin
  select string_agg(f.nom || ' → ' || f.role, E'\n    ' order by f.nom, f.role) into fautives
  from (
    select v.nom, r.role
      from (values
        ('enregistrer_reglement_webhook',     'uuid, integer, text, text',                        array['anon','authenticated','public']),
        ('enregistrer_remboursement_webhook', 'uuid, integer, text',                              array['anon','authenticated','public']),
        ('enregistrer_questionnaire_sante',   'uuid, text, date, jsonb, text, text, text, text',  array['anon','authenticated','public']),
        ('marquer_relance',                   'uuid[]',                                           array['anon']),
        ('promouvoir_liste_attente',          'uuid',                                             array['anon'])
      ) as v(nom, signature, roles)
      cross join lateral unnest(v.roles) as r(role)
     where has_function_privilege(r.role, ('public.' || v.nom || '(' || v.signature || ')')::regprocedure, 'execute')
  ) f;

  if fautives is not null then
    raise exception E'Droit d''exécution de trop — ces fonctions doivent être fermées :\n    %', fautives;
  end if;
end $$;

-- ——— 5. Ce qui est OBSERVÉ, et non encore arbitré ————————————————————————————
--
-- Les quatre fonctions d'autorisation (`current_org_id`, `is_super_admin`,
-- `a_role_asso`, `saison_courante`) restent exécutables par `public` — donc par `anon` —
-- faute de `revoke` dans `0011` et `0013`. Ce n'est pas nécessairement un défaut : ce
-- sont des lectures qui, appelées par un visiteur anonyme, rendent `null` ou `false`.
-- Mais ce n'est pas non plus une décision écrite quelque part.
--
-- Le harnais le SIGNALE sans échouer : transformer une observation en règle sans en
-- avoir parlé à Mathieu ferait passer un choix pour un constat.
do $$
declare ouvertes text;
begin
  select string_agg(e.objet, E'\n    ' order by e.objet) into ouvertes
    from harnais.empreinte e
   where e.genre = 'function'
     and has_function_privilege('anon', e.oid, 'execute');
  if ouvertes is not null then
    raise notice E'[OBSERVÉ, non arbitré] exécutables par anon :\n    %', ouvertes;
  end if;
end $$;
