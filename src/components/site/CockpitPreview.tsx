// Aperçu produit du Cockpit (mock statique, fidèle à la DA). Sert de "preuve".
const NAV = ["Accueil", "Adhérents", "Licences", "Comptabilité", "Plannings", "Communications", "Documents", "Paramètres"];
const KPIS: [string, string, string][] = [
  ["ADHÉRENTS", "256", "+12 ce mois"],
  ["LICENCES", "198", "+8 ce mois"],
  ["PAIEMENTS", "12 450 €", "+1 350 €"],
];
const INSCRIPTIONS: [string, string][] = [
  ["Emma Dubois", "Boxe anglaise"],
  ["Léa Martin", "Natation"],
  ["Chloé Bernard", "Tennis"],
  ["Hugo Petit", "Judo"],
];
const AVENIR: [string, string][] = [
  ["Réunion bureau", "mar. 20 mai · 19:00"],
  ["Match à domicile", "sam. 25 mai · 14:00"],
  ["Fin des réinscriptions", "dim. 02 juin"],
];

export default function CockpitPreview() {
  return (
    <div className="overflow-hidden border border-line bg-paper">
      {/* barre de fenêtre */}
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">k<span className="text-brand">_</span></span>
        <span className="mono text-[10px] uppercase tracking-label text-ink-faint">klubster.fr/mon-club/cockpit</span>
      </div>

      <div className="grid grid-cols-[120px_1fr] md:grid-cols-[150px_1fr]">
        {/* sidebar */}
        <nav className="bg-ink px-3 py-4 text-paper md:px-4">
          {NAV.map((item, i) => (
            <div
              key={item}
              className={`mono py-[7px] text-[11px] ${i === 0 ? "font-bold text-paper" : "text-paper/55"}`}
            >
              {item}
              {i === 0 ? <span className="text-brand">_</span> : null}
            </div>
          ))}
        </nav>

        {/* main */}
        <div className="p-4 md:p-6">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">BONJOUR MATHIEU<span className="text-brand">_</span></div>
          <p className="mt-1 text-[13px] text-ink-soft">Voici l’activité de votre club.</p>

          <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
            {KPIS.map(([label, val, delta]) => (
              <div key={label} className="bg-paper px-3 py-3">
                <div className="mono text-[9px] uppercase tracking-label text-ink-faint">{label}</div>
                <div className="mono mt-1 text-[18px] font-bold tracking-tight md:text-[22px]">{val}</div>
                <div className="mono text-[9px] text-brand">{delta}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="border border-line">
              <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">Dernières inscriptions</div>
              {INSCRIPTIONS.map(([nom, disc]) => (
                <div key={nom} className="flex items-center justify-between border-b border-line px-3 py-2 last:border-b-0">
                  <span className="text-[12px]">{nom}</span>
                  <span className="mono text-[10px] text-ink-faint">{disc}</span>
                  <span className="mono text-[9px] text-brand">VALIDÉ</span>
                </div>
              ))}
            </div>
            <div className="border border-line">
              <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">À venir</div>
              {AVENIR.map(([t, d]) => (
                <div key={t} className="border-b border-line px-3 py-2 last:border-b-0">
                  <div className="text-[12px]">{t}</div>
                  <div className="mono text-[10px] text-ink-faint">{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
