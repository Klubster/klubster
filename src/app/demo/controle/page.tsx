import { COURS, PRESENCES } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

const ETAPES: [string, string][] = [
  ["01", "L’adhérent affiche son QR code depuis son Espace adhérent"],
  ["02", "Un bénévole le scanne avec son propre téléphone"],
  ["03", "Klubster affiche ce qui est à jour et ce qui manque"],
];

export default function DemoControle() {
  const cours = COURS[0];

  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CONTRÔLE ET PRÉSENCES<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        L’état d’un adhérent en trois secondes.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Aucune carte plastique, aucun lecteur à acheter. Le QR code vit dans l&apos;Espace
        adhérent, sur le téléphone de la personne.
      </p>

      <div className="mt-8 max-w-2xl border-t border-line">
        {ETAPES.map(([n, t]) => (
          <div key={n} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-4">
            <span className="mono pt-0.5 text-[13px] text-brand-dark">{n}</span>
            <p className="text-[15px] font-medium tracking-[-0.01em]">{t}</p>
          </div>
        ))}
      </div>

      {/* L'écran du scanner, reconstruction fidèle : deux pastilles, pas une de plus. */}
      <section className="mt-12">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CE QUE LIT LE BÉNÉVOLE<Cur /></p>
        <div className="mt-4 grid max-w-3xl grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
          <div className="bg-paper p-5">
            <p className="text-[18px] font-medium leading-tight tracking-[-0.01em]">Marion Berthier</p>
            <p className="mt-1 text-[13px] text-ink-soft">{cours.nom} · {cours.horaire}</p>
            <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
              <div className="bg-paper px-4 py-3">
                <div className="mono text-[10px] uppercase tracking-label text-ink-soft">RÈGLEMENT</div>
                <div className="mono mt-2 text-[14px] font-bold text-brand-dark">✓ À jour</div>
              </div>
              <div className="bg-paper px-4 py-3">
                <div className="mono text-[10px] uppercase tracking-label text-ink-soft">DOSSIER</div>
                <div className="mono mt-2 text-[14px] font-bold text-brand-dark">✓ Complet</div>
              </div>
            </div>
          </div>
          <div className="bg-paper p-5">
            <p className="text-[18px] font-medium leading-tight tracking-[-0.01em]">Thomas Leclerc</p>
            <p className="mt-1 text-[13px] text-ink-soft">{cours.nom} · {cours.horaire}</p>
            <div className="mt-4 grid grid-cols-2 gap-px border border-line bg-line">
              <div className="bg-paper px-4 py-3">
                <div className="mono text-[10px] uppercase tracking-label text-ink-soft">RÈGLEMENT</div>
                <div className="mono mt-2 text-[14px] font-bold text-brand-dark">✓ À jour</div>
              </div>
              <div className="bg-paper px-4 py-3">
                <div className="mono text-[10px] uppercase tracking-label text-ink-soft">DOSSIER</div>
                <div className="mono mt-2 text-[14px] font-bold text-danger">✕ 1 pièce manquante</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <Inerte variante="primaire">OUVRIR LE SCANNER</Inerte>
        </div>
      </section>

      {/* LA FEUILLE D'APPEL — elle se remplit toute seule au fil des scans. */}
      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          {cours.jour.toUpperCase()} {cours.horaire} — {cours.nom.toUpperCase()}<Cur />
        </p>
        <div className="mt-4 max-w-2xl border border-line">
          {PRESENCES.map((p) => (
            <div key={p.nom} className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0">
              <span className="mono w-14 shrink-0 text-[11px] text-ink-soft">{p.heure}</span>
              <span className="flex-1 text-[14px]">
                {p.prenom} <span className="font-medium">{p.nom}</span>
              </span>
              <span className={`mono text-[11px] ${p.dossier === "ok" ? "text-brand-dark" : "text-danger"}`}>
                {p.dossier === "ok" ? "✓ en règle" : "✕ dossier"}
              </span>
            </div>
          ))}
        </div>
        <p className="mono mt-3 text-[11px] text-ink-faint">
          {PRESENCES.length} présents sur {cours.inscrits} inscrits — la feuille d&apos;appel se
          remplit au fil des scans, sans rien cocher.
        </p>
      </section>
    </main>
  );
}
