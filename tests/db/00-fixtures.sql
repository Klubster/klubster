-- FIXTURES — deux clubs, tous les rôles, aucune donnée réelle.
--
-- POURQUOI DEUX CLUBS ET PAS UN.
--
-- Klubster est multi-locataire, et son invariant central est qu'un club ne voit jamais
-- rien d'un autre. Avec un seul club en base, une RLS cassée passe inaperçue : tout ce
-- que le test demande, il a le droit de le voir. Le deuxième club n'est pas du décor,
-- c'est le seul moyen de distinguer « la règle marche » de « il n'y a rien à cacher ».
--
-- POURQUOI DES IDENTIFIANTS FIXES ET LISIBLES. Un `gen_random_uuid()` rend les échecs
-- illisibles et les tests non reproductibles. Ici, un identifiant qui commence par `0a`
-- appartient au club A, `0b` au club B, `ff` au super-admin.
--
-- AUCUNE DONNÉE RÉELLE. Toutes les adresses sont en `@example.com` (RFC 2606 : ce domaine
-- est réservé et n'appartiendra jamais à personne — une adresse en `.fr` inventée peut,
-- elle, exister et recevoir). Aucun nom, aucun téléphone, aucune date de naissance
-- d'adhérent réel n'entre ici, jamais.
--
-- CES INSERTIONS SE FONT EN PROPRIÉTAIRE DE LA BASE, donc hors RLS. C'est le seul usage
-- légitime du contournement : POSER un état. Les autorisations, elles, se prouvent
-- toujours avec une vraie session — voir `tests/db/_session.sql`.

begin;

-- ——— Les organisations ————————————————————————————————————————————————————————
insert into public.organisations (id, slug, nom, sport, publie, saison_debut, saison_fin)
values
  ('0a000000-0000-4000-8000-000000000001', 'club-a', 'Club A', 'boxe',    true,  '2025-09-01', '2026-08-31'),
  ('0b000000-0000-4000-8000-000000000001', 'club-b', 'Club B', 'judo',    true,  '2025-09-01', '2026-08-31');

-- ——— Les comptes ——————————————————————————————————————————————————————————————
insert into auth.users (id, email) values
  ('0a000000-0000-4000-8000-0000000000a1', 'president.a@example.com'),
  ('0a000000-0000-4000-8000-0000000000a2', 'encadrant.a@example.com'),
  ('0a000000-0000-4000-8000-0000000000a3', 'adherent.a@example.com'),
  ('0a000000-0000-4000-8000-0000000000a4', 'tresorier.a@example.com'),
  ('0a000000-0000-4000-8000-0000000000a5', 'secretaire.a@example.com'),
  ('0b000000-0000-4000-8000-0000000000b1', 'president.b@example.com'),
  ('ff000000-0000-4000-8000-0000000000f1', 'super.admin@example.com');

/**
 * LES RÔLES, ET LE DÉFAUT QU'ILS RÉVÈLENT.
 *
 * `src/lib/roles.ts` propose cinq rôles au président : admin_asso, tresorier, secretaire,
 * encadrant, lecture. La RPC `equipe_definir_role` les accepte explicitement tous les
 * cinq. Les politiques RLS de `0008` accordent des droits à `tresorier` et `secretaire`.
 *
 * MAIS la contrainte de `profiles.role`, posée par `0001` et JAMAIS élargie, n'autorise
 * que quatre valeurs : super_admin, admin_asso, encadrant, adherent.
 *
 *     CHECK (role = ANY (ARRAY['super_admin','admin_asso','encadrant','adherent']))
 *
 * [Vérifié le 02/08/2026] cette contrainte est IDENTIQUE sur la base de production.
 * Ce n'est donc pas un artefact de reconstruction.
 *
 * Les fixtures ne peuvent donc poser que les rôles réellement acceptés. Les deux comptes
 * `tresorier.a` et `secretaire.a` restent volontairement en `adherent` : c'est l'état
 * qu'un président obtiendrait aujourd'hui en essayant de les nommer.
 * `tests/db/20-roles-impossibles.sql` prouve l'échec, plutôt que de le contourner en
 * silence en insérant directement la valeur interdite.
 */
insert into public.profiles (id, organisation_id, email, nom, prenom, role) values
  ('0a000000-0000-4000-8000-0000000000a1', '0a000000-0000-4000-8000-000000000001', 'president.a@example.com',  'A', 'President', 'admin_asso'),
  ('0a000000-0000-4000-8000-0000000000a2', '0a000000-0000-4000-8000-000000000001', 'encadrant.a@example.com',  'A', 'Encadrant', 'encadrant'),
  ('0a000000-0000-4000-8000-0000000000a3', '0a000000-0000-4000-8000-000000000001', 'adherent.a@example.com',   'A', 'Adherent',  'adherent'),
  ('0a000000-0000-4000-8000-0000000000a4', '0a000000-0000-4000-8000-000000000001', 'tresorier.a@example.com',  'A', 'Tresorier', 'adherent'),
  ('0a000000-0000-4000-8000-0000000000a5', '0a000000-0000-4000-8000-000000000001', 'secretaire.a@example.com', 'A', 'Secretaire','adherent'),
  ('0b000000-0000-4000-8000-0000000000b1', '0b000000-0000-4000-8000-000000000001', 'president.b@example.com',  'B', 'President', 'admin_asso'),
  ('ff000000-0000-4000-8000-0000000000f1', null,                                   'super.admin@example.com',  'S', 'Admin',     'super_admin');

