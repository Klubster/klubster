-- Opposition aux communications FACULTATIVES (lot K — clôture, 04/08/2026).
--
-- CE QUE C'EST : une date, posée sur l'adhérent, qui l'exclut des messages collectifs
-- de son club (« tous », « parents », « un cours »). La date EST la traçabilité :
-- quand l'opposition a été enregistrée, pas seulement qu'elle existe.
--
-- CE QUE CE N'EST PAS : un interrupteur global « plus aucun email ». Les messages
-- NÉCESSAIRES à l'exécution de l'adhésion continuent de partir : relances de pièces
-- manquantes, relances de cotisation, confirmations. Le ciblage « dossiers incomplets »
-- reste également servi — c'est un message de gestion du dossier, pas une communication.
-- Cette distinction est appliquée dans src/lib/ciblage.ts (source unique du ciblage) ;
-- le cron de relances ne lit pas cette colonne, à dessein.
--
-- RETOUR ARRIÈRE : alter table adherents drop column opposition_communications;

alter table adherents
  add column if not exists opposition_communications timestamptz;

comment on column adherents.opposition_communications is
  'Date d''enregistrement de l''opposition aux communications facultatives (messages collectifs). NULL = pas d''opposition. Ne bloque jamais les messages nécessaires à l''exécution de l''adhésion (relances de dossier et de cotisation, confirmations).';

-- Même régime que les autres colonnes modifiables de la fiche : le grant par colonne
-- ouvre, les RLS et les gardes serveur (exigerPermission) ferment.
grant update (opposition_communications) on adherents to authenticated;
