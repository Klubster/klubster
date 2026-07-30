import { ADHERENTS, CHIFFRES, COURS, euros } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

const LIBELLE_DOSSIER = {
  complet: { texte: "Complet", couleur: "text-brand-dark" },
  piece: { texte: "Pièce manquante", couleur: "text-danger" },
  sante: { texte: "Questionnaire à signer", couleur: "text-warning" },
} as const;

const LIBELLE_PAIEMENT = {
  paye: { texte: "À jour", couleur: "text-brand-dark" },
  echeances: { texte: "Échéances", couleur: "text-ink-soft" },
  retard: { texte: "En retard", couleur: "text-danger" },
  attente: { texte: "En attente", couleur: "text-warning" },
} as const;

export default function DemoAdherents() {
  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ADHÉRENTS<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        {CHIFFRES.adherents} adhérents.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Chercher quelqu&apos;un, ouvrir sa fiche, voir où en est son dossier et sa cotisation.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          type="search"
          readOnly
          placeholder="Chercher un nom, un email…"
          aria-label="Recherche (désactivée dans la démonstration)"
          className="mono w-full max-w-sm border border-line bg-bg-alt px-4 py-3 text-[13px] text-ink-soft outline-none"
        />
        <Inerte>FILTRER</Inerte>
        <Inerte>EXPORTER</Inerte>
        <Inerte variante="primaire">AJOUTER</Inerte>
      </div>

      <div className="mt-8 overflow-x-auto border border-line">
        <table className="w-full min-w-[46rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-bg-alt">
              {["Nom", "Cours", "Âge", "Dossier", "Cotisation", "Réglé"].map((t) => (
                <th key={t} className="mono px-4 py-3 text-[10px] uppercase tracking-label text-ink-soft">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ADHERENTS.map((a) => {
              const d = LIBELLE_DOSSIER[a.dossier];
              const p = LIBELLE_PAIEMENT[a.paiement];
              return (
                <tr key={a.id} className="border-b border-line last:border-b-0 hover:bg-bg-alt">
                  <td className="px-4 py-3 text-[14px]">
                    {a.prenom} <span className="font-medium">{a.nom}</span>
                  </td>
                  <td className="px-4 py-3 text-[13px] text-ink-soft">{a.cours}</td>
                  <td className="mono px-4 py-3 text-[12px] text-ink-soft">{a.age}</td>
                  <td className={`mono px-4 py-3 text-[12px] ${d.couleur}`}>{d.texte}</td>
                  <td className={`mono px-4 py-3 text-[12px] ${p.couleur}`}>{p.texte}</td>
                  <td className="mono px-4 py-3 text-[12px] text-ink-soft">
                    {euros(a.regleEuros)}
                    <span className="text-ink-faint"> / {euros(a.duEuros)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mono mt-4 text-[11px] leading-relaxed text-ink-faint">
        {ADHERENTS.length} fiches affichées sur {CHIFFRES.adherents} — la démonstration en
        présente un échantillon. Les {COURS.length} cours du club sont tous représentés.
      </p>
    </main>
  );
}
