// Aperçus fidèles des écrans réels de Klubster, recréés en HTML plutôt que capturés :
// nets sur tous les écrans, jamais périmés, et sans données d'adhérents réels.

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

/* ——— I. Le formulaire : à gauche ce que le club règle, à droite ce que l'adhérent voit ——— */

const CHAMPS = [
  { label: "Prénom, nom, email", etat: "Obligatoire" },
  { label: "Date de naissance", etat: "Obligatoire" },
  { label: "Personne à prévenir", etat: "Facultatif" },
  { label: "Certificat médical", etat: "Pièce à fournir" },
  { label: "Autorisation parentale", etat: "Si mineur" },
];

export function ApercuFormulaire() {
  return (
    <Fenetre url="klubster.fr/mon-asso/cockpit/formulaire">
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
              <div className="mt-1 border border-line bg-paper px-3 py-2 text-[13px]">Camille</div>
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

/* ——— II. Le contrôle : ce que le bénévole lit après avoir scanné une carte ——— */

export function ApercuScan() {
  return (
    <Fenetre url="klubster.fr/mon-asso/cockpit/scanner">
      <div className="p-5">
        <div className="mono text-[10px] uppercase tracking-label text-ink-soft">
          CARTE SCANNÉE · 18:27<span className="text-brand">_</span>
        </div>

        <p className="mt-3 text-[22px] font-medium leading-tight tracking-[-0.01em]">Camille Fontaine</p>
        <p className="mt-1 text-[13px] text-ink-soft">Boxe loisirs · mercredi 18:30–20:00</p>

        <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
          <div className="bg-paper px-4 py-3">
            <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Cotisation</div>
            <div className="mono mt-1.5 text-[13px]" style={{ color: "#1E7A4F" }}>✓ À jour · 210 €</div>
          </div>
          <div className="bg-paper px-4 py-3">
            <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Dossier</div>
            <div className="mono mt-1.5 text-[13px]" style={{ color: "#8A6508" }}>● Certificat médical manquant</div>
          </div>
        </div>

        <div className="mono mt-5 inline-block bg-ink px-4 py-2.5 text-[11px] text-paper">MARQUER PRÉSENT</div>
        <p className="mono mt-4 text-[10px] text-ink-faint">Aucun nom à chercher. Aucun trésorier à appeler.</p>
      </div>
    </Fenetre>
  );
}

/* ——— III. La fiche : l'adhérent vu du cockpit ——— */

const PIECES = [
  { nom: "Certificat médical", ok: true },
  { nom: "Questionnaire de santé", ok: true },
  { nom: "Autorisation parentale", ok: false },
];

export function ApercuFiche() {
  return (
    <Fenetre url="klubster.fr/mon-asso/cockpit/adherents">
      <div className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[22px] font-medium leading-tight tracking-[-0.01em]">Théo Nguyên</p>
          <span className="mono text-[10px] uppercase tracking-label" style={{ color: "#8A6508" }}>En attente</span>
        </div>
        <p className="mt-1 text-[13px] text-ink-soft">theo.nguyen@exemple.fr · 06 12 34 56 78</p>

        <div className="mt-5 border border-line">
          <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">
            PIÈCES DU DOSSIER<span className="text-brand">_</span>
          </div>
          {PIECES.map((p) => (
            <div key={p.nom} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
              <span className="mono text-[11px]" style={{ color: p.ok ? "#1E7A4F" : "#8A6508" }}>{p.ok ? "✓" : "○"}</span>
              <span className="flex-1 text-[12px]">{p.nom}</span>
              <span className="mono text-[9px] uppercase tracking-label text-ink-faint">{p.ok ? "Reçu" : "Manquant"}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
          {[
            ["210 €", "COTISATION"],
            ["70 €", "DÉJÀ RÉGLÉ"],
            ["3", "ÉCHÉANCES"],
          ].map(([n, label]) => (
            <div key={label} className="bg-paper px-3 py-3">
              <div className="mono text-[15px] font-bold tracking-tight">{n}</div>
              <div className="mono mt-0.5 text-[8px] uppercase tracking-label text-ink-soft">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </Fenetre>
  );
}

/* ——— IV. Les messages : à qui, quoi, envoyé ——— */

const CIBLES = [
  { nom: "Tous les adhérents", n: 312, actif: true },
  { nom: "Boxe loisirs", n: 18 },
  { nom: "Amateurs", n: 24 },
  { nom: "Baby Boxe", n: 12 },
];

export function ApercuMessages() {
  return (
    <Fenetre url="klubster.fr/mon-asso/cockpit/messages">
      <div className="grid grid-cols-1 md:grid-cols-[190px_1fr]">
        <div className="border-b border-line p-4 md:border-b-0 md:border-r">
          <p className="mono text-[10px] uppercase tracking-label text-ink-soft">À QUI<span className="text-brand">_</span></p>
          <div className="mt-3 space-y-1">
            {CIBLES.map((c) => (
              <div
                key={c.nom}
                className={`flex items-center justify-between px-3 py-2 text-[12px] ${c.actif ? "bg-ink text-paper" : "text-ink-soft"}`}
              >
                <span>{c.nom}</span>
                <span className="mono text-[10px] opacity-70">{c.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4">
          <div className="mono text-[9px] uppercase tracking-label text-ink-soft">Objet</div>
          <div className="mt-1 border border-line bg-paper px-3 py-2 text-[13px]">Cours de mercredi annulé</div>
          <div className="mono mt-3 text-[9px] uppercase tracking-label text-ink-soft">Message</div>
          <div className="mt-1 border border-line bg-paper px-3 py-2 text-[12px] leading-relaxed text-ink-soft">
            Bonjour, le cours de mercredi est annulé (salle indisponible). Reprise vendredi, horaires habituels. Sportivement.
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="mono text-[10px] text-ink-faint">312 adhérents · en copie cachée</span>
            <span className="mono bg-ink px-4 py-2 text-[11px] text-paper">ENVOYER →</span>
          </div>
        </div>
      </div>
    </Fenetre>
  );
}

/* ——— V. Le site : les sections que le club range et publie lui-même ——— */

const SECTIONS = [
  { nom: "Le hero et l’actualité", note: "Photo, accroche" },
  { nom: "Les cours et les tarifs", note: "6 cours" },
  { nom: "La galerie", note: "8 photos" },
  { nom: "L’équipe", note: "4 personnes" },
  { nom: "La FAQ", note: "5 questions" },
];

export function ApercuSite() {
  return (
    <Fenetre url="klubster.fr/mon-asso">
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
