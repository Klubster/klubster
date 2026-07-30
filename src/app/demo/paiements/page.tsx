import { ADHERENTS, CHIFFRES, euros } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

export default function DemoPaiements() {
  const enRetard = ADHERENTS.filter((a) => a.paiement === "retard" || a.paiement === "attente");
  const echeances = ADHERENTS.filter((a) => a.paiement === "echeances");

  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">COTISATIONS ET PAIEMENTS<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        {euros(CHIFFRES.encaisseEuros)} encaissés.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Carte, chèque ou espèces — tout arrive au même endroit. Klubster ne prend aucune
        commission : les cotisations vont directement sur le compte du club.
      </p>

      <div className="mt-8 grid max-w-3xl grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
        {[
          [euros(CHIFFRES.encaisseEuros), "ENCAISSÉ", false],
          [euros(CHIFFRES.resteDuEuros), "RESTE À ENCAISSER", true],
          [String(CHIFFRES.cotisationsEnRetard), "EN RETARD", true],
          [String(CHIFFRES.remisesAValider), "REMISES À VALIDER", false],
        ].map(([n, label, alerte]) => (
          <div key={label as string} className="bg-paper px-5 py-5">
            <div className={`mono text-[22px] leading-none tracking-tight ${alerte ? "text-warning" : "text-ink"}`}>{n as string}</div>
            <div className="mono mt-2 text-[10px] uppercase tracking-label text-ink-soft">{label as string}</div>
          </div>
        ))}
      </div>

      <section className="mt-12">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">À RELANCER<Cur /></p>
        <div className="mt-4 max-w-3xl border border-line">
          {enRetard.map((a) => (
            <div key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 last:border-b-0">
              <span className="flex-1 text-[14px]">
                {a.prenom} <span className="font-medium">{a.nom}</span>
                <span className="mono ml-3 text-[11px] text-ink-soft">{a.cours}</span>
              </span>
              <span className="mono text-[12px] font-bold text-danger">{euros(a.duEuros - a.regleEuros)} dus</span>
              <Inerte variante="discret">RELANCER</Inerte>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Inerte variante="primaire">TOUT RELANCER</Inerte>
          <Inerte>ENCAISSER UN CHÈQUE</Inerte>
          <Inerte>PRÉPARER UNE REMISE</Inerte>
        </div>
        <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Chaque relance porte le montant restant de la personne concernée — jamais un
          message générique envoyé à tout le monde.
        </p>
      </section>

      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENTS EN PLUSIEURS FOIS<Cur /></p>
        <div className="mt-4 max-w-3xl border border-line">
          {echeances.map((a) => {
            const part = Math.round((a.regleEuros / a.duEuros) * 100);
            return (
              <div key={a.id} className="border-b border-line px-4 py-3.5 last:border-b-0">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <span className="text-[14px]">
                    {a.prenom} <span className="font-medium">{a.nom}</span>
                  </span>
                  <span className="mono text-[12px] text-ink-soft">
                    {euros(a.regleEuros)} sur {euros(a.duEuros)}
                  </span>
                </div>
                <div className="mt-2 h-1 w-full bg-line" aria-hidden>
                  <div className="h-1 bg-brand" style={{ width: `${part}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mono mt-3 text-[11px] text-ink-faint">
          Jusqu&apos;à douze échéances. Les montants sont recalculés côté serveur, jamais
          d&apos;après ce que dit le navigateur.
        </p>
      </section>
    </main>
  );
}
