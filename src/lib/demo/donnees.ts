/**
 * Le club de démonstration — données entièrement fictives, état initial de la simulation.
 *
 * AUCUNE DONNÉE RÉELLE. Les personnes, les montants, les messages et les dates sont
 * inventés ; toutes les adresses sont en `@example.com`, domaine réservé par la RFC 2606
 * et qui n'appartiendra jamais à personne. Le vocabulaire, les cours et les tarifs sont
 * en revanche calés sur de vrais studios de yoga français : c'est ce qui fait qu'un
 * président reconnaît son métier au lieu de lire une maquette.
 *
 * Un club de yoga et non de boxe : l'USM sert déjà de preuve, et montrer une autre
 * discipline dit mieux que n'importe quelle phrase que Klubster n'est pas un logiciel de
 * sports de combat.
 *
 * PAS DE MINEUR dans ce club — les âges vont de 24 à 74 ans. Le groupe « Responsables
 * légaux des mineurs » du composeur affichera donc ZÉRO destinataire et désactivera
 * l'envoi. C'est la vérité de ce club, pas un oubli : un président de club de yoga y
 * reconnaîtra le sien, là où deux adolescents glissés pour faire joli auraient sonné faux.
 */

import type {
  ActualiteDemo, AdherentDemo, AdhesionDemo, CampagneDemo, CoursDemo, FormConfigDemo,
  PageConfigDemo, PieceDemo, PresenceDemo, QuestionnaireDemo, ReglementDemo,
} from "./types";

export const CLUB = {
  nom: "L’Arbre et le Souffle",
  ville: "Angers",
  couleur: "#6B7F5E", // vert sauge — la couleur du club, pas celle de Klubster
  saison: "2026-2027",
  president: "Hélène Vasseur",
  email: "contact@example.com",
  telephone: "02 41 00 00 00",
  adresse: "12 rue des Lices, 49100 Angers",
} as const;

/** Date figée : la simulation ne dépend pas de l'horloge, l'affichage est reproductible. */
export const AUJOURDHUI = "2026-10-20";

// ——— Cours ————————————————————————————————————————————————————————————————————

export const COURS_INITIAUX: CoursDemo[] = [
  { id: "c1", nom: "Hatha Yoga", public_cible: "Tous niveaux", tarif_centimes: 29500, places_max: 22, creneaux: [{ jour: "lundi", debut: "18:30", fin: "19:45", note: "" }] },
  { id: "c2", nom: "Vinyasa Flow", public_cible: "Intermédiaire", tarif_centimes: 29500, places_max: 20, creneaux: [{ jour: "mardi", debut: "12:30", fin: "13:30", note: "pause déjeuner" }] },
  { id: "c3", nom: "Yin Yoga", public_cible: null, tarif_centimes: 29500, places_max: 16, creneaux: [{ jour: "mercredi", debut: "19:00", fin: "20:15", note: "" }] },
  { id: "c4", nom: "Yoga Nidra", public_cible: "Débutants bienvenus", tarif_centimes: 24500, places_max: 18, creneaux: [{ jour: "jeudi", debut: "20:00", fin: "21:00", note: "" }] },
  { id: "c5", nom: "Yoga prénatal", public_cible: "Futures mamans", tarif_centimes: 26500, places_max: 8, creneaux: [{ jour: "samedi", debut: "10:00", fin: "11:15", note: "" }] },
  { id: "c6", nom: "Yoga sur chaise", public_cible: "Seniors", tarif_centimes: 21000, places_max: 14, creneaux: [{ jour: "vendredi", debut: "14:30", fin: "15:30", note: "mobilité douce" }] },
];

/** Cotisation = tarif du cours + 18 € d'adhésion à l'association. */
export const ADHESION_ASSO_CENTIMES = 1800;
const t = (coursId: string) =>
  (COURS_INITIAUX.find((c) => c.id === coursId)?.tarif_centimes ?? 0) + ADHESION_ASSO_CENTIMES;

// ——— Adhérents ————————————————————————————————————————————————————————————————
// 34 fiches : au-delà des 25 d'une page, pour que la pagination se voie vraiment.

