/**
 * Le club de démonstration — données entièrement fictives.
 *
 * RÈGLE ABSOLUE DE CE DOSSIER : aucun import de Supabase, aucune Server Action, aucune
 * écriture. C'est la garantie de sécurité du mode démonstration, et elle est
 * structurelle, pas déclarative — s'il n'existe aucune action câblée sous `/demo`, il
 * n'y a rien à appeler directement, rien à contourner, et aucun oubli possible.
 * Un club réel marqué « démo » en base aurait exigé de garder chacune des cinquante
 * actions d'écriture du cockpit ; un seul oubli aurait fait le trou.
 *
 * AUCUNE DONNÉE RÉELLE. Les personnes, les montants, les messages et les dates sont
 * inventés. Le vocabulaire, les cours et les tarifs sont en revanche calés sur de vrais
 * studios et associations de yoga français (relevés le 30/07/2026) : c'est ce qui fait
 * qu'un président reconnaît son métier au lieu de lire une maquette.
 *
 * Un club de yoga et non de boxe : l'USM sert déjà de preuve, et montrer une autre
 * discipline dit mieux que n'importe quelle phrase que Klubster n'est pas un logiciel
 * de sports de combat.
 */

export const CLUB = {
  nom: "L’Arbre et le Souffle",
  ville: "Angers",
  slug: "demo",
  couleur: "#6B7F5E", // vert sauge — la couleur du club, pas celle de Klubster
  saison: "2026-2027",
  adherents: 186,
  president: "Hélène Vasseur",
  email: "contact@arbre-et-souffle.example",
} as const;

export type Cours = {
  id: string;
  nom: string;
  professeur: string;
  jour: string;
  horaire: string;
  salle: string;
  places: number;
  inscrits: number;
  tarifAnnuelEuros: number;
};

/**
 * Six cours, calés sur ce que proposent réellement les studios : hatha traditionnel,
 * vinyasa dynamique, yin lent, nidra, prénatal et un cours sur chaise pour les seniors.
 * Le prénatal est volontairement en petit effectif — c'est la réalité du terrain.
 */
export const COURS: Cours[] = [
  { id: "c1", nom: "Hatha Yoga", professeur: "Hélène Vasseur", jour: "Lundi", horaire: "18:30–19:45", salle: "Grande salle", places: 22, inscrits: 22, tarifAnnuelEuros: 295 },
  { id: "c2", nom: "Vinyasa Flow", professeur: "Camille Ferrand", jour: "Mardi", horaire: "12:30–13:30", salle: "Grande salle", places: 20, inscrits: 18, tarifAnnuelEuros: 295 },
  { id: "c3", nom: "Yin Yoga", professeur: "Camille Ferrand", jour: "Mercredi", horaire: "19:00–20:15", salle: "Petite salle", places: 16, inscrits: 16, tarifAnnuelEuros: 295 },
  { id: "c4", nom: "Yoga Nidra", professeur: "Sonia Delaunay", jour: "Jeudi", horaire: "20:00–21:00", salle: "Petite salle", places: 18, inscrits: 11, tarifAnnuelEuros: 245 },
  { id: "c5", nom: "Yoga prénatal", professeur: "Hélène Vasseur", jour: "Samedi", horaire: "10:00–11:15", salle: "Petite salle", places: 8, inscrits: 6, tarifAnnuelEuros: 265 },
  { id: "c6", nom: "Yoga sur chaise", professeur: "Sonia Delaunay", jour: "Vendredi", horaire: "14:30–15:30", salle: "Grande salle", places: 14, inscrits: 12, tarifAnnuelEuros: 210 },
];

export const ADHESION_EUROS = 18;

export type StatutDossier = "complet" | "piece" | "sante";
export type StatutPaiement = "paye" | "echeances" | "retard" | "attente";

export type Adherent = {
  id: string;
  prenom: string;
  nom: string;
  cours: string;
  age: number;
  dossier: StatutDossier;
  paiement: StatutPaiement;
  duEuros: number;
  regleEuros: number;
  inscritLe: string;
};

