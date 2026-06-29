import Link from "next/link";

function Cur() {
  return <span className="cur">_</span>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
      {children}
      <Cur />
    </p>
  );
}

const MODULES = [
  "Site du club",
  "Inscriptions",
  "Paiements",
  "Documents",
  "Présences",
  "Emails",
  "Trésorerie",
  "Journal du club",
];

const ETAPES = [
  "Créer son association.",
  "Choisir un modèle de sport.",
  "Ajouter les cours.",
  "Définir les tarifs.",
  "Connecter Stripe.",
  "Publier.",
];

const DEMAIN = [
  "Application mobile",
  "Pointage par QR Code",
  "Assistant IA",
  "Publications automatiques",
  "Gestion des licences",
  "Boutique",
];

const SEMAINE = [
  ["LUN", "Il manque un certificat."],
  ["MER", "Un parent demande le lien d'inscription."],
  ["VEN", "Il faut relancer trois cotisations."],
  ["W-E", "Vous refaites un tableau Excel."],
];

export default function Home() {
  return (
    <main className="text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">
            k<Cur />
          </Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-ink-soft md:flex">
            <a href="#cockpit" className="hover:text-ink">Le produit</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <Link href="/usmboxe" className="hover:text-ink">Exemple</Link>
          </nav>
          <Link href="/creer" className="mono border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper">
            CRÉER MON ASSOCIATION →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-32">
          <Label>MISSION 2026 — L&apos;OS DES ASSOCIATIONS</Label>
          <h1 className="mt-8 max-w-[16ch] text-[40px] font-medium leading-[1.04] tracking-[-0.015em] md:text-[58px]">
            Les clubs méritent mieux qu&apos;un tableur.
          </h1>
          <p className="mt-8 max-w-prose text-lg text-ink-soft">
            Votre association entièrement en ligne. Site, inscriptions, paiements, adhérents,
            emailing. En moins de vingt minutes.
          </p>
          <p className="mt-3 text-lg">Pensé par un président d&apos;association. Pour les présidents.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/creer" className="mono bg-ink px-6 py-3 text-[13px] text-paper hover:bg-ink/90">
              CRÉER MON ASSOCIATION →
            </Link>
            <Link href="/usmboxe" className="mono border border-ink px-6 py-3 text-[13px] hover:bg-bg-alt">
              VOIR UN CLUB EN LIGNE
            </Link>
          </div>
        </div>
      </section>

      {/* BANDEAU */}
      <div className="border-b border-line bg-bg-alt/40">
        <div className="mono mx-auto grid max-w-5xl grid-cols-1 divide-y divide-line text-[12px] text-ink-soft md:grid-cols-3 md:divide-x md:divide-y-0">
          <span className="px-6 py-4"><span className="text-brand">✓</span> Paiements reversés sur votre compte</span>
          <span className="px-6 py-4"><span className="text-brand">✓</span> 0 % de commission Klubster</span>
          <span className="px-6 py-4"><span className="text-brand">✓</span> Pensé pour les clubs sportifs</span>
        </div>
      </div>

      {/* SECTION 01 — POURQUOI */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label>SECTION 01 — POURQUOI</Label>
          <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">
            Vous n&apos;avez pas créé votre club pour gérer des papiers.
          </h2>
          <div className="mt-12 border-t border-line">
            {SEMAINE.map(([j, t]) => (
              <div key={j} className="flex items-baseline gap-6 border-b border-line py-4">
                <span className="mono w-16 shrink-0 text-[12px] tracking-wider text-ink-faint">{j}</span>
                <span className="text-lg">{t}</span>
              </div>
            ))}
          </div>
          <p className="mt-12 max-w-prose text-lg text-ink-soft">
            Klubster enlève toute cette partie. Pour que vous puissiez revenir là où votre club
            existe vraiment : <span className="text-ink">sur le terrain.</span>
          </p>
        </div>
      </section>

      {/* SECTION 02 — LE COCKPIT */}
      <section id="cockpit" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label>SECTION 02 — LE COCKPIT</Label>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">
            Tout ce qui compte.<br />Un seul endroit.
          </h2>
          <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
            {MODULES.map((m, i) => (
              <div key={m} className="bg-paper px-5 py-6">
                <span className="mono text-[10px] tracking-wider text-ink-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="mt-4 text-[15px] font-medium">{m}</div>
              </div>
            ))}
          </div>

          {/* Aperçu du Cockpit */}
          <div className="mt-10 border border-line bg-paper p-7">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AUJOURD&apos;HUI<Cur /></p>
            <p className="mt-4 max-w-prose text-lg">
              Bonsoir, Mathieu. Tout est prêt pour l&apos;entraînement de ce soir. Il reste seulement
              <span className="mono"> 2</span> certificats à récupérer.
            </p>
            <div className="mono mt-6 flex flex-wrap gap-x-10 gap-y-3 text-ink">
              <span><span className="text-[26px] font-bold">304</span> <span className="text-[11px] text-ink-soft">EN ÉQUIPAGE</span></span>
              <span><span className="text-[26px] font-bold">12</span> <span className="text-[11px] text-ink-soft">DOSSIERS</span></span>
              <span><span className="text-[26px] font-bold">38 200</span> <span className="text-[11px] text-ink-soft">€ ENCAISSÉS</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 03 — EN 20 MINUTES */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label>SECTION 03 — EN 20 MINUTES</Label>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Votre club est en ligne.</h2>
          <ol className="mt-12 max-w-2xl border-t border-line">
            {ETAPES.map((e, i) => (
              <li key={e} className="flex items-baseline gap-6 border-b border-line py-5">
                <span className="mono shrink-0 text-[13px] text-brand">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-lg">{e}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* SECTION 04 — POUR LES BÉNÉVOLES */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-between bg-ink p-10 text-paper md:p-12" style={{ minHeight: 360 }}>
            <span className="mono text-[10px] tracking-label text-ink-faint">FIG. 02<span className="text-brand">_</span></span>
            <div>
              <p className="text-2xl font-medium leading-snug md:text-[28px]">
                Conçu par un président.<br />Pour les présidents.
              </p>
              <p className="mono mt-6 text-[13px] leading-relaxed text-ink-faint">
                Pas par une agence. Pas par des consultants. Chaque écran existe parce qu&apos;un
                président de club en avait besoin.
              </p>
            </div>
          </div>
          <div className="flex flex-col justify-between border-t border-line p-10 md:border-l md:border-t-0 md:p-12">
            <span className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 04 — POUR LES BÉNÉVOLES<Cur /></span>
            <div className="mt-8 text-ink-soft">
              <p className="text-base leading-relaxed">
                Une image, ici : un gymnase vide, une paire de gants, une feuille d&apos;inscription
                posée sur une table.
              </p>
              <p className="mono mt-4 text-[11px] text-ink-faint">[ planche photo N&amp;B — emplacement réservé ]</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 05 — TARIFS */}
      <section id="tarifs" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label>SECTION 05 — TARIFS</Label>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">
            Un abonnement simple.<br />Sans commission.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            <Plan nom="STARTER" prix="9" cible="jusqu'à 100 adhérents" />
            <Plan nom="CLUB" prix="19" cible="101 à 300 adhérents" reco />
            <Plan nom="CLUB +" prix="29" cible="plus de 300 adhérents" />
          </div>
          <p className="mt-8 max-w-prose text-ink-soft">
            Vos paiements arrivent directement sur votre compte Stripe Connect. Klubster ne prend
            aucun pourcentage.
          </p>
        </div>
      </section>

      {/* SECTION 06 — DEMAIN */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label>SECTION 06 — DEMAIN</Label>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">
            Klubster évolue avec votre club.
          </h2>
          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 md:grid-cols-3">
            {DEMAIN.map((d) => (
              <div key={d} className="flex items-center justify-between bg-paper px-5 py-5">
                <span className="text-[15px]">{d}</span>
                <span className="mono text-[10px] tracking-wider text-ink-faint">BIENTÔT</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="mx-auto max-w-5xl px-6 py-14 md:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div>
              <span className="font-logo text-lg font-semibold">k<Cur /></span>
              <p className="mt-2 text-ink-soft">Le cockpit de votre association.</p>
            </div>
            <nav className="mono grid grid-cols-2 gap-x-12 gap-y-2 text-[12px] text-ink-soft sm:grid-cols-1">
              <Link href="/creer" className="hover:text-ink">Créer mon association</Link>
              <a href="#" className="hover:text-ink">Journal</a>
              <a href="#tarifs" className="hover:text-ink">Tarifs</a>
              <a href="#" className="hover:text-ink">Documentation</a>
              <a href="#" className="hover:text-ink">Contact</a>
            </nav>
          </div>
          <p className="mono mt-12 text-[11px] text-ink-faint">© {new Date().getFullYear()} KLUBSTER</p>
        </div>
      </footer>
    </main>
  );
}

function Plan({ nom, prix, cible, reco }: { nom: string; prix: string; cible: string; reco?: boolean }) {
  return (
    <div className="relative bg-paper px-7 py-8">
      {reco ? <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand" /> : null}
      <div className="mono text-[11px] tracking-label text-ink">
        {nom} {reco ? <span className="text-brand">●</span> : null}
      </div>
      <div className="mt-1 text-[13px] text-ink-soft">{cible}</div>
      <div className="mono mt-6 text-[34px] font-bold tracking-tight">
        {prix}<span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
      </div>
    </div>
  );
}