// Email ET téléphone peuvent manquer : un club a toujours quelques adhérents sans
// adresse — c'est ce qui rend crédible le « 33 destinataires avec un email » du
// composeur, et ce qui fait exister la mention « Pas d'email » sur les relances.
type Brut = [string, string, string | null, string | null, string, string, string];
//           prénom  nom     email          téléphone      inscritLe  coursId  statut

const BRUTS: Brut[] = [
  ["Marion", "Berthier", "marion.berthier@example.com", "06 12 34 56 78", "2026-09-02", "c1", "paye"],
  ["Sylvie", "Nguyen", "s.nguyen@example.com", "06 23 45 67 89", "2026-09-02", "c2", "en_attente"],
  ["Thomas", "Leclerc", "t.leclerc@example.com", null, "2026-09-03", "c1", "paye"],
  ["Aïcha", "Benali", "aicha.benali@example.com", "06 34 56 78 90", "2026-09-03", "c3", "en_retard"],
  ["Claire", "Moreau", "claire.moreau@example.com", "06 45 67 89 01", "2026-09-04", "c5", "paye"],
  ["Jean-Paul", "Rousseau", "jp.rousseau@example.com", "02 41 11 22 33", "2026-09-04", "c6", "paye"],
  ["Léa", "Fontaine", "lea.fontaine@example.com", "06 56 78 90 12", "2026-09-05", "c2", "en_attente"],
  ["Marc", "Dubois", "marc.dubois@example.com", null, "2026-09-05", "c3", "paye"],
  ["Nadia", "Cherif", "n.cherif@example.com", "06 67 89 01 23", "2026-09-08", "c4", "en_attente"],
  ["Béatrice", "Lemoine", "b.lemoine@example.com", "02 41 44 55 66", "2026-09-08", "c6", "paye"],
  ["Pierre", "Garnier", "p.garnier@example.com", "06 78 90 12 34", "2026-09-09", "c1", "en_attente"],
  ["Émilie", "Roux", "emilie.roux@example.com", "06 89 01 23 45", "2026-09-09", "c2", "en_retard"],
  ["Sarah", "Petit", "sarah.petit@example.com", "06 90 12 34 56", "2026-09-10", "c5", "paye"],
  ["Antoine", "Mercier", "a.mercier@example.com", null, "2026-09-10", "c3", "paye"],
  ["Fatou", "Diallo", "fatou.diallo@example.com", "06 01 23 45 67", "2026-09-11", "c4", "paye"],
  ["Michel", "Chevalier", null, "02 41 77 88 99", "2026-09-11", "c6", "paye"],
  ["Julie", "Barbier", "julie.barbier@example.com", "06 11 22 33 44", "2026-09-12", "c1", "en_attente"],
  ["Karim", "Haddad", "k.haddad@example.com", "06 22 33 44 55", "2026-09-12", "c2", "paye"],
  ["Anne", "Girard", "anne.girard@example.com", "06 33 44 55 66", "2026-09-15", "c3", "paye"],
  ["Valérie", "Perrin", "v.perrin@example.com", "06 44 55 66 77", "2026-09-15", "c4", "en_retard"],
  ["Sophie", "Marchand", "s.marchand@example.com", "06 55 66 77 88", "2026-09-16", "c5", "paye"],
  ["Denis", "Bonnet", "denis.bonnet@example.com", null, "2026-09-16", "c1", "paye"],
  ["Inès", "Faure", "ines.faure@example.com", "06 66 77 88 99", "2026-09-17", "c2", "en_attente"],
  ["Christine", "Lambert", "c.lambert@example.com", "02 41 99 00 11", "2026-09-17", "c6", "paye"],
  ["Olivier", "Renard", "o.renard@example.com", "06 77 88 99 00", "2026-09-18", "c3", "paye"],
  ["Nathalie", "Colin", "n.colin@example.com", "06 88 99 00 11", "2026-09-18", "c4", "en_attente"],
  ["Bruno", "Leroy", "b.leroy@example.com", null, "2026-09-19", "c6", "paye"],
  ["Céline", "Masson", "c.masson@example.com", "06 99 00 11 22", "2026-09-19", "c1", "paye"],
  ["Hugo", "Blanchard", "h.blanchard@example.com", "06 10 20 30 40", "2026-09-22", "c2", "en_retard"],
  ["Amina", "Toure", "a.toure@example.com", "06 20 30 40 50", "2026-09-22", "c3", "paye"],
  ["Patrick", "Guerin", "p.guerin@example.com", "02 41 30 40 50", "2026-09-23", "c6", "paye"],
  ["Laure", "Vidal", "l.vidal@example.com", "06 40 50 60 70", "2026-09-23", "c4", "paye"],
  ["Samir", "Bakri", "s.bakri@example.com", "06 50 60 70 80", "2026-09-24", "c1", "en_attente"],
  ["Isabelle", "Poirier", "i.poirier@example.com", "06 60 70 80 90", "2026-09-24", "c5", "paye"],
];