/**
 * Vingt-quatre fiches détaillées — assez pour que les listes, les filtres et les
 * compteurs racontent quelque chose, sans écrire 186 lignes à la main. Les totaux
 * affichés ailleurs portent sur l'effectif complet du club ; ces fiches en sont
 * l'échantillon consultable, ce que la page dit explicitement.
 *
 * Les prénoms sont volontairement banals et variés en âge : un club de yoga va de
 * l'étudiante de 24 ans à la retraitée de 71.
 */
export const ADHERENTS: Adherent[] = [
  { id: "a01", prenom: "Marion", nom: "Berthier", cours: "Hatha Yoga", age: 42, dossier: "complet", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-02" },
  { id: "a02", prenom: "Sylvie", nom: "Nguyen", cours: "Vinyasa Flow", age: 51, dossier: "complet", paiement: "echeances", duEuros: 313, regleEuros: 156, inscritLe: "2026-09-02" },
  { id: "a03", prenom: "Thomas", nom: "Leclerc", cours: "Hatha Yoga", age: 37, dossier: "piece", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-03" },
  { id: "a04", prenom: "Aïcha", nom: "Benali", cours: "Yin Yoga", age: 29, dossier: "complet", paiement: "retard", duEuros: 313, regleEuros: 0, inscritLe: "2026-09-03" },
  { id: "a05", prenom: "Claire", nom: "Moreau", cours: "Yoga prénatal", age: 33, dossier: "sante", paiement: "paye", duEuros: 283, regleEuros: 283, inscritLe: "2026-09-04" },
  { id: "a06", prenom: "Jean-Paul", nom: "Rousseau", cours: "Yoga sur chaise", age: 71, dossier: "complet", paiement: "paye", duEuros: 228, regleEuros: 228, inscritLe: "2026-09-04" },
  { id: "a07", prenom: "Léa", nom: "Fontaine", cours: "Vinyasa Flow", age: 24, dossier: "piece", paiement: "echeances", duEuros: 313, regleEuros: 104, inscritLe: "2026-09-05" },
  { id: "a08", prenom: "Marc", nom: "Dubois", cours: "Yin Yoga", age: 48, dossier: "complet", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-05" },
  { id: "a09", prenom: "Nadia", nom: "Cherif", cours: "Yoga Nidra", age: 39, dossier: "complet", paiement: "attente", duEuros: 263, regleEuros: 0, inscritLe: "2026-09-08" },
  { id: "a10", prenom: "Béatrice", nom: "Lemoine", cours: "Yoga sur chaise", age: 68, dossier: "complet", paiement: "paye", duEuros: 228, regleEuros: 228, inscritLe: "2026-09-08" },
  { id: "a11", prenom: "Pierre", nom: "Garnier", cours: "Hatha Yoga", age: 55, dossier: "complet", paiement: "echeances", duEuros: 313, regleEuros: 208, inscritLe: "2026-09-09" },
  { id: "a12", prenom: "Émilie", nom: "Roux", cours: "Vinyasa Flow", age: 31, dossier: "piece", paiement: "retard", duEuros: 313, regleEuros: 0, inscritLe: "2026-09-09" },
  { id: "a13", prenom: "Sarah", nom: "Petit", cours: "Yoga prénatal", age: 28, dossier: "complet", paiement: "paye", duEuros: 283, regleEuros: 283, inscritLe: "2026-09-10" },
  { id: "a14", prenom: "Antoine", nom: "Mercier", cours: "Yin Yoga", age: 44, dossier: "complet", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-10" },
  { id: "a15", prenom: "Fatou", nom: "Diallo", cours: "Yoga Nidra", age: 36, dossier: "complet", paiement: "paye", duEuros: 263, regleEuros: 263, inscritLe: "2026-09-11" },
  { id: "a16", prenom: "Michel", nom: "Chevalier", cours: "Yoga sur chaise", age: 74, dossier: "sante", paiement: "paye", duEuros: 228, regleEuros: 228, inscritLe: "2026-09-11" },
  { id: "a17", prenom: "Julie", nom: "Barbier", cours: "Hatha Yoga", age: 40, dossier: "complet", paiement: "echeances", duEuros: 313, regleEuros: 156, inscritLe: "2026-09-12" },
  { id: "a18", prenom: "Karim", nom: "Haddad", cours: "Vinyasa Flow", age: 34, dossier: "complet", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-12" },
  { id: "a19", prenom: "Anne", nom: "Girard", cours: "Yin Yoga", age: 59, dossier: "piece", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-15" },
  { id: "a20", prenom: "Valérie", nom: "Perrin", cours: "Yoga Nidra", age: 46, dossier: "complet", paiement: "retard", duEuros: 263, regleEuros: 0, inscritLe: "2026-09-15" },
  { id: "a21", prenom: "Sophie", nom: "Marchand", cours: "Yoga prénatal", age: 30, dossier: "complet", paiement: "paye", duEuros: 283, regleEuros: 283, inscritLe: "2026-09-16" },
  { id: "a22", prenom: "Denis", nom: "Bonnet", cours: "Hatha Yoga", age: 62, dossier: "complet", paiement: "paye", duEuros: 313, regleEuros: 313, inscritLe: "2026-09-16" },
  { id: "a23", prenom: "Inès", nom: "Faure", cours: "Vinyasa Flow", age: 26, dossier: "complet", paiement: "echeances", duEuros: 313, regleEuros: 104, inscritLe: "2026-09-17" },
  { id: "a24", prenom: "Christine", nom: "Lambert", cours: "Yoga sur chaise", age: 66, dossier: "complet", paiement: "paye", duEuros: 228, regleEuros: 228, inscritLe: "2026-09-17" },
];

/** Chiffres du club entier — pas seulement de l'échantillon consultable ci-dessus. */
export const CHIFFRES = {
  adherents: 186,
  dossiersIncomplets: 14,
  cotisationsEnRetard: 9,
  resteDuEuros: 2_640,
  encaisseEuros: 48_190,
  inscriptionsSemaine: 7,
  remisesAValider: 2,
} as const;

export type Message = {
  id: string;
  destinataires: string;
  objet: string;
  envoyeLe: string;
  nb: number;
  ouvertures: number;
};

export const MESSAGES: Message[] = [
  { id: "m1", destinataires: "Tous les adhérents", objet: "Fermeture du studio pendant les vacances de la Toussaint", envoyeLe: "2026-10-14", nb: 186, ouvertures: 141 },
  { id: "m2", destinataires: "Yoga prénatal", objet: "Atelier respiration — samedi 8 novembre", envoyeLe: "2026-10-09", nb: 6, ouvertures: 6 },
  { id: "m3", destinataires: "Dossiers incomplets", objet: "Il manque une pièce à votre dossier", envoyeLe: "2026-10-06", nb: 14, ouvertures: 11 },
  { id: "m4", destinataires: "Cotisations en retard", objet: "Rappel — cotisation de la saison", envoyeLe: "2026-10-02", nb: 9, ouvertures: 8 },
  { id: "m5", destinataires: "Yoga sur chaise", objet: "Changement de salle à partir du 15 septembre", envoyeLe: "2026-09-12", nb: 12, ouvertures: 12 },
];

export type Presence = { prenom: string; nom: string; heure: string; reglement: "ok" | "ko"; dossier: "ok" | "ko" };

/** Le cours du soir, tel qu'il se remplit au fil des scans. */
export const PRESENCES: Presence[] = [
  { prenom: "Marion", nom: "Berthier", heure: "18:22", reglement: "ok", dossier: "ok" },
  { prenom: "Pierre", nom: "Garnier", heure: "18:24", reglement: "ok", dossier: "ok" },
  { prenom: "Thomas", nom: "Leclerc", heure: "18:25", reglement: "ok", dossier: "ko" },
  { prenom: "Julie", nom: "Barbier", heure: "18:26", reglement: "ok", dossier: "ok" },
  { prenom: "Denis", nom: "Bonnet", heure: "18:27", reglement: "ok", dossier: "ok" },
];

export const ACTUALITES = [
  { titre: "Stage de Yin Yoga — dimanche 23 novembre", date: "2026-10-12" },
  { titre: "Bienvenue à Sonia, qui rejoint l’équipe", date: "2026-09-01" },
  { titre: "Reprise des cours le lundi 1er septembre", date: "2026-08-20" },
];

export const euros = (n: number) => `${n.toLocaleString("fr-FR")} €`;
