/**
 * Les chiffres de preuve affichés sur les pages publiques de Klubster.
 *
 * Ils étaient recopiés à la main dans la home, /fonctionnalites et les pages de
 * campagne, avec la mention « à rafraîchir en début de saison » — et avaient déjà
 * divergé (312 partout, 313 en base). Une seule source désormais.
 *
 * RÈGLE : ces valeurs viennent de la base de production, jamais d'une estimation.
 * Requête de contrôle :
 *   select count(*) from adherents a
 *   join organisations o on o.id = a.organisation_id
 *   where o.slug = 'usmboxe';
 *
 * Ne rien ajouter ici qui ne soit pas mesurable de la même façon. En particulier :
 * aucun gain de temps, aucun taux d'impayés évités tant que la saison 2026-2027
 * n'a pas été mesurée (voir /cas-clients/usm-boxe-anglaise).
 */

/** Adhérents de l'USM Boxe Anglaise présents dans Klubster. Relevé le 29/07/2026. */
export const USM_ADHERENTS = 313;

/** Cours configurés par le club. Relevé le 29/07/2026. */
export const USM_COURS = 6;

/** Date du dernier relevé, au format lisible — affichée quand un chiffre est daté. */
export const USM_RELEVE = "29 juillet 2026";

/** Nombre de clubs de l'offre de lancement. Limite réelle, pas un argument de rareté. */
export const CLUBS_FONDATEURS = 15;
