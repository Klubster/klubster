import { cn } from "@/lib/cn";
import type { StatutAdhesion } from "@/types/db";

const MAP: Record<StatutAdhesion, { label: string; dot: string; text: string }> = {
  paye: { label: "Payé", dot: "bg-brand", text: "text-brand-dark" },
  en_attente: { label: "En attente", dot: "bg-warning", text: "text-warning" },
  en_retard: { label: "En retard", dot: "bg-danger", text: "text-danger" },
  rembourse: { label: "Remboursé", dot: "bg-ink-soft", text: "text-ink-soft" },
  annule: { label: "Annulé", dot: "bg-ink-soft", text: "text-ink-soft" },
};

export function StatutBadge({ statut }: { statut: StatutAdhesion }) {
  const s = MAP[statut];
  return (
    <span className="inline-flex items-center gap-1.5 border border-line bg-surface px-2.5 py-1 text-xs font-medium">
      <span className={cn("h-1.5 w-1.5 kb-dot", s.dot)} aria-hidden />
      <span className={s.text}>{s.label}</span>
    </span>
  );
}
