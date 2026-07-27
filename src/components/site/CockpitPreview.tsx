// Aperçu fidèle du vrai « Aujourd'hui_ » (données de démonstration, lexique et layout réels).
// Un cockpit ne sert pas à montrer que tout va bien : il montre d'abord ce qui demande une action.
const NAV = ["AUJOURD’HUI", "INSCRIPTIONS", "CONTRÔLE", "PAIEMENTS", "MESSAGES", "ACTUALITÉ", "SITE"];

const POINTS: { ok?: boolean; warn?: boolean; texte: string }[] = [
  { ok: true, texte: "3 nouvelles inscriptions cette semaine" },
  { ok: true, texte: "14 paiements reçus cette semaine" },
  { warn: true, texte: "2 dossiers à compléter" },
  { texte: "Ce soir : Boxe loisirs 18:30–20:00 · 18 inscrits" },
];

const TUILES: { n: string; label: string; warn?: boolean }[] = [
  { n: "2", label: "DOSSIERS À TERMINER", warn: true },
  { n: "0", label: "COTISATION À RELANCER" },
  { n: "3", label: "INSCRIPTIONS · 7 JOURS" },
];

export default function CockpitPreview() {
  return (
    <div className="overflow-hidden border border-line bg-paper">
      {/* barre de fenêtre */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">k<span className="text-brand">_</span></span>
        <span className="mono text-[10px] uppercase tracking-label text-ink-faint">klubster.fr/mon-club/cockpit</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] md:grid-cols-[168px_1fr]">
        {/* sidebar — masquée sur mobile pour laisser la scène respirer */}
        <nav className="hidden bg-ink px-3 py-4 text-paper sm:block md:px-4">
          {NAV.map((item, i) => (
            <div key={item} className={`mono py-[6px] text-[11px] ${i === 0 ? "font-bold text-paper" : "text-paper/45"}`}>
              {String(i + 1).padStart(2, "0")} {item}
              {i === 0 ? <span className="text-brand">_</span> : null}
            </div>
          ))}
        </nav>

        {/* main — l'état du club : d'abord ce qui demande une action */}
        <div className="p-4 md:p-6">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">
            BONSOIR, CLAIRE · MERCREDI 4 SEPTEMBRE<span className="text-brand">_</span>
          </div>
          <p className="mt-3 text-[22px] font-medium leading-tight tracking-[-0.01em] md:text-[26px]">
            Le club est presque prêt.
          </p>
          <p className="mt-1.5 text-[13px] text-ink-soft">Deux dossiers à compléter avant ce soir — le reste est à jour.</p>

          <div className="mt-4 border border-line">
            <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">
              LE CLUB AUJOURD’HUI<span className="text-brand">_</span>
            </div>
            {POINTS.map((l) => (
              <div key={l.texte} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className={`mono text-[11px] ${l.ok ? "text-brand" : l.warn ? "text-warning" : "text-ink-faint"}`}>{l.ok ? "✓" : l.warn ? "⚠" : "●"}</span>
                <span className="flex-1 text-[12px]">{l.texte}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
            {TUILES.map((t) => (
              <div key={t.label} className="bg-paper px-3 py-3">
                <div className={`mono text-[16px] font-bold tracking-tight md:text-[18px] ${t.warn ? "text-warning" : ""}`}>{t.n}</div>
                <div className="mono mt-0.5 text-[8px] uppercase tracking-label text-ink-faint">{t.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
