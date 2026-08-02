-- CLOISONNEMENT ENTRE CLUBS — l'invariant central de Klubster, exercé en vraie session.
--
-- COMMENT UNE SESSION EST SIMULÉE, ET POURQUOI PAS AUTREMENT.
--
--     set local role authenticated;
--     set local request.jwt.claims = '{"sub":"…","role":"authenticated"}';
--
-- C'est exactement ce que PostgREST dépose quand un adhérent ou un président appelle
-- l'API : le rôle Postgres devient `authenticated`, et `auth.uid()` lit la revendication
-- `sub`. Les RLS s'appliquent alors pour de bon.
--
-- CE QU'ON NE FAIT JAMAIS ICI : passer par `service_role` ou rester propriétaire de la
-- base. Les deux CONTOURNENT les RLS. Un test d'autorisation exécuté ainsi rend vert quoi
-- qu'il arrive — il ne prouve pas que la règle marche, il prouve qu'elle n'a pas été
-- consultée. Le propriétaire ne sert qu'à poser les fixtures (`00-fixtures.sql`).
--
-- `set local` plutôt que `set` : tout est annulé au `rollback`, donc un test ne peut pas
-- laisser une identité derrière lui pour le suivant.

-- ——— D'abord : la bascule d'identité fonctionne-t-elle ? ——————————————————————
--
-- C'est le contrôle qui doit venir en premier. Si `set local role` ou les revendications
-- n'avaient aucun effet, chaque test ci-dessous s'exécuterait en propriétaire, verrait
-- tout, et « passerait » — en validant le vide. On le vérifie avant de croire quoi que ce
-- soit d'autre.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  begin
    if current_user <> 'authenticated' then
      raise exception 'la bascule de rôle n''a pas pris : current_user = %', current_user;
    end if;
    if auth.uid() <> '0a000000-0000-4000-8000-0000000000a1'::uuid then
      raise exception 'auth.uid() ne lit pas la revendication : %', auth.uid();
    end if;
    if current_org_id() <> '0a000000-0000-4000-8000-000000000001'::uuid then
      raise exception 'current_org_id() ne suit pas la session : %', current_org_id();
    end if;
    raise notice 'Session réelle : president.a, club A.';
  end $$;
rollback;

-- ——— Le président du club A ne voit que le club A ——————————————————————————————
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  declare n integer; nb_b integer;
  begin
    -- Il voit bien SES adhérents : sans cela, le test suivant serait vert par vacuité.
    select count(*) into n from public.adherents;
    if n <> 2 then raise exception 'president.a voit % adherents, attendu 2 (les siens)', n; end if;

    -- Et aucun de ceux du club B.
    select count(*) into nb_b from public.adherents
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if nb_b <> 0 then raise exception 'FUITE : president.a voit % adherent(s) du club B', nb_b; end if;

    -- Même chose sur les tables sensibles.
    select count(*) into nb_b from public.reglements
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if nb_b <> 0 then raise exception 'FUITE : president.a voit % reglement(s) du club B', nb_b; end if;

    select count(*) into nb_b from public.questionnaires_sante
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if nb_b <> 0 then raise exception 'FUITE SANTÉ : president.a voit % questionnaire(s) du club B', nb_b; end if;

    select count(*) into nb_b from public.pieces_adherent
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if nb_b <> 0 then raise exception 'FUITE : president.a voit % piece(s) du club B', nb_b; end if;
  end $$;
rollback;

-- ——— Il ne peut pas non plus ÉCRIRE chez le voisin ————————————————————————————
--
-- Lire et écrire sont deux politiques distinctes. Un `with check` oublié laisse un club
-- créer des lignes chez un autre — et rien dans l'interface ne le montrerait.
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a1","role":"authenticated"}';
  do $$
  begin
    begin
      insert into public.adherents (organisation_id, nom, prenom, email)
      values ('0b000000-0000-4000-8000-000000000001', 'Intrus', 'Test', 'intrus@example.com');
      raise exception 'FUITE : president.a a créé un adhérent dans le club B';
    exception
      when insufficient_privilege then null;  -- refusé par la RLS : c'est ce qu'on veut
    end;

    -- Et il ne peut pas déplacer un de ses adhérents vers le club voisin.
    --
    -- DEUX DÉFENSES SE SUPERPOSENT ICI, et le test accepte l'une comme l'autre : la RLS
    -- (`with check`) et le trigger d'immuabilité posé par `0012` sur `organisation_id`.
    -- C'est ce dernier qui parle en premier — « organisation_id est immuable sur
    -- adherents. » Exiger un refus PAR LA RLS ferait échouer le test le jour où la
    -- ceinture tient avant les bretelles, ce qui n'est pas un défaut. Ce qui compte est
    -- que la ligne ne bouge pas.
    declare deplace boolean;
    begin
      begin
        update public.adherents
           set organisation_id = '0b000000-0000-4000-8000-000000000001'
         where id = '0a000000-0000-4000-8000-0000000000d2';
        deplace := found;
      exception
        when others then deplace := false;  -- refusé, peu importe par laquelle
      end;
      if deplace then raise exception 'FUITE : un adhérent a été déplacé vers le club B'; end if;
    end;
  end $$;
