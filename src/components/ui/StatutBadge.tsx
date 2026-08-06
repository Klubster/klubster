import { cn } from "@/lib/cn";
import type { StatutAdhesion } from "@/types/db";
import type { StatutPiece } from "@/lib/pieces";

// Étendu au Lot S : le badge couvre maintenant les pièces en plus des adhésions, et
// expose un variant libre pour les statuts locaux (campagnes, contrôles…). Les couleurs
// passent par les tokens (success/warning/danger corrigés pour AA) — plus aucun hex ici.

type Teinte = "success" | "warning" | "danger" | "neutre";

const TEINTES: Record<Teinte, { dot: string; text: string }> = {
  success: { dot: "bg-success", text: "text-success" },
  warning: { dot: "bg-warning", text: "text-warning" },
  danger: { dot: "bg-danger", text: "text-danger" },
  neutre: { dot: "bg-ink-soft", text: "text-ink-soft" },
};

// Exportée en S6 : les écrans qui affichent le statut en texte simple (listes denses)
// consomment LA même table que le badge — plus jamais deux libellés pour un même statut.
export const ADHESION: Record<StatutAdhesion, { label: string; teinte: Teinte }> = {
  paye: { label: "Payé", teinte: "success" },
  en_attente: { label: "En attente", teinte: "warning" },
  en_retard: { label: "En retard", teinte: "danger" },
  rembourse: { label: "Remboursé", teinte: "neutre" },
  annule: { label: "Annulé", teinte: "neutre" },
  liste_attente: { label: "Liste d’attente", teinte: "neutre" },
};

const PIECE: Record<StatutPiece, { label: string; teinte: Teinte }> = {
  manquante: { label: "Manquante", teinte: "danger" },
  fournie: { label: "Fournie", teinte: "success" },
  par_email: { label: "Reçue par email", teinte: "success" },
};

/**
 * Libellé + classe texte du statut, pour les affichages hors badge. Tolérants :
 * certaines requêtes typent le statut `string | null` — un statut absent ou inconnu
 * s'affiche « En attente », exactement le repli des anciennes ternaires d'écran.
 */
function entree(statut: string | null | undefined) {
  return ADHESION[(statut ?? "en_attente") as StatutAdhesion] ?? ADHESION.en_attente;
}
export function libelleAdhesion(statut: string | null | undefined): string {
  return entree(statut).label;
}
export function classeTexteAdhesion(statut: string | null | undefined): string {
  return TEINTES[entree(statut).teinte].text;
}

function Badge({ label, teinte }: { label: string; teinte: Teinte }) {
  const t = TEINTES[teinte];
  return (
    <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-2.5 py-1 text-xs font-medium">
      <span className={cn("h-1.5 w-1.5 kb-dot", t.dot)} aria-hidden />
      <span className={t.text}>{label}</span>
    </span>
  );
}

export function StatutBadge({ statut }: { statut: StatutAdhesion }) {
  return <Badge {...ADHESION[statut]} />;
}

export function PieceBadge({ statut }: { statut: StatutPiece }) {
  return <Badge {...PIECE[statut]} />;
}

// Pour les statuts qui n'existent qu'à un endroit (campagne d'emails, contrôle terrain…) :
// même rendu, libellé et teinte au choix de l'écran — la sémantique reste centralisée ici.
export function BadgeLibre({ label, teinte = "neutre" }: { label: string; teinte?: Teinte }) {
  return <Badge label={label} teinte={teinte} />;
}
