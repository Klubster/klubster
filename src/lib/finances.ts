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

/* ————————————————————————————————————————————————————————————————
   PAIEMENT PARTAGÉ ENTRE PLUSIEURS ADHÉSIONS (inscription multi-cours)
   ————————————————————————————————————————————————————————————————

   Depuis le 26/08/2026, une inscription à plusieurs cours produit UN paiement
   Stripe pour PLUSIEURS adhésions. Deux conséquences, et un défaut réel corrigé
   le jour même (revue externe) :

   1. À l'encaissement, l'argent reçu doit être RÉPARTI entre les adhésions.
   2. Au remboursement, l'hypothèse « un paiement = une adhésion » ne tient plus.
      Le code envoyait à Stripe un remboursement SANS montant quand le bureau
      laissait le champ vide — or, sans montant, Stripe rend TOUT le solde du
      paiement, donc l'argent des AUTRES cours, et l'écriture (négative) tombait
      en entier sur la seule adhésion visée. Concrètement : danse 200 € + jazz
      300 €, « remboursement total » depuis la fiche danse → 500 € rendus et
      −500 € imputés à la danse. Un montant est désormais TOUJOURS envoyé, borné
      à ce que CETTE adhésion a réellement encaissé en ligne.

   Ces trois fonctions sont pures et testées par leur comportement (et non par
   le texte de leur source) : c'est ici que vit l'arithmétique de l'argent. */

/**
 * Ce qu'une adhésion peut encore se voir rembourser EN LIGNE : ce qu'elle a
 * encaissé par carte, moins ce qui lui a déjà été rendu.
 *
 * Les règlements espèces/chèque/virement sont exclus : Stripe ne peut pas rendre
 * un chèque. Les remboursements sont stockés en négatif, ils se soustraient donc
 * naturellement. Jamais négatif : un trop-remboursé (rendu depuis le tableau de
 * bord Stripe, par exemple) ne devient pas un droit à rembourser encore.
 */
export function remboursableEnLigne(reglements: Array<{ montantCentimes: number; mode: string | null }>): number {
  const net = reglements
    .filter((r) => r.mode === "en_ligne" || r.mode === "remboursement")
    .reduce((s, r) => s + r.montantCentimes, 0);
  return Math.max(net, 0);
}

/**
 * Répartit un montant entre plusieurs adhésions, au prorata de leurs parts.
 *
 * INVARIANT : la somme des parts rendues égale EXACTEMENT `montantCentimes`.
 * Le reliquat d'arrondi va à la dernière part — sinon un club encaisserait un
 * ou deux centimes de moins que ce que l'adhérent a payé. Une part peut valoir
 * zéro (cours gratuit dans le lot) ; aucune n'est jamais négative.
 *
 * Sert au paiement (webhook `checkout.session.completed`) ET au remboursement
 * non ciblé (`charge.refunded` sans métadonnée) : une seule arithmétique.
 */
export function repartirProrata(
  parts: Array<{ id: string; montantCentimes: number }>,
  montantCentimes: number
): Array<{ id: string; partCentimes: number }> {
  const total = parts.reduce((s, p) => s + p.montantCentimes, 0);
  if (parts.length === 0 || total <= 0) return [];
  let distribue = 0;
  return parts.map((p, i) => {
    const part =
      i === parts.length - 1
        ? montantCentimes - distribue
        : Math.round((montantCentimes * p.montantCentimes) / total);
    distribue += part;
    return { id: p.id, partCentimes: part };
  });
}

/**
 * Lit la répartition portée par les métadonnées Stripe (`id:centimes;id:centimes`).
 *
 * La MOINDRE anomalie — identifiant mal formé, montant non entier ou négatif —
 * invalide tout le lot : on retombe alors sur le chemin mono-adhésion, qui écrit
 * au moins le paiement quelque part plutôt que de ne rien écrire du tout.
 */
export function lireRepartition(brut: string | undefined | null): Array<{ id: string; montantCentimes: number }> | null {
  if (!brut) return null;
  const parts: Array<{ id: string; montantCentimes: number }> = [];
  for (const morceau of brut.split(";")) {
    const [id, montant] = morceau.split(":");
    const n = Number(montant);
    if (!/^[0-9a-f-]{36}$/i.test(id ?? "") || !Number.isInteger(n) || n < 0) return null;
    parts.push({ id, montantCentimes: n });
  }
  if (parts.length === 0 || parts.reduce((s, p) => s + p.montantCentimes, 0) <= 0) return null;
  return parts;
}

/** Écrit la répartition pour les métadonnées Stripe. `null` si elle ne tient pas
 *  dans la limite de 500 caractères par valeur — l'appelant retombe alors sur le
 *  chemin mono plutôt que d'envoyer une valeur tronquée, donc fausse. */
export function ecrireRepartition(parts: Array<{ id: string; montantCentimes: number }>): string | null {
  if (parts.length < 2) return null;
  const brut = parts.map((p) => `${p.id}:${p.montantCentimes}`).join(";");
  return brut.length <= 500 ? brut : null;
}
