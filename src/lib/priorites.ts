/**
 * Ce qui mérite l'attention du président, classé — et rien d'autre.
 *
 * Le cockpit affichait sept indicateurs sur le même plan visuel : un chiffre neutre
 * (« 24 adhérents ») avait le même poids qu'une urgence (« 2 cotisations en retard »),
 * et trois cartes d'action n'apparaissaient qu'aux rôles financiers — un secrétaire
 * ouvrait donc un cockpit sans une seule action, alors que les dossiers incomplets sont
 * précisément son travail.
 *
 * Trois niveaux, dans cet ordre, et jamais plus :
 *   - `traiter`   : ça bloque quelqu'un aujourd'hui. Un geste est attendu.
 *   - `surveiller`: ça n'est pas urgent, mais ça le deviendra si on l'ignore.
 *   - `info`      : l'état du club. Aucune action attendue.
 *
 * Chaque entrée porte le lien vers l'écran DÉJÀ FILTRÉ, et la permission qui la rend
 * visible : proposer une porte fermée revient à mentir sur ce qu'on offre.
 */

import type { Action } from "@/lib/roles";

export type NiveauPriorite = "traiter" | "surveiller" | "info";

export interface Priorite {
  /** Identifiant stable — sert aussi de clé de rendu et de repère dans les tests. */
  cle: string;
  niveau: NiveauPriorite;
  /** Nombre mis en avant. `null` quand l'entrée n'est pas un compte (ex. cours du soir). */
  nombre: number | null;
  /** Phrase lue par le président. Accordée au singulier ou au pluriel par l'appelant. */
  texte: string;
  /** Écran cible, déjà filtré quand c'est possible. */
  href: string;
  /** Libellé du geste. Vide quand l'entrée est purement informative. */
  action: string;
  /** Permission exigée pour voir cette entrée. `null` = visible par tous les rôles du club. */
  permission: Action | null;
}

export interface EntreesPriorites {
  slug: string;
  /** Adhésions dont le règlement n'est pas soldé. */
  enAttente: number;
  /** Adhésions dont le paiement a dépassé l'échéance. */
  enRetard: number;
  /** Adhérents dont au moins une pièce manque (pas le nombre de pièces). */
  dossiersIncomplets: number;
  /** Inscriptions reçues sur les sept derniers jours. */
  nouvelles7j: number;
  /** Litiges bancaires ouverts — un rejet de carte bloque l'argent, il passe devant. */
  litiges: number;
  /** Cours ayant atteint leur capacité. */
  coursComplets: string[];
  /** Cours à une ou deux places de la capacité. */
  coursPresqueComplets: string[];
  /** Effectif total du club. */
  adherents: number;
  /** Cours ouverts à l'inscription. */
  coursOuverts: number;
}

const pluriel = (n: number, singulier: string, plur?: string) =>
  n > 1 ? (plur ?? `${singulier}s`) : singulier;

/**
 * Construit la liste ordonnée. Une entrée dont le nombre est zéro n'est PAS produite :
 * un cockpit calme doit être visiblement calme, pas une colonne de zéros à interpréter.
 */