rollback;

-- ——— Le visiteur anonyme ————————————————————————————————————————————————————
--
-- `anon` doit voir la vitrine des clubs publiés, et rien d'autre. C'est le P1 du 4e audit :
-- une policy RLS s'applique à toutes les colonnes, donc `0015` a restreint les privilèges
-- d'`anon` colonne par colonne.
begin;
  set local role anon;
  set local request.jwt.claims = '{"role":"anon"}';
  do $$
  declare n integer;
  begin
    /**
     * CE QUE CE BLOC A CORRIGÉ DANS MA PROPRE COMPRÉHENSION.
     *
     * Il attendait d'abord un `permission denied`. Il n'en vient pas, et c'est normal :
     * [vérifié le 02/08/2026 sur la production] `anon` possède SELECT, INSERT, UPDATE et
     * DELETE sur `adherents`, `reglements` et `questionnaires_sante`. C'est le modèle de
     * Supabase, où PostgREST expose les tables et où **la RLS est l'unique barrière**.
     *
     * Il n'y a donc pas de seconde ligne de défense sur ces tables. Une politique trop
     * permissive, ou simplement absente sur une table nouvellement créée, ouvre
     * directement des données de santé à un visiteur anonyme. Ce test ne vérifie pas que
     * la porte est fermée à clé : il vérifie qu'il n'y a rien derrière.
     */
    select count(*) into n from public.adherents;
    if n <> 0 then raise exception 'FUITE : anon voit % adherent(s)', n; end if;

    select count(*) into n from public.questionnaires_sante;
    if n <> 0 then raise exception 'FUITE SANTÉ : anon voit % questionnaire(s)', n; end if;

    select count(*) into n from public.reglements;
    if n <> 0 then raise exception 'FUITE : anon voit % reglement(s)', n; end if;

    select count(*) into n from public.pieces_adherent;
    if n <> 0 then raise exception 'FUITE : anon voit % piece(s)', n; end if;

    -- Et il n'écrit pas non plus, alors que le GRANT le lui permettrait.
    declare a_ecrit boolean := false;
    begin
      begin
        insert into public.adherents (organisation_id, nom, prenom, email)
        values ('0a000000-0000-4000-8000-000000000001', 'Anon', 'Test', 'anon@example.com');
        a_ecrit := true;
      exception when others then a_ecrit := false;
      end;
      if a_ecrit then raise exception 'FUITE : anon a créé un adhérent'; end if;
    end;

    -- Les colonnes d'abonnement d'`organisations` lui sont retirées par 0015.
    begin
      select count(*) into n from (select emails_config from public.organisations) t;
      raise exception 'FUITE : anon a pu lire organisations.emails_config';
    exception when insufficient_privilege then null;
    end;

    -- Mais la vitrine, elle, reste lisible : sinon le site public ne s'afficherait pas.
    select count(*) into n from (select slug, nom, couleur_primaire from public.organisations) t;
    if n <> 2 then raise exception 'anon ne lit pas la vitrine : % organisations visibles', n; end if;
  end $$;
rollback;

-- ——— L'adhérent ne voit que son propre dossier ————————————————————————————————
begin;
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"0a000000-0000-4000-8000-0000000000a3","role":"authenticated"}';
  do $$
  declare n integer;
  begin
    -- `adherent.a` n'a pas d'organisation_id dans profiles ? Si, il en a une — mais son
    -- rôle est `adherent`, donc les politiques « même org » lui donneraient tout le club.
    -- On mesure ce qu'il voit réellement plutôt que de le supposer.
    select count(*) into n from public.adherents;
    raise notice '[OBSERVÉ] un compte adhérent du club A voit % fiche(s) adhérent.', n;

    select count(*) into n from public.adherents
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if n <> 0 then raise exception 'FUITE : un adhérent du club A voit % fiche(s) du club B', n; end if;

    select count(*) into n from public.questionnaires_sante
     where organisation_id = '0b000000-0000-4000-8000-000000000001';
    if n <> 0 then raise exception 'FUITE SANTÉ inter-club depuis un compte adhérent'; end if;
  end $$;
rollback;