const INFOS: Record<number, Record<string, string>> = {
  0: { "Comment avez-vous connu l’association ?": "Bouche-à-oreille" },
  2: { "Personne à prévenir en cas d’urgence": "Camille Leclerc", "Téléphone de la personne à prévenir": "06 98 76 54 32" },
  4: { "Niveau de pratique": "Débutant" },
  9: { "Personne à prévenir en cas d’urgence": "Alain Lemoine", "Téléphone de la personne à prévenir": "02 41 55 44 33" },
  12: { "Niveau de pratique": "Intermédiaire" },
  17: { "Comment avez-vous connu l’association ?": "Forum des associations" },
  20: { "Niveau de pratique": "Confirmé" },
};

const num = (i: number) => String(i + 1).padStart(2, "0");

export const ADHERENTS_INITIAUX: AdherentDemo[] = BRUTS.map((b, i) => ({
  id: `a${num(i)}`,
  prenom: b[0],
  nom: b[1],
  email: b[2],
  telephone: b[3],
  created_at: b[4],
  infos: INFOS[i] ?? {},
}));

export const ADHESIONS_INITIALES: AdhesionDemo[] = BRUTS.map((b, i) => ({
  id: `ad${num(i)}`,
  adherent_id: `a${num(i)}`,
  cours_id: b[5],
  saison: CLUB.saison,
  statut: b[6] as AdhesionDemo["statut"],
  montant_centimes: t(b[5]),
  // Le mode « en ligne » n'est posé que là où un règlement en ligne existe (voir plus bas).
  mode_paiement: b[6] === "paye" && i % 4 === 0 ? "en_ligne" : i % 3 === 0 ? "especes" : "cheque",
  stripe_payment_intent: null,
}));

// Le Hatha est complet (22 places) : la suivante s'inscrit en liste d'attente. C'est la
// jauge, et rien d'autre, qui le déclenche — exactement comme dans le produit.
ADHESIONS_INITIALES.push({
  id: "ad-attente",
  adherent_id: "a12",
  cours_id: "c1",
  saison: CLUB.saison,
  statut: "liste_attente",
  montant_centimes: t("c1"),
  mode_paiement: null,
  stripe_payment_intent: null,
});

// UNE adhésion payée par carte, pour que le panneau de remboursement soit atteignable.
// C'est le seul chemin du cockpit qui lit `stripe_payment_intent` — et le seul qu'on
// n'a jamais pu exercer en production, faute de donnée (voir docs/deploiement-0026-0027).
const CARTE = ADHESIONS_INITIALES.find((a) => a.adherent_id === "a01")!;
CARTE.mode_paiement = "en_ligne";
CARTE.stripe_payment_intent = "pi_3QdemonstrationFictive";

// ——— Règlements ———————————————————————————————————————————————————————————————
// Les adhésions « payées » sont soldées ; deux « en attente » portent un acompte, pour
// que le « reste » ait un sens à l'écran. Cinq chèques ne sont pas encore remis.

export const REGLEMENTS_INITIAUX: ReglementDemo[] = [];
ADHESIONS_INITIALES.forEach((a, i) => {
  if (a.statut === "paye") {
    REGLEMENTS_INITIAUX.push({
      id: `r${num(i)}`,
      adhesion_id: a.id,
      montant_centimes: a.montant_centimes,
      mode: (a.mode_paiement as ReglementDemo["mode"]) ?? "cheque",
      note: null,
      created_at: a.id === "ad01" ? "2026-09-02" : "2026-09-15",
      // Les chèques des cinq premiers sont déjà déposés ; les autres attendent.
      remis_le: a.mode_paiement === "cheque" && i < 12 ? "2026-09-20" : null,
    });
  }
});