export function calculerPriorites(e: EntreesPriorites): Priorite[] {
  const base = `/${e.slug}/cockpit`;
  const p: Priorite[] = [];

  /* ——— À TRAITER MAINTENANT ——— */

  // Un litige bancaire a un délai de réponse imposé par la banque : il passe devant tout.
  if (e.litiges > 0) {
    p.push({
      cle: "litiges",
      niveau: "traiter",
      nombre: e.litiges,
      texte: `${pluriel(e.litiges, "paiement")} contesté${e.litiges > 1 ? "s" : ""} par la banque`,
      href: `${base}/paiements`,
      action: "OUVRIR",
      permission: "paiements",
    });
  }

  if (e.enRetard > 0) {
    p.push({
      cle: "retards",
      niveau: "traiter",
      nombre: e.enRetard,
      texte: `${pluriel(e.enRetard, "cotisation")} en retard`,
      href: `${base}/adherents?statut=en_retard`,
      action: "VOIR LES DOSSIERS",
      permission: "paiements",
    });
  }

  // Le dossier incomplet est le travail du secrétaire autant que du président : il ne
  // dépend pas de la permission « paiements ».
  if (e.dossiersIncomplets > 0) {
    p.push({
      cle: "dossiers-incomplets",
      niveau: "traiter",
      nombre: e.dossiersIncomplets,
      texte: `${pluriel(e.dossiersIncomplets, "dossier")} incomplet${e.dossiersIncomplets > 1 ? "s" : ""} — au moins une pièce manque`,
      href: `${base}/adherents?dossier=incomplet`,
      action: "VOIR LES DOSSIERS",
      permission: "adherents_ecriture",
    });
  }

  if (e.nouvelles7j > 0) {
    p.push({
      cle: "nouvelles-inscriptions",
      niveau: "traiter",
      nombre: e.nouvelles7j,
      texte: `${pluriel(e.nouvelles7j, "nouvelle inscription", "nouvelles inscriptions")} cette semaine`,
      href: `${base}/adherents?recentes=7`,
      action: "VÉRIFIER",
      permission: "adherents_ecriture",
    });
  }

  /* ——— À SURVEILLER ——— */

  if (e.enAttente > 0) {
    p.push({
      cle: "en-attente",
      niveau: "surveiller",
      nombre: e.enAttente,
      texte: `${pluriel(e.enAttente, "règlement")} attendu${e.enAttente > 1 ? "s" : ""} (chèque, espèces, virement)`,
      href: `${base}/adherents?statut=en_attente`,
      action: "VOIR",
      permission: "paiements",
    });
  }

  if (e.coursComplets.length > 0) {
    p.push({
      cle: "cours-complets",
      niveau: "surveiller",
      nombre: e.coursComplets.length,
      texte: `${pluriel(e.coursComplets.length, "cours complet", "cours complets")} : ${e.coursComplets.join(" · ")}`,
      href: `${base}/cours`,
      action: "VOIR LES COURS",
      permission: "adherents_ecriture",
    });
  }

  if (e.coursPresqueComplets.length > 0) {
    p.push({
      cle: "cours-presque-complets",
      niveau: "surveiller",
      nombre: e.coursPresqueComplets.length,
      texte: `bientôt complet : ${e.coursPresqueComplets.join(" · ")}`,
      href: `${base}/cours`,
      action: "VOIR LES COURS",
      permission: "adherents_ecriture",
    });
  }

  /* ——— INFORMATIONS ——— */

  p.push({
    cle: "effectif",
    niveau: "info",
    nombre: e.adherents,
    texte: `${pluriel(e.adherents, "adhérent")} au club`,
    href: `${base}/adherents`,
    action: "",
    permission: null,
  });

  if (e.coursOuverts > 0) {
    p.push({
      cle: "cours-ouverts",
      niveau: "info",
      nombre: e.coursOuverts,
      // « cours » est invariable : le pluriel automatique donnait « 2 courss ouverts ».
      texte: `cours ${pluriel(e.coursOuverts, "ouvert")}`,
      href: `${base}/cours`,
      action: "",
      permission: null,
    });
  }

  return p;
}

/** Ne garde que ce que ce rôle a le droit de voir. */
export function filtrerParRole(
  priorites: Priorite[],
  aLaPermission: (p: Action) => boolean
): Priorite[] {
  return priorites.filter((x) => x.permission === null || aLaPermission(x.permission));
}

/**
 * Phrase d'accueil. Ne compte QUE le niveau « à traiter » : additionner les trois niveaux
 * annonçait « 14 choses méritent votre attention » à un club parfaitement à jour dont le
 * seul tort était d'avoir 12 adhérents.
 */
export function resumeAttention(priorites: Priorite[]): { titre: string; urgent: number } {
  const urgent = priorites.filter((p) => p.niveau === "traiter").length;
  if (urgent === 0) return { titre: "Le club est à jour.", urgent: 0 };
  return {
    titre: `${urgent} ${pluriel(urgent, "chose")} à traiter.`,
    urgent,
  };
}
