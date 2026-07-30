import { ADHERENTS, CHIFFRES, ADHESION_EUROS, COURS, euros } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

export default function DemoInscriptions() {
  const incomplets = ADHERENTS.filter((a) => a.dossier !== "complet");

  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">INSCRIPTIONS ET DOSSIERS<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        {CHIFFRES.dossiersIncomplets} dossiers à compléter.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Le dossier se constitue au moment de l&apos;inscription. Ce qui manque se voit ici, et se
        relance en un clic.
      </p>

      <section className="mt-10">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CE QUI MANQUE<Cur /></p>
        <div className="mt-4 max-w-3xl border border-line">
          {incomplets.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0">
              <span className="flex-1 text-[14px]">
                {a.prenom} <span className="font-medium">{a.nom}</span>
                <span className="mono ml-3 text-[11px] text-ink-soft">{a.cours}</span>
              </span>
              <span className="mono text-[12px] font-bold" style={{ color: a.dossier === "piece" ? "#B23B3B" : "#B8860B" }}>
                {a.dossier === "piece" ? "✕ Certificat manquant" : "⚠ Questionnaire à signer"}
              </span>
              <Inerte variante="discret">RELANCER</Inerte>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Inerte variante="primaire">TOUT RELANCER</Inerte>
          <Inerte>VOIR LE FORMULAIRE</Inerte>
        </div>
        <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Une relance part au plus une fois tous les sept jours par adhérent — c&apos;est un
          garde-fou du produit, pas un réglage à surveiller.
        </p>
      </section>

      {/* CE QUE LE CLUB DEMANDE — l'atelier du formulaire, en lecture. */}
      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CE QUE VOUS DEMANDEZ À L&apos;INSCRIPTION<Cur /></p>
        <div className="mt-4 max-w-2xl border border-line">
          {[
            ["Prénom, nom, email", "Obligatoire"],
            ["Date de naissance", "Obligatoire"],
            ["Personne à prévenir", "Facultatif"],
            ["Questionnaire de santé", "Obligatoire"],
            ["Certificat médical", "Si compétition"],
            ["Autorisation parentale", "Si mineur"],
          ].map(([champ, etat]) => (
            <div key={champ} className="flex items-center justify-between gap-3 border-b border-line px-4 py-3 last:border-b-0">
              <span className="text-[13px]">{champ}</span>
              <span className="mono text-[10px] uppercase tracking-label text-ink-soft">{etat}</span>
            </div>
          ))}
        </div>
        <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Le détail des réponses du questionnaire de santé n&apos;est jamais conservé : seuls le
          résultat, la signature et la date le sont.
        </p>
      </section>

      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">TARIFS DE LA SAISON<Cur /></p>
        <div className="mt-4 max-w-2xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="text-[13px]">Adhésion à l&apos;association</span>
            <span className="mono text-[13px]">{euros(ADHESION_EUROS)}</span>
          </div>
          {COURS.map((c) => (
            <div key={c.id} className="flex items-center justify-between border-b border-line px-4 py-3 last:border-b-0">
              <span className="text-[13px]">{c.nom} — 1 séance par semaine</span>
              <span className="mono text-[13px]">{euros(c.tarifAnnuelEuros)}</span>
            </div>
          ))}
        </div>
        <p className="mono mt-3 text-[11px] text-ink-faint">
          Réglable en une fois ou jusqu&apos;à douze échéances, sans commission Klubster.
        </p>
      </section>
    </main>
  );
}
