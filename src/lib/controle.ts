/**
 * Catalogue du contrôle terrain : pour chaque statut rendu par la RPC
 * `controler_adherent`, ce que l'encadrant LIT et ce qu'il FAIT.
 *
 * Règles d'écriture, héritées du lot cockpit :
 * - un texte explicite d'abord — le symbole et la couleur COMPLÈTENT, ils ne
 *   remplacent jamais les mots (daltonisme, soleil sur l'écran, hâte) ;
 * - chaque ligne finit par l'action suivante : « prévenir le responsable »,
 *   « voir le bureau », « renouvellement à faire » — jamais un constat sec.
 *
 * Dans `src/lib` pour être couvert par les tests : le vocabulaire du bord de
 * tapis ne doit pas dériver au gré des retouches d'écran.
 */

export type TonControle = "ok" | "attention" | "refus";

export interface LigneControle {
  symbole: string;
  titre: string;
  action: string;
  ton: TonControle;
  /** Peut-on proposer « Marquer présent » ? Un refus ne se pointe pas. */
  pointable: boolean;
}

export const COULEURS_CONTROLE: Record<TonControle, string> = {
  ok: "#1E7A4F",
  attention: "#8A6508",
  refus: "#B23B3B",
};

export const CATALOGUE_CONTROLE: Record<string, LigneControle> = {
  a_jour: {
    symbole: "✓",
    titre: "Accès autorisé",
    action: "Dossier complet — bon cours !",
    ton: "ok",
    pointable: true,
  },
  paiement_attendu: {
    symbole: "⚠",
    titre: "Paiement en attente",
    action: "Laisser entrer, prévenir le responsable.",
    ton: "attention",
    pointable: true,
  },
  en_retard: {
    symbole: "⚠",
    titre: "Paiement en retard",
    action: "Laisser entrer, prévenir le responsable.",
    ton: "attention",
    pointable: true,
  },
  dossier_incomplet: {
    symbole: "⚠",
    titre: "Dossier incomplet",
    action: "Laisser entrer, pièces à fournir.",
    ton: "attention",
    pointable: true,
  },
  questionnaire_manquant: {
    symbole: "⚠",
    titre: "Questionnaire de santé manquant",
    action: "À faire remplir avant le prochain cours.",
    ton: "attention",
    pointable: true,
  },
  liste_attente: {
    symbole: "✕",
    titre: "Liste d'attente",
    action: "Place non confirmée — voir le bureau.",
    ton: "refus",
    pointable: false,
  },
  annule: {
    symbole: "✕",
    titre: "Adhésion annulée",
    action: "Voir le bureau.",
    ton: "refus",
    pointable: false,
  },
  rembourse: {
    symbole: "✕",
    titre: "Adhésion remboursée",
    action: "Voir le bureau.",
    ton: "refus",
    pointable: false,
  },
  saison_precedente: {
    symbole: "✕",
    titre: "Saison précédente",
    action: "Renouvellement à faire.",
    ton: "refus",
    pointable: false,
  },
  non_inscrit_ce_cours: {
    symbole: "✕",
    titre: "Non inscrit à ce cours",
    action: "Inscrit à un autre cours — vérifier le cours sélectionné, ou voir le bureau.",
    ton: "refus",
    pointable: false,
  },
  aucune_adhesion: {
    symbole: "✕",
    titre: "Aucune adhésion",
    action: "Inscription à faire.",
    ton: "refus",
    pointable: false,
  },
  introuvable: {
    symbole: "✕",
    titre: "Adhérent introuvable",
    action: "Vérifier le nom, ou voir le bureau.",
    ton: "refus",
    pointable: false,
  },
};

/** Ligne du catalogue pour un statut, `introuvable` par défaut. */
export function ligneControle(statut: string | undefined): LigneControle {
  return CATALOGUE_CONTROLE[statut ?? "introuvable"] ?? CATALOGUE_CONTROLE.introuvable;
}

/** Cours affichable au scanner : identifiant, nom, jours de créneaux (minuscules). */
export interface CoursDuControle {
  id: string;
  nom: string;
  jours: string[];
}

/**
 * Cours proposé à l'ouverture de l'appel : celui dont un créneau tombe aujourd'hui,
 * uniquement s'il est SEUL dans ce cas — sinon on ne devine pas, l'encadrant choisit.
 * Un club à cours unique n'a rien à choisir.
 */
export function coursParDefaut(cours: CoursDuControle[], jour: string): string | null {
  if (cours.length === 1) return cours[0].id;
  const dujour = cours.filter((c) => c.jours.includes(jour));
  return dujour.length === 1 ? dujour[0].id : null;
}
