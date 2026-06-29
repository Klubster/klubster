import type { Cours } from "@/types/db";
import { planningParJour, capitalize } from "@/lib/format";

export function PlanningGrid({ cours, accent }: { cours: Cours[]; accent: string }) {
  const jours = planningParJour(cours);
  if (jours.length === 0) {
    return <p className="text-ink-soft">Le planning sera bientôt disponible.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {jours.map(({ jour, creneaux }) => (
        <div key={jour} className="bg-paper px-5 py-6">
          <h3 className="mono text-[11px] uppercase tracking-label" style={{ color: accent }}>
            {capitalize(jour)}
          </h3>
          <ul className="mt-4 space-y-3">
            {creneaux.map((c, i) => (
              <li key={i} className="text-[13px]">
                <div className="text-ink">
                  {c.coursNom}
                  {c.note ? <span className="text-ink-soft"> · {c.note}</span> : null}
                </div>
                <div className="mono text-[11px] text-ink-soft">{c.debut}–{c.fin}</div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
