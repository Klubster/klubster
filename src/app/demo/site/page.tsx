import { CLUB, COURS, ACTUALITES, ADHESION_EUROS, euros } from "@/lib/demo/club";
import Inerte from "@/components/demo/Inerte";

function Cur() {
  return <span className="cur">_</span>;
}

/**
 * Le site public du club, tel qu'il s'affiche pour ses adhérents — reconstruit ici
 * plutôt que rendu par le vrai composant de vitrine, qui lit l'organisation en base.
 * C'est la contrepartie assumée de la règle « aucun Supabase sous /demo ».
 */
export default function DemoSite() {
  return (
    <main className="px-6 py-10 md:px-10 md:py-12">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE SITE DU CLUB<Cur /></p>
      <h1 className="mt-5 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[38px]">
        Votre site, créé en même temps que votre club.
      </h1>
      <p className="mt-3 max-w-prose text-lg text-ink-soft">
        Inclus dans l&apos;abonnement. Vos adhérents s&apos;y inscrivent, y trouvent les horaires
        et les tarifs. Vous pouvez y brancher votre propre nom de domaine.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Inerte variante="primaire">MODIFIER LE SITE</Inerte>
        <Inerte>CHANGER LES COULEURS</Inerte>
        <Inerte>BRANCHER MON DOMAINE</Inerte>
      </div>

      {/* APERÇU — la vitrine, dans les couleurs du club et non celles de Klubster. */}
      <section className="mt-10">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">APERÇU<Cur /></p>

        <div className="mt-4 max-w-3xl overflow-hidden border border-line bg-paper">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <span className="font-logo text-[13px] font-semibold">
              k<span className="text-brand">_</span>
            </span>
            <span className="mono truncate text-[10px] uppercase tracking-label text-ink-soft">
              klubster.fr/arbre-et-souffle
            </span>
          </div>

          {/* Hero de la vitrine */}
          <div className="px-6 py-10" style={{ background: CLUB.couleur }}>
            <p className="mono text-[10px] uppercase tracking-label text-white/75">
              {CLUB.ville.toUpperCase()} · ASSOCIATION LOI 1901
            </p>
            <p className="mt-3 text-[26px] font-medium leading-tight tracking-[-0.01em] text-white md:text-[32px]">
              {CLUB.nom}
            </p>
            <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/90">
              Six cours par semaine, du hatha traditionnel au yoga sur chaise. Tapis fournis,
              débutants bienvenus.
            </p>
            <span className="mono mt-5 inline-block bg-white px-5 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: CLUB.couleur }}>
              S’INSCRIRE →
            </span>
          </div>

          {/* Les cours */}
          <div className="px-6 py-7">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">LES COURS<Cur /></p>
            <div className="mt-4 border-t border-line">
              {COURS.map((c) => (
                <div key={c.id} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-line py-3">
                  <span className="mono w-20 shrink-0 text-[11px] uppercase tracking-label text-ink-soft">{c.jour}</span>
                  <span className="flex-1 text-[14px] font-medium">{c.nom}</span>
                  <span className="mono text-[11px] text-ink-soft">{c.horaire}</span>
                  <span className="mono text-[11px] text-ink-soft">{euros(c.tarifAnnuelEuros)}/an</span>
                </div>
              ))}
            </div>
            <p className="mono mt-3 text-[10px] text-ink-faint">
              Adhésion à l&apos;association : {euros(ADHESION_EUROS)} · Règlement jusqu&apos;à 12 fois
            </p>
          </div>

          {/* Actualités */}
          <div className="border-t border-line px-6 py-7">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">LA VIE DU CLUB<Cur /></p>
            <div className="mt-4 space-y-3">
              {ACTUALITES.map((a) => (
                <div key={a.titre}>
                  <p className="text-[14px] font-medium">{a.titre}</p>
                  <p className="mono mt-0.5 text-[10px] text-ink-soft">
                    {new Date(a.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mono mt-3 text-[11px] text-ink-faint">
          APERÇU DE L&apos;INTERFACE · CLUB FICTIF
        </p>
      </section>

      <section className="mt-14 max-w-3xl border border-line bg-bg-alt p-6">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ET SUR LE TÉLÉPHONE<Cur /></p>
        <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
          Vos adhérents installent l&apos;application de votre club sur leur écran d&apos;accueil —
          aux couleurs du club, avec votre logo. Ils y retrouvent leur carte de membre à QR
          code, leurs documents et l&apos;état de leur cotisation. Aucun magasin d&apos;applications
          à traverser.
        </p>
      </section>
    </main>
  );
}
