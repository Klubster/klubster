import { MESSAGES, COURS, CHIFFRES } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

function dateCourte(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export default function DemoMessages() {
  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGES<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        Écrire à ses adhérents.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        À tout le club, à un cours, ou aux seuls dossiers incomplets. Chaque message part
        séparément — personne ne voit l&apos;adresse des autres.
      </p>

      {/* LE COMPOSEUR — visible, inerte. */}
      <section className="mt-10 max-w-3xl border border-line bg-paper p-6">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">NOUVEAU MESSAGE<Cur /></p>

        <label className="mt-5 block">
          <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Destinataires</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {["Tous les adhérents", ...COURS.map((c) => c.nom), "Dossiers incomplets", "Cotisations en retard"].map((d, i) => (
              <span
                key={d}
                className={`mono border px-3 py-2 text-[11px] ${i === 0 ? "border-ink bg-ink text-paper" : "border-line text-ink-soft"}`}
              >
                {d}
              </span>
            ))}
          </div>
        </label>

        <label className="mt-6 block">
          <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Objet</span>
          <input
            readOnly
            defaultValue="Stage de Yin Yoga — dimanche 23 novembre"
            className="mono mt-2 w-full border border-line bg-bg-alt px-4 py-3 text-[13px] text-ink-soft outline-none"
          />
        </label>

        <label className="mt-5 block">
          <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Message</span>
          <textarea
            readOnly
            rows={5}
            defaultValue={
              "Bonjour,\n\nNous organisons un stage de Yin Yoga le dimanche 23 novembre, de 10h à 13h, dans la grande salle. Tapis fournis, apportez une couverture.\n\nLes inscriptions se font auprès d’Hélène, dans la limite de seize places.\n\nÀ très vite,\nL’Arbre et le Souffle"
            }
            className="mt-2 w-full resize-none border border-line bg-bg-alt px-4 py-3 text-[13px] leading-relaxed text-ink-soft outline-none"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Inerte variante="primaire">ENVOYER À 186 ADHÉRENTS</Inerte>
          <span className="mono text-[11px] text-ink-faint">Inclure les responsables légaux</span>
        </div>
      </section>

      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">DÉJÀ ENVOYÉS<Cur /></p>
        <div className="mt-4 max-w-3xl border border-line">
          {MESSAGES.map((m) => (
            <div key={m.id} className="border-b border-line px-4 py-3.5 last:border-b-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex-1 text-[14px] font-medium">{m.objet}</span>
                <span className="mono text-[11px] text-ink-soft">{dateCourte(m.envoyeLe)}</span>
              </div>
              <p className="mono mt-1 text-[11px] text-ink-soft">
                {m.destinataires} · {m.nb} destinataire{m.nb > 1 ? "s" : ""} · {m.ouvertures} ouvert
                {m.ouvertures > 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-14 max-w-3xl border border-line bg-bg-alt p-6">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CE QUI PART TOUT SEUL<Cur /></p>
        <ul className="mt-4 space-y-2.5">
          {[
            "Relance des pièces manquantes, à 30, 60 et 90 jours",
            `Rappel des cotisations en retard — ${CHIFFRES.cotisationsEnRetard} concernées cette semaine`,
            "Récapitulatif hebdomadaire au bureau, le lundi matin",
          ].map((t) => (
            <li key={t} className="flex items-start gap-3 text-[14px]">
              <span className="mono text-brand">✓</span>
              <span className="text-ink-soft">{t}</span>
            </li>
          ))}
        </ul>
        <p className="mono mt-5 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Chaque motif n&apos;est envoyé qu&apos;une fois, et au plus une relance tous les sept
          jours par personne. Vous choisissez lesquels sont actifs.
        </p>
      </section>
    </main>
  );
}
