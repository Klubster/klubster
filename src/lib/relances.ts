/**
 * Relances — LA décision, à un seul endroit.
 *
 * Relancer, c'est réclamer de l'argent à quelqu'un : la décision doit être la
 * même partout — cockpit, écran des relances, cron, contenu du message. Ce
 * module la prend, en s'appuyant sur la machine d'état financière
 * (`src/lib/finances.ts`) : il ne recalcule rien, il INTERPRÈTE.
 *
 * RÈGLES PRODUIT (04/08/2026) :
 *  - une ÉCHÉANCE FUTURE n'est pas un retard. Un échéancier Stripe en cours
 *    (mode en ligne, au moins un prélèvement arrivé, pas de rejet constaté)
 *    n'est JAMAIS relancé : Stripe prélèvera la suite ; seul un
 *    `invoice.payment_failed` (statut `en_retard`) ouvre la relance, et son
 *    message parle d'échéance rejetée, pas de « cotisation impayée » ;
 *  - un paiement AU CLUB (chèque, espèces, sans mode) est exigible dès
 *    l'inscription : le reste dû se relance dans les fenêtres du cron ;
 *  - litige, remboursé, annulé, liste d'attente, gratuit, soldé : jamais de
 *    relance financière — chacun pour sa raison, dite par l'état ;
 *  - le montant annoncé est LE reste à payer de la machine d'état (tolérance
 *    5 c comprise) — le même que la fiche et le cockpit.
 */

import { etatFinancier, type BilanFinancier } from "@/lib/finances";

export type MotifRelance = "impaye" | "echeance_rejetee";

export interface AdhesionRelance {
  montantCentimes: number;
  statut: string;
  modePaiement: string | null;
  litigeLe?: string | null;
  /** montants signés des règlements, avec leur mode (les remboursements en négatif) */
  reglements: Array<{ montantCentimes: number; mode: string | null }>;
}

export interface DecisionRelance {
  relancer: boolean;
  motif: MotifRelance | null;
  /** le montant à écrire dans le message — jamais un autre. */
  montantCentimes: number;
  /** pourquoi on NE relance PAS (affiché au club : une exclusion muette
   *  ressemble à un oubli). */
  exclusion:
    | null
    | "regle" | "rembourse" | "annule" | "liste_attente" | "gratuit"
    | "litige" | "echeancier_en_cours";
  bilan: BilanFinancier;
}

export function decisionRelanceFinanciere(a: AdhesionRelance): DecisionRelance {
  const bilan = etatFinancier({
    montantCentimes: a.montantCentimes,
    statut: a.statut,
    reglementsCentimes: a.reglements.map((r) => r.montantCentimes),
    litigeLe: a.litigeLe ?? null,
  });
  const non = (exclusion: DecisionRelance["exclusion"]): DecisionRelance => ({
    relancer: false, motif: null, montantCentimes: 0, exclusion, bilan,
  });

  switch (bilan.etat) {
    case "regle": return non("regle");
    case "rembourse": return non("rembourse");
    case "annule": return non("annule");
    case "liste_attente": return non("liste_attente");
    case "aucun_paiement_attendu": return non("gratuit");
    case "litige": return non("litige");
  }

  // Échéancier Stripe en cours : au moins un prélèvement en ligne est arrivé et
  // aucun rejet n'est constaté → la suite viendra d'elle-même. Le solde restant
  // n'est PAS exigible aujourd'hui.
  const prelevementArrive = a.reglements.some((r) => r.mode === "en_ligne" && r.montantCentimes > 0);
  if (a.modePaiement === "en_ligne" && prelevementArrive && a.statut !== "en_retard") {
    return non("echeancier_en_cours");
  }

  // Ici : partiellement réglé, en attente, ou retard constaté — et le reste est dû.
  if (bilan.resteCentimes <= 0) return non("regle");
  return {
    relancer: true,
    motif: a.statut === "en_retard" && a.modePaiement === "en_ligne" ? "echeance_rejetee" : "impaye",
    montantCentimes: bilan.resteCentimes,
    exclusion: null,
    bilan,
  };
}

/**
 * Le destinataire d'une relance : l'adhérent, ou son représentant légal quand
 * l'adhérent est mineur — LA MÊME règle que le ciblage des messages
 * (`src/lib/ciblage.ts`, lot K). La clé `infos` est identique ; un test
 * d'intégration vérifie que les deux modules ne divergent pas.
 */
export const CLE_EMAIL_RESPONSABLE = "Responsable légal — email";

export function destinataireRelance(a: {
  email: string | null;
  date_naissance: string | null;
  infos: Record<string, string> | null;
}): string | null {
  const mineur = (() => {
    if (!a.date_naissance) return false;
    const n = new Date(a.date_naissance);
    if (Number.isNaN(n.getTime())) return false;
    const seuil = new Date();
    seuil.setFullYear(seuil.getFullYear() - 18);
    return n > seuil;
  })();
  const brut = mineur ? a.infos?.[CLE_EMAIL_RESPONSABLE] || a.email : a.email;
  const propre = (brut ?? "").trim().toLowerCase();
  return propre || null;
}
