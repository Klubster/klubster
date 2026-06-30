// Aperçu du vrai Cockpit (mock statique fidèle au back-office et à son lexique).
const NAV = ["AUJOURD’HUI", "ÉQUIPAGE", "TOUR DE CONTRÔLE", "TRÉSORERIE", "MESSAGERIE", "DOSSIERS", "JOURNAL", "ATELIER"];

const KPIS: [string, string][] = [
  ["EN ÉQUIPAGE", "304"],
  ["DOSSIERS EN ATTENTE", "12"],
  ["COTISATIONS EN RETARD", "5"],
  ["TRÉSORERIE · SAISON", "38 200 €"],
];

const CONTROLE: { idx: string; texte: string; tag?: string; ok?: boolean }[] = [
  { idx: "01", texte: "Cotisations en retard — 5 adhérents", tag: "RELANCER →" },
  { idx: "02", texte: "Dossiers en attente — 12 adhérents" },
  { idx: "03", texte: "Paiements à jour — 287 adhérents", ok: true },
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
        {/* sidebar — lexique cockpit */}
        <nav className="bg-ink px-3 py-4 text-paper md:px-4">
          {NAV.map((item, i) => (
            <div key={item} className={`mono py-[6px] text-[11px] ${i === 0 ? "font-bold text-paper" : "text-paper/45"}`}>
              {String(i + 1).padStart(2, "0")} {item}
              {i === 0 ? <span className="text-brand">_</span> : null}
            </div>
          ))}
        </nav>

        {/* main */}
        <div className="p-4 md:p-6">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">
            AUJOURD’HUI<span className="text-brand">_</span> · MISSION DU JOUR
          </div>
          <p className="mt-2 text-[15px]">
            Bonsoir, Mathieu. <span className="text-ink-soft">Il reste 2 dossiers à mettre à jour.</span>
          </p>

          <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
            {KPIS.map(([label, val]) => (
              <div key={label} className="bg-paper px-3 py-3">
                <div className="mono text-[9px] uppercase tracking-label text-ink-faint">{label}</div>
                <div className="mono mt-1 text-[18px] font-bold tracking-tight md:text-[20px]">{val}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 border border-line">
            <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">
              TOUR DE CONTRÔLE<span className="text-brand">_</span>
            </div>
            {CONTROLE.map((l) => (
              <div key={l.idx} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className="mono text-[10px] text-ink-faint">{l.idx}</span>
                <span className="flex-1 text-[12px]">{l.texte}</span>
                {l.tag ? <span className="mono border border-ink px-2 py-1 text-[9px]">{l.tag}</span> : null}
                {l.ok ? <span className="mono text-[10px] text-brand">✓ À JOUR</span> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
