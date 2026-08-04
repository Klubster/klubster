/**
 * L'état financier d'une adhésion — UNE règle, partagée par tous les écrans.
 *
 * Avant ce module, cinq définitions de « réglé » coexistaient :
 *   - `statut = 'paye'` (cockpit, scanner, espace adhérent, export CSV) ;
 *   - `Σ règlements ≥ montant − 5` (RPC d'encaissement, tolérance 5 centimes) ;
 *   - `montant − Σ règlements > 0` (écran trésorerie, relances, cron — SANS tolérance) ;
 *   - `Σ règlements > 0` sinon repli sur le statut (reçu) ;
 *   - sommes d'organisation toutes saisons confondues (console admin).
 * Résultat mesuré : une adhésion à 210,00 € réglée 209,97 € était à la fois « payée »
 * et « impayée, reste 0,03 € » selon l'écran. Ce module tranche, et les écrans lisent.
 *
 * TOUS LES MONTANTS SONT DES ENTIERS EN CENTIMES. Jamais de flottant monétaire.
 */

/** Tolérance d'arrondi : en dessous de 5 centimes d'écart, on considère soldé.
 *  C'est la valeur historique des RPC (`enregistrer_reglement*`) — désormais unique. */
export const TOLERANCE_CENTIMES = 5;

export type EtatFinancier =
  | "aucun_paiement_attendu" // montant nul : rien à percevoir
  | "regle"                  // soldé (à la tolérance près)
  | "partiellement_regle"    // au moins un règlement, mais il reste dû
  | "paiement_attendu"       // rien reçu, échéance à venir ou paiement au club promis
  | "en_retard"              // rien ou pas assez reçu, ET le retard est constaté
  | "litige"                 // contestation bancaire ouverte (litige_le posé)
  | "rembourse"              // tout a été rendu
  | "annule"                 // adhésion annulée par le club
  | "liste_attente";         // aucune place : rien n'est dû tant qu'elle n'est pas donnée

export interface AdhesionFinanciere {
  montantCentimes: number;
  statut: string;                 // adhesions.statut
  reglementsCentimes: number[];   // montants signés (remboursements négatifs)
  litigeLe?: string | null;
}

export interface BilanFinancier {
  etat: EtatFinancier;
  /** Somme nette des règlements (remboursements déduits). */
  regleCentimes: number;
  /** Ce qui reste à percevoir — jamais négatif. */
  resteCentimes: number;
  /** Trop-perçu éventuel (net reçu au-delà du montant). */
  tropPercuCentimes: number;
}

/** Reste à payer, avec LA tolérance — la seule fonction que les écrans doivent sommer. */
export function resteAPayer(montantCentimes: number, regleCentimes: number): number {
  const reste = montantCentimes - regleCentimes;
  return reste <= TOLERANCE_CENTIMES ? 0 : reste;
}

/**
 * L'état financier d'une adhésion. Ordre de priorité, du plus bloquant au moins :
 * litige > annulé > remboursé > liste d'attente > gratuit > soldé > retard
 * constaté > partiellement réglé > paiement attendu.
 *
 * Le « retard » reste un CONSTAT porté par `adhesions.statut` (webhook d'échéance
 * rejetée, litige, ou cron après la dernière fenêtre de relance) — ce module ne
 * décide pas du calendrier, il dit ce que l'état signifie et ce qu'il reste à payer.
 */
export function etatFinancier(a: AdhesionFinanciere): BilanFinancier {
  const regle = a.reglementsCentimes.reduce((s, m) => s + m, 0);
  const reste = resteAPayer(a.montantCentimes, regle);
  const tropPercu = Math.max(regle - a.montantCentimes, 0);

  let etat: EtatFinancier;
  if (a.litigeLe) etat = "litige";
  else if (a.statut === "annule") etat = "annule";
  else if (a.statut === "rembourse" || (regle <= TOLERANCE_CENTIMES && a.reglementsCentimes.some((m) => m < 0)))
    etat = "rembourse";
  else if (a.statut === "liste_attente") etat = "liste_attente";
  else if (a.montantCentimes === 0) etat = "aucun_paiement_attendu";
  else if (reste === 0) etat = "regle";
  else if (a.statut === "en_retard") etat = "en_retard";
  else if (regle > 0) etat = "partiellement_regle";
  else etat = "paiement_attendu";

  // Un état où RIEN n'est dû doit annoncer zéro, pas un solde théorique.
  //
  // Découvert au lot P en mettant l'état et le montant côte à côte dans l'export :
  // un adhérent en liste d'attente sortait avec « Liste d'attente — rien n'est dû »
  // ET « Reste à payer : 90,00 € ». Le club aurait réclamé 90 € à quelqu'un qui n'a
  // même pas de place. Idem pour une adhésion annulée ou remboursée. Le libellé et
  // le nombre viennent de la même fonction : ils ne peuvent plus se contredire.
  const rienNEstDu = etat === "regle" || etat === "liste_attente" || etat === "annule" ||
                     etat === "rembourse" || etat === "aucun_paiement_attendu";

  return { etat, regleCentimes: regle, resteCentimes: rienNEstDu ? 0 : reste, tropPercuCentimes: tropPercu };
}

/** Vocabulaire bénévole — jamais le jargon Stripe. Partagé par tous les écrans. */
export const LIBELLES_FINANCIERS: Record<EtatFinancier, { long: string; court: string; ton: "ok" | "attention" | "refus" | "neutre" }> = {
  aucun_paiement_attendu: { long: "Aucun paiement attendu", court: "—", ton: "neutre" },
  regle: { long: "Paiement reçu", court: "Réglé", ton: "ok" },
  partiellement_regle: { long: "Paiement partiel — solde à percevoir", court: "Partiel", ton: "attention" },
  paiement_attendu: { long: "En attente de paiement", court: "En attente", ton: "attention" },
  en_retard: { long: "Paiement en retard", court: "En retard", ton: "refus" },
  litige: { long: "Paiement contesté — voir la banque", court: "Litige", ton: "refus" },
  rembourse: { long: "Remboursé", court: "Remboursé", ton: "neutre" },
  annule: { long: "Adhésion annulée", court: "Annulée", ton: "neutre" },
  liste_attente: { long: "Liste d'attente — rien n'est dû", court: "Liste d'attente", ton: "neutre" },
};

export function libelleFinancier(etat: EtatFinancier): string {
  return LIBELLES_FINANCIERS[etat].long;
}