REGLEMENTS_INITIAUX.push(
  { id: "r-acompte-1", adhesion_id: "ad02", montant_centimes: 15000, mode: "cheque", note: null, created_at: "2026-09-05", remis_le: null },
  { id: "r-acompte-2", adhesion_id: "ad11", montant_centimes: 10000, mode: "autre", note: "Chèque vacances", created_at: "2026-09-12", remis_le: null }
);

// ——— Pièces ———————————————————————————————————————————————————————————————————
// Cinq dossiers incomplets : assez pour que le groupe « Dossiers incomplets » du
// composeur et le filtre de la liste racontent quelque chose.

const SANS_CERTIFICAT = new Set(["a03", "a07", "a12", "a19", "a26"]);

export const PIECES_INITIALES: PieceDemo[] = ADHERENTS_INITIAUX.flatMap((a) => [
  {
    id: `${a.id}-certificat`,
    adherent_id: a.id,
    cle: "certificat",
    label: "Certificat médical de non contre-indication",
    statut: SANS_CERTIFICAT.has(a.id) ? ("manquante" as const) : ("recue" as const),
    aUnFichier: !SANS_CERTIFICAT.has(a.id),
  },
  {
    id: `${a.id}-photo`,
    adherent_id: a.id,
    cle: "photo",
    label: "Photo d’identité",
    statut: "recue" as const,
    aUnFichier: true,
  },
]);

export const QUESTIONNAIRES_INITIAUX: QuestionnaireDemo[] = [
  { adherent_id: "a05", resultat: "certificat_requis", signataire_nom: "Claire Moreau", created_at: "2026-09-04" },
  { adherent_id: "a16", resultat: "certificat_requis", signataire_nom: "Michel Chevalier", created_at: "2026-09-11" },
  { adherent_id: "a01", resultat: "atteste", signataire_nom: "Marion Berthier", created_at: "2026-09-02" },
];

// ——— Campagnes ————————————————————————————————————————————————————————————————

const emailsDe = (ids: string[]) =>
  ids.map((id) => ADHERENTS_INITIAUX.find((a) => a.id === id)?.email).filter((e): e is string => !!e);

const tous = ADHERENTS_INITIAUX.filter((a) => a.email).map((a) => a.email as string);

export const CAMPAGNES_INITIALES: CampagneDemo[] = [
  {
    id: "m1",
    objet: "Fermeture du studio pendant les vacances de la Toussaint",
    corps:
      "Bonjour,\n\nLe studio sera fermé du samedi 18 au dimanche 26 octobre. Les cours reprennent normalement le lundi 27.\n\nBelle pratique à toutes et à tous,\nHélène",
    groupe_libelle: "Tous les adhérents",
    auteur_nom: CLUB.president,
    statut: "partiel",
    created_at: "2026-10-14T18:12:00",
    // Un rejet et un signalement : l'ordre de grandeur réel d'un carnet d'adresses de
    // club — boîtes pleines, adresses professionnelles fermées. Zéro aurait été flatteur.
    destinataires: tous.map((email, i) => ({
      id: `m1-d${i}`,
      email,
      statut: i === 3 ? ("rejete" as const) : i === 11 ? ("plainte" as const) : ("distribue" as const),
    })),
  },
  {
    id: "m2",
    objet: "Atelier respiration — samedi 8 novembre",
    corps:
      "Bonjour,\n\nUn atelier respiration est proposé le samedi 8 novembre de 10 h à 12 h, en complément du cours prénatal. Inscription auprès d’Hélène.\n\nÀ samedi,\nHélène",
    groupe_libelle: "Yoga prénatal",
    auteur_nom: CLUB.president,
    statut: "envoye",
    created_at: "2026-10-09T09:30:00",
    destinataires: emailsDe(["a05", "a13", "a21", "a34"]).map((email, i) => ({
      id: `m2-d${i}`,
      email,
      statut: "distribue" as const,
    })),
  },
  {
    id: "m3",
    objet: "Il manque une pièce à votre dossier",
    corps:
      "Bonjour,\n\nSauf erreur de notre part, il manque encore une pièce à votre dossier. Vous pouvez la déposer depuis votre espace adhérent, ou l’apporter au prochain cours.\n\nMerci,\nL’Arbre et le Souffle",
    groupe_libelle: "Dossiers incomplets",
    auteur_nom: CLUB.president,
    statut: "envoye",
    created_at: "2026-10-06T20:45:00",
    destinataires: emailsDe(["a03", "a07", "a12", "a19", "a26"]).map((email, i) => ({
      id: `m3-d${i}`,
      email,
      statut: i === 2 ? ("retarde" as const) : ("distribue" as const),
    })),
  },
];

