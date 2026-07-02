// Aperçu fidèle du vrai « Aujourd'hui_ » (données de démonstration, lexique et layout réels).
const NAV = ["AUJOURD’HUI", "INSCRIPTIONS", "PRÉSENCES", "PAIEMENTS", "MESSAGES", "ACTUALITÉ", "SITE"];

const POINTS: { ok?: boolean; texte: string }[] = [
  { ok: true, texte: "3 nouvelles inscriptions cette semaine" },
  { ok: true, texte: "Tous les paiements sont à jour" },
  { ok: true, texte: "Aucun dossier en attente" },
  { texte: "Ce soir : Boxe loisirs 18:30–20:00 · 18 inscrits" },
];

export default function CockpitPreview() {
  return (
    <div className="overflow-hidden border border-line bg-paper">
      {/* barre de fenêtre */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">k<span className="text-brand">_</span></span>
        <span className="mono text-[10px] uppercase tracking-label text-ink-faint">klubster.fr/mon-club/cockpit</span>
      </div>

      <div className="grid grid-cols-[128px_1fr] md:grid-cols-[168px_1fr]">
        {/* sidebar */}
        <nav className="bg-ink px-3 py-4 text-paper md:px-4">
          {NAV.map((item, i) => (
            <div key={item} className={`mono py-[6px] text-[11px] ${i === 0 ? "font-bold text-paper" : "text-paper/45"}`}>
              {String(i + 1).padStart(2, "0")} {item}
              {i === 0 ? <span className="text-brand">_</span> : null}
            </div>
          ))}
        </nav>

        {/* main — l'état du club, pas un tableau de bord */}
        <div className="p-4 md:p-6">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">
            BONSOIR, MATHIEU · MERCREDI 4 SEPTEMBRE<span className="text-brand">_</span>
          </div>
          <p className="mt-3 text-[22px] font-medium leading-tight tracking-[-0.01em] md:text-[26px]">
            Le club est prêt.
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">Tout est à jour pour le cours de ce soir.</p>

          <div className="mt-4 border border-line">
            <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">
              LE CLUB AUJOURD’HUI<span className="text-brand">_</span>
            </div>
            {POINTS.map((l) => (
              <div key={l.texte} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className={`mono text-[11px] ${l.ok ? "text-brand" : "text-ink-faint"}`}>{l.ok ? "✓" : "●"}</span>
                <span className="flex-1 text-[12px]">{l.texte}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
            {[
              ["0", "DOSSIER À TERMINER"],
              ["0", "COTISATION À RELANCER"],
              ["3", "INSCRIPTIONS · 7 JOURS"],
            ].map(([n, label]) => (
              <div key={label} className="bg-paper px-3 py-3">
                <div className="mono text-[16px] font-bold tracking-tight md:text-[18px]">{n}</div>
                <div className="mono mt-0.5 text-[8px] uppercase tracking-label text-ink-faint">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
