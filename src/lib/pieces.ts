/**
 * Statuts d'une pièce de dossier — source unique de vérité.
 *
 * Pourquoi ce fichier existe : trois vocabulaires coexistaient dans le code pour la
 * MÊME colonne `pieces_adherent.statut`, alors que la base n'en accepte que trois
 * valeurs (`manquante`, `fournie`, `par_email`) :
 *
 *   - la fiche adhérent écrivait « recue »   → violation de contrainte, l'erreur était
 *     journalisée puis avalée, et le bouton « marquer reçue » ne faisait rien ;
 *   - le cockpit comptait « attendue »       → le compteur de pièces manquantes
 *     affichait toujours zéro, y compris avec des dossiers réellement incomplets ;
 *   - la messagerie filtrait `≠ recue`       → aucune pièce n'était exclue, donc des
 *     adhérents à jour étaient comptés comme « dossier incomplet » et relançables.
 *
 * Toute lecture ou écriture de ce statut passe désormais par les constantes ci-dessous.
 * Ne pas réintroduire de littéral en dur : c'est précisément ce qui a divergé.
 */

/** Valeurs réellement admises par `pieces_adherent_statut_check`. */
export const STATUTS_PIECE = ["manquante", "fournie", "par_email"] as const;

export type StatutPiece = (typeof STATUTS_PIECE)[number];

/** La pièce est arrivée — déposée dans l'espace adhérent ou reçue par email. */
export const STATUTS_PIECE_FOURNIE = ["fournie", "par_email"] as const;

/** La pièce manque encore : c'est ce qui rend un dossier incomplet. */
export const STATUT_PIECE_MANQUANTE: StatutPiece = "manquante";

/** Statut par défaut d'une pièce que le club exige et n'a pas encore reçue. */
export const STATUT_PIECE_DEFAUT: StatutPiece = "manquante";

export function estFournie(statut: string | null | undefined): boolean {
  return (STATUTS_PIECE_FOURNIE as readonly string[]).includes(statut ?? "");
}

export function estManquante(statut: string | null | undefined): boolean {
  return !estFournie(statut);
}

/**
 * Bascule le statut depuis la fiche adhérent : reçue ⇄ manquante.
 * Une pièce arrivée par email reste marquée comme reçue tant qu'on ne la rebascule pas.
 */
export function basculerStatutPiece(statut: string | null | undefined): StatutPiece {
  return estFournie(statut) ? STATUT_PIECE_MANQUANTE : "fournie";
}

/** Libellé affiché au club. Court : il vit dans un tableau dense. */
export function libellePiece(statut: string | null | undefined): string {
  if (statut === "par_email") return "✓ Reçue par email";
  return estFournie(statut) ? "✓ Reçue" : "○ Manquante";
}