// ——— Formulaire ———————————————————————————————————————————————————————————————

export const FORM_CONFIG_INITIALE: FormConfigDemo = {
  pages: [
    {
      id: "pg1",
      titre: "Pratique & urgence",
      champs: [
        { id: "ch1", type: "texte", label: "Personne à prévenir en cas d’urgence", obligatoire: true },
        { id: "ch2", type: "tel", label: "Téléphone de la personne à prévenir", obligatoire: true },
        { id: "ch3", type: "choix", label: "Niveau de pratique", obligatoire: false, options: "Débutant, Intermédiaire, Confirmé" },
        { id: "ch4", type: "case", label: "J’autorise l’association à utiliser des photos prises pendant les cours", obligatoire: false },
        { id: "ch5", type: "choix", label: "Comment avez-vous connu l’association ?", obligatoire: false, options: "Bouche-à-oreille, Réseaux sociaux, Recherche internet, Forum des associations, Autre" },
      ],
    },
  ],
  pieces: [
    { id: "pf1", label: "Certificat médical de non contre-indication", obligatoire: true, cours_id: null },
    { id: "pf2", label: "Photo d’identité", obligatoire: false, cours_id: null },
  ],
  remises: [
    { id: "rm1", label: "Pass’Sport", montant_centimes: 7000, exigeCode: true, description: "Aide de l’État pour les jeunes éligibles : saisissez le code reçu, le club le vérifiera." },
  ],
  autorisations: [],
  sante: true,
};

// ——— Actualités ———————————————————————————————————————————————————————————————

export const ACTUALITES_INITIALES: ActualiteDemo[] = [
  { id: "n1", titre: "Stage de Yin Yoga — dimanche 23 novembre", texte: "Une journée entière consacrée au Yin, de 10 h à 17 h, avec Camille.\n\nRepas partagé le midi. Tapis et bolsters fournis. Inscription auprès du bureau, dans la limite de seize places.", publie_le: "2026-10-12", aUneImage: true },
  { id: "n2", titre: "Bienvenue à Sonia, qui rejoint l’équipe", texte: "Sonia enseigne le Nidra depuis douze ans. Elle reprend le cours du jeudi soir et ouvrira un atelier de méditation au printemps.", publie_le: "2026-09-01", aUneImage: false },
  { id: "n3", titre: "Reprise des cours le lundi 1er septembre", texte: "Tous les cours reprennent à leurs horaires habituels. Les inscriptions restent ouvertes jusqu’à la fin du mois.", publie_le: "2026-08-20", aUneImage: false },
];

// ——— Vitrine ——————————————————————————————————————————————————————————————————

export const PAGE_CONFIG_INITIALE: PageConfigDemo = {
  ordre: ["presentation", "cours", "planning", "tarifs", "actualites", "infos", "contact"],
  masquees: [],
  custom: [
    { id: "cx1", type: "president", titre: "Le mot de la présidente", texte: "Ici, on ne cherche pas la performance. On cherche le souffle, et il vient tout seul." },
    { id: "cx2", type: "chiffres", titre: "Le club en chiffres", texte: "2011 · Année de création — 34 · Adhérents — 6 · Cours par semaine" },
  ],
};

// ——— Présences ————————————————————————————————————————————————————————————————
// Trois personnes déjà pointées ce soir : le scanner montre l'état « déjà présent »
// sans qu'il faille d'abord en marquer une.

export const PRESENCES_INITIALES: PresenceDemo[] = [
  { adherent_id: "a01", jour: AUJOURDHUI },
  { adherent_id: "a11", jour: AUJOURDHUI },
  { adherent_id: "a22", jour: AUJOURDHUI },
];

// ——— Formats ——————————————————————————————————————————————————————————————————
// Mêmes formats que le produit : centimes en base, euros à l'écran, virgule décimale.

export const eur = (centimes: number) =>
  (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR");

export const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