-- ——— Les cours ————————————————————————————————————————————————————————————————
insert into public.cours (id, organisation_id, nom, tarif_centimes, places_max) values
  ('0a000000-0000-4000-8000-0000000000c1', '0a000000-0000-4000-8000-000000000001', 'Boxe adultes A', 25000, 20),
  ('0b000000-0000-4000-8000-0000000000c1', '0b000000-0000-4000-8000-000000000001', 'Judo enfants B', 18000, 15);

-- ——— Les adhérents ————————————————————————————————————————————————————————————
-- `0a…d1` est rattaché au compte `adherent.a` : c'est lui qui permet d'exercer les
-- politiques « je vois mon propre dossier ».
insert into public.adherents (id, organisation_id, nom, prenom, email, user_id) values
  ('0a000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-000000000001', 'Dupont', 'Alice', 'alice@example.com', '0a000000-0000-4000-8000-0000000000a3'),
  ('0a000000-0000-4000-8000-0000000000d2', '0a000000-0000-4000-8000-000000000001', 'Martin', 'Bruno', 'bruno@example.com', null),
  ('0b000000-0000-4000-8000-0000000000d1', '0b000000-0000-4000-8000-000000000001', 'Bernard','Chloe', 'chloe@example.com', null);

insert into public.adhesions (id, organisation_id, adherent_id, cours_id, saison, montant_centimes, statut) values
  ('0a000000-0000-4000-8000-0000000000e1', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-0000000000c1', '2025-2026', 25000, 'paye'),
  ('0a000000-0000-4000-8000-0000000000e2', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d2', '0a000000-0000-4000-8000-0000000000c1', '2025-2026', 25000, 'en_attente'),
  ('0b000000-0000-4000-8000-0000000000e1', '0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-0000000000d1', '0b000000-0000-4000-8000-0000000000c1', '2025-2026', 18000, 'paye');

-- ——— Les données sensibles ————————————————————————————————————————————————————
insert into public.reglements (id, organisation_id, adhesion_id, montant_centimes, mode) values
  ('0a000000-0000-4000-8000-0000000000f1', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000e1', 25000, 'cheque'),
  ('0b000000-0000-4000-8000-0000000000f1', '0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-0000000000e1', 18000, 'especes');

insert into public.pieces_adherent (id, organisation_id, adherent_id, cle, label, statut) values
  ('0a000000-0000-4000-8000-00000000aa01', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d1', 'identite', 'Pièce d''identité', 'fournie'),
  ('0b000000-0000-4000-8000-00000000bb01', '0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-0000000000d1', 'identite', 'Pièce d''identité', 'manquante');

-- Données de santé (art. 9 RGPD). Le détail des réponses n'est JAMAIS stocké — seulement
-- le résultat, la signature et la date. La fixture respecte la même règle que le produit.
insert into public.questionnaires_sante (id, organisation_id, adherent_id, adhesion_id, type, resultat, signataire_nom) values
  ('0a000000-0000-4000-8000-0000000055f1', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d1', '0a000000-0000-4000-8000-0000000000e1', 'adulte', 'atteste_negatif', 'Alice Dupont'),
  ('0b000000-0000-4000-8000-0000000055f1', '0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-0000000000d1', '0b000000-0000-4000-8000-0000000000e1', 'adulte', 'atteste_negatif', 'Chloe Bernard');

insert into public.presences (id, organisation_id, adherent_id, date) values
  ('0a000000-0000-4000-8000-00000000ee01', '0a000000-0000-4000-8000-000000000001', '0a000000-0000-4000-8000-0000000000d1', current_date),
  ('0b000000-0000-4000-8000-00000000ee01', '0b000000-0000-4000-8000-000000000001', '0b000000-0000-4000-8000-0000000000d1', current_date);

commit;

-- ——— Le test mord-il ? ————————————————————————————————————————————————————————
-- Des fixtures qui n'auraient rien inséré rendraient tous les tests d'isolation verts.
do $$
declare n integer;
begin
  select count(*) into n from public.adherents;
  if n <> 3 then raise exception 'fixtures incomplètes : % adhérents au lieu de 3', n; end if;
  select count(*) into n from public.organisations;
  if n <> 2 then raise exception 'fixtures incomplètes : % organisations au lieu de 2', n; end if;
  raise notice 'Fixtures posées : 2 clubs, 7 comptes, 3 adhérents.';
end $$;
