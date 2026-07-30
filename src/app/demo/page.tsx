import Link from "next/link";
import { CLUB, CHIFFRES, COURS, euros } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

/** Une tuile de chiffre — le nombre d'abord, l'explication ensuite. */
function Tuile({ n, label, alerte }: { n: string; label: string; alerte?: boolean }) {
  return (
    <div className="bg-paper px-5 py-5">
      <div className={`mono text-[26px] leading-none tracking-tight ${alerte ? "text-warning" : "text-ink"}`}>{n}</div>
      <div className="mono mt-2 text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
    </div>
  );
}

export default function DemoAujourdhui() {
  const coursDuSoir = COURS[0];

  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        BONSOIR, {CLUB.president.split(" ")[0].toUpperCase()} · LUNDI 12 OCTOBRE<Cur />
      </p>

      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        Le club est presque prêt.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Quatorze dossiers à compléter et neuf cotisations à relancer — le reste est à jour.
      </p>

      {/* CE QUI DEMANDE UNE ACTION — jamais « tout va bien » en premier. */}
      <section className="mt-10">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE CLUB AUJOURD&apos;HUI<Cur /></p>
        <div className="mt-4 max-w-2xl border border-line">
          {[
            { etat: "warn", texte: `${CHIFFRES.dossiersIncomplets} dossiers à compléter`, lien: "/demo/inscriptions" },
            { etat: "warn", texte: `${CHIFFRES.cotisationsEnRetard} cotisations en retard — ${euros(CHIFFRES.resteDuEuros)}`, lien: "/demo/paiements" },
            { etat: "ok", texte: `${CHIFFRES.inscriptionsSemaine} nouvelles inscriptions cette semaine`, lien: "/demo/adherents" },
            { etat: "ok", texte: `${CHIFFRES.remisesAValider} remises en banque à valider`, lien: "/demo/paiements" },
            { etat: "neutre", texte: `Ce soir : ${coursDuSoir.nom} ${coursDuSoir.horaire} · ${coursDuSoir.inscrits} inscrits`, lien: "/demo/controle" },
          ].map((l) => (
            <Link
              key={l.texte}
              href={l.lien}
              className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-b-0 hover:bg-bg-alt"
            >
              <span className={`mono text-[12px] ${l.etat === "ok" ? "text-brand" : l.etat === "warn" ? "text-warning" : "text-ink-faint"}`}>
                {l.etat === "ok" ? "✓" : l.etat === "warn" ? "⚠" : "●"}
              </span>
              <span className="flex-1 text-[14px]">{l.texte}</span>
              <span className="mono text-[11px] text-ink-faint">→</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid max-w-3xl grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        <Tuile n={String(CHIFFRES.adherents)} label="ADHÉRENTS" />
        <Tuile n={String(CHIFFRES.dossiersIncomplets)} label="DOSSIERS À TERMINER" alerte />
        <Tuile n={String(CHIFFRES.cotisationsEnRetard)} label="COTISATIONS EN RETARD" alerte />
        <Tuile n={String(CHIFFRES.inscriptionsSemaine)} label="INSCRIPTIONS · 7 JOURS" />
      </div>

      {/* LES COURS */}
      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LES COURS DE LA SEMAINE<Cur /></p>
        <div className="mt-4 max-w-3xl border border-line">
          {COURS.map((c) => {
            const complet = c.inscrits >= c.places;
            return (
              <div key={c.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line px-4 py-3.5 last:border-b-0">
                <span className="mono w-20 shrink-0 text-[11px] uppercase tracking-label text-ink-soft">{c.jour}</span>
                <span className="flex-1 text-[14px] font-medium">{c.nom}</span>
                <span className="mono text-[11px] text-ink-soft">{c.horaire}</span>
                <span className={`mono text-[11px] ${complet ? "text-warning" : "text-ink-soft"}`}>
                  {c.inscrits}/{c.places}
                  {complet ? " · complet" : ""}
                </span>
              </div>
            );
          })}
        </div>
        <p className="mono mt-3 text-[11px] text-ink-faint">
          Un cours complet bascule automatiquement les nouvelles inscriptions en liste d&apos;attente.
        </p>
      </section>

      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ACTIONS RAPIDES<Cur /></p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Inerte variante="primaire">RELANCER LES DOSSIERS</Inerte>
          <Inerte>ENCAISSER UNE COTISATION</Inerte>
          <Inerte>ENVOYER UN MESSAGE</Inerte>
          <Inerte>AJOUTER UN COURS</Inerte>
        </div>
        <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Les boutons sont volontairement présents : ils montrent ce que Klubster permet.
          Dans cette démonstration, ils n&apos;écrivent rien.
        </p>
      </section>
    </main>
  );
}
