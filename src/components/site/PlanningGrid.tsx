import type { Cours } from "@/types/db";
import { planningParJour, capitalize } from "@/lib/format";

export function PlanningGrid({ cours, accent }: { cours: Cours[]; accent: string }) {
  const jours = planningParJour(cours);
  if (jours.length === 0) {
    return <p className="text-ink-soft">Le planning sera bientôt disponible.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {jours.map(({ jour, creneaux }) => (
        <div key={jour} className="rounded-card border border-line bg-surface p-5 shadow-sm">
          <h3 className="mb-3 font-mono text-sm uppercase tracking-wider" style={{ color: accent }}>
            {capitalize(jour)}
          </h3>
          <ul className="space-y-2.5">
            {creneaux.map((c, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink">
                  {c.coursNom}
                  {c.note ? <span className="text-ink-soft"> · {c.note}</span> : null}
                </span>
                <span className="tabular shrink-0 font-mono text-xs text-ink-soft">
                  {c.debut}–{c.fin}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
