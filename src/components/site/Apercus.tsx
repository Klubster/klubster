// Aperçus fidèles des écrans réels de Klubster, recréés en HTML plutôt que capturés :
// nets sur tous les écrans, jamais périmés, et sans données d'adhérents réels.
// L'histoire de démonstration est celle de la page /fonctionnalites : l'USM Boxe
// Anglaise, saison 2026-2027, et Louise Martin, inscrite en boxe éducative.
// Les autres reconstructions (cockpit, fiche, paiements, contrôle, messages, site
// public) vivent en composants locaux dans src/app/(marketing)/fonctionnalites/page.tsx.

function Fenetre({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden border border-line bg-paper">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">k<span className="text-brand">_</span></span>
        <span className="mono truncate text-[10px] uppercase tracking-label text-ink-faint">{url}</span>
      </div>
      {children}
    </div>
  );
}

/* ——— Le formulaire : à gauche ce que le club règle, à droite ce que l'adhérent voit ——— */

const CHAMPS = [
  { label: "Prénom, nom, email", etat: "Obligatoire" },
  { label: "Date de naissance", etat: "Obligatoire" },
  { label: "Personne à prévenir", etat: "Facultatif" },
  { label: "Certificat médical", etat: "Pièce à fournir" },
  { label: "Autorisation parentale", etat: "Si mineur" },
];

export function ApercuFormulaire() {
  return (
    <Fenetre url="klubster.fr/usmboxe/cockpit/formulaire">
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="border-b border-line p-5 md:border-b-0 md:border-r">
          <p className="mono text-[10px] uppercase tracking-label text-ink-soft">
            CE QUE VOUS DEMANDEZ<span className="text-brand">_</span>
          </p>
          <div className="mt-4 border border-line">
            {CHAMPS.map((c) => (
              <div key={c.label} className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className="text-[13px]">{c.label}</span>
                <span className="mono whitespace-nowrap text-[9px] uppercase tracking-label text-ink-faint">{c.etat}</span>
              </div>
            ))}
          </div>
          <div className="mono mt-3 inline-block border border-line px-3 py-1.5 text-[10px] text-ink-soft">+ AJOUTER UN CHAMP</div>
        </div>

        <div className="bg-bg-alt p-5">
          <p className="mono text-[10px] uppercase tracking-label text-ink-soft">
            CE QUE VOIT L’ADHÉRENT<span className="text-brand">_</span>
          </p>
          <div className="mt-4 space-y-3">
            <div>
              <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Prénom</div>
              <div className="mt-1 border border-line bg-paper px-3 py-2 text-[13px]">Louise</div>
            </div>
            <div>
              <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Date de naissance</div>
              <div className="mt-1 border border-line bg-paper px-3 py-2 text-[13px] text-ink-faint">jj/mm/aaaa</div>
            </div>
            <div>
              <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Certificat médical</div>
              <div className="mt-1 flex items-center justify-between border border-dashed border-line bg-paper px-3 py-2">
                <span className="text-[13px] text-ink-faint">Déposer un fichier</span>
                <span className="mono text-[10px] text-ink-soft">PARCOURIR</span>
              </div>
            </div>
            <div className="mono mt-4 bg-ink px-4 py-2.5 text-center text-[11px] text-paper">CONTINUER →</div>
          </div>
        </div>
      </div>
    </Fenetre>
  );
}

/* ——— Le bordereau de remise de chèques : la trésorerie à la française ——— */

const CHEQUES_REMISE = [
  { nom: "Camille Fontaine", montant: "210,00 €" },
  { nom: "Sofia Benali", montant: "160,00 €" },
  { nom: "Jean-Luc Dupont", montant: "210,00 €" },
];

export function ApercuRemise() {
  return (
    <div className="mx-auto max-w-md border border-line bg-paper p-6 shadow-[6px_6px_0_0_var(--tw-shadow-color)] shadow-line">
      <div className="flex items-start justify-between border-b border-line pb-4">
        <div>
          <p className="text-[15px] font-medium">USM Boxe Anglaise</p>
          <p className="mono mt-0.5 text-[11px] text-ink-soft">Bordereau de remise de chèques</p>
        </div>
        <p className="mono text-[11px] text-ink-soft">Le 10/09/2026</p>
      </div>
      <table className="mt-4 w-full text-left text-[12px]">
        <tbody>
          {CHEQUES_REMISE.map((c, i) => (
            <tr key={c.nom} className="border-b border-line">
              <td className="py-2 pr-2 text-ink-soft">{i + 1}</td>
              <td className="py-2">{c.nom}</td>
              <td className="mono py-2 text-right">{c.montant}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="mono py-3 text-right text-[10px] uppercase tracking-label text-ink-soft">
              3 chèques · Total
            </td>
            <td className="mono py-3 text-right text-[15px] font-bold">580,00 €</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/* ——— Le site : les sections que le club range et publie lui-même ——— */

const SECTIONS = [
  { nom: "Le hero et l’actualité", note: "Photo, accroche" },
  { nom: "Les cours et les tarifs", note: "6 cours" },
  { nom: "La galerie", note: "8 photos" },
  { nom: "L’équipe", note: "4 personnes" },
  { nom: "La FAQ", note: "5 questions" },
];

export function ApercuSite() {
  return (
    <Fenetre url="klubster.fr/usmboxe/cockpit/site">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_150px]">
        <div className="border-b border-line p-4 md:border-b-0 md:border-r">
          <p className="mono text-[10px] uppercase tracking-label text-ink-soft">
            LES SECTIONS DE VOTRE SITE<span className="text-brand">_</span>
          </p>
          <div className="mt-3 border border-line">
            {SECTIONS.map((s) => (
              <div key={s.nom} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className="mono text-[11px] text-ink-faint">⋮⋮</span>
                <span className="flex-1 text-[12px]">{s.nom}</span>
                <span className="mono text-[9px] uppercase tracking-label text-ink-faint">{s.note}</span>
              </div>
            ))}
          </div>
          <div className="mono mt-3 inline-block border border-line px-3 py-1.5 text-[10px] text-ink-soft">+ AJOUTER UN CHAPITRE</div>
        </div>

        {/* miniature de la vitrine publiée */}
        <div className="flex flex-col bg-bg-alt p-3">
          <div className="mono text-[8px] uppercase tracking-label text-ink-soft">Aperçu</div>
          <div className="mt-2 flex-1 overflow-hidden border border-line bg-ink">
            <div className="h-10 bg-brand-dark" />
            <div className="space-y-1.5 p-2">
              <div className="h-1.5 w-3/4 bg-paper/80" />
              <div className="h-1.5 w-1/2 bg-paper/40" />
              <div className="mt-2 h-6 bg-paper/10" />
              <div className="h-1.5 w-2/3 bg-paper/40" />
            </div>
          </div>
          <div className="mono mt-2 text-center text-[8px] uppercase tracking-label text-brand">En ligne</div>
        </div>
      </div>
    </Fenetre>
  );
}
