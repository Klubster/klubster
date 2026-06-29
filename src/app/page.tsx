import Link from "next/link";

function Cur() {
  return <span className="cur">_</span>;
}

function Surtitre({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
      SECTION {n} — {children}
      <Cur />
    </p>
  );
}

const SAISON = [
  ["SEPTEMBRE", "Les inscriptions ouvrent. Le site est déjà prêt. Les paiements arrivent directement sur votre compte."],
  ["OCTOBRE", "Deux certificats manquent. Klubster vous le rappelle."],
  ["DÉCEMBRE", "Les attestations sont envoyées. Les parents sont informés."],
  ["JUIN", "La saison est terminée. Vous connaissez votre trésorerie. Les réinscriptions sont prêtes."],
];

const TOUT = ["Le site du club", "Les adhérents", "Les paiements", "Les documents", "Les emails", "La présence", "Le QR code (bientôt)"];

const PROBLEMES = [
  ["Les certificats", "Klubster sait lesquels manquent."],
  ["Les cotisations", "Les paiements arrivent directement sur votre compte. 0 % de commission."],
  ["Les groupes", "Un mail aux U15 ? Deux clics."],
  ["Les documents", "Chaque adhérent possède son dossier."],
];

const ETAPES = ["Créer le club.", "Choisir un modèle.", "Ajouter les cours.", "Connecter Stripe.", "Publier."];
const DEMAIN = ["Application mobile", "Pointage par QR Code", "Assistant IA", "Boutique du club", "Gestion des licences"];

export default function Home() {
  return (
    <main className="text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-ink-soft md:flex">
            <a href="#histoire" className="hover:text-ink">L’histoire</a>
            <a href="#saison" className="hover:text-ink">Une saison</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <Link href="/usmboxe" className="hover:text-ink">Un club</Link>
          </nav>
          <Link href="/creer" className="mono border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper">
            CRÉER MON ASSOCIATION →
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-32">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">L’OS DES ASSOCIATIONS<Cur /></p>
          <h1 className="mt-8 max-w-[16ch] text-[40px] font-medium leading-[1.04] tracking-[-0.015em] md:text-[58px]">
            Les clubs méritent mieux qu’un tableur.
          </h1>
          <p className="mt-8 max-w-prose text-lg text-ink-soft">
            Votre association entièrement en ligne. Site, inscriptions, paiements, adhérents.
            En moins de vingt minutes.
          </p>
          <p className="mt-3 text-lg">Pensé par un président d’association. Pour les présidents.</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/creer" className="mono bg-ink px-6 py-3 text-[13px] text-paper hover:bg-ink/90">CRÉER MON ASSOCIATION →</Link>
            <Link href="/usmboxe" className="mono border border-ink px-6 py-3 text-[13px] hover:bg-bg-alt">VOIR UN CLUB EN LIGNE</Link>
          </div>
        </div>
      </section>

      {/* 01 — POURQUOI */}
      <section id="histoire" className="border-b border-line">
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
          <div className="px-6 py-20 md:px-8 md:py-28">
            <Surtitre n="01">POURQUOI KLUBSTER EXISTE</Surtitre>
            <p className="mt-8 max-w-prose text-2xl font-medium leading-snug md:text-[26px]">
              Pendant des années, j’ai dirigé un club. Le problème n’était pas le sport. Le problème,
              c’était tout le reste.
            </p>
            <div className="mono mt-8 grid grid-cols-2 gap-y-2 text-[13px] text-ink-soft">
              <span>Les certificats.</span><span>Les cotisations.</span>
              <span>Les feuilles d’inscription.</span><span>Les mails.</span>
              <span>Les relances.</span><span>Les tableaux Excel.</span>
            </div>
            <p className="mt-8 max-w-prose text-lg">
              J’ai créé Klubster pour supprimer cette partie. Pas pour ajouter un outil de plus.
            </p>
          </div>
          <PhotoPlate fig="FIG. 01" legende="Le gymnase, un soir de semaine." src="/gymnase.jpg" />
        </div>
      </section>

      {/* 02 — UNE SAISON */}
      <section id="saison" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="02">UNE SAISON AVEC KLUBSTER</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Une année, racontée.</h2>
          <div className="mt-12 border-t border-line">
            {SAISON.map(([mois, texte]) => (
              <div key={mois} className="grid grid-cols-1 gap-2 border-b border-line py-6 md:grid-cols-[160px_1fr] md:gap-8">
                <div className="mono text-[13px] tracking-wider text-ink">{mois}<span className="text-brand">_</span></div>
                <p className="max-w-prose text-lg text-ink-soft">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — TOUT AU MÊME ENDROIT */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="03">TOUT EST AU MÊME ENDROIT</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Un seul endroit. Une seule vue.</h2>
          <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
            {TOUT.map((t, i) => (
              <div key={t} className="bg-paper px-5 py-6">
                <span className="mono text-[10px] tracking-wider text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <div className="mt-4 text-[15px] font-medium">{t}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 04 — LE COCKPIT */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="04">LE COCKPIT</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Votre club, chaque matin.</h2>
          <div className="mt-10 border border-line bg-paper p-7">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AUJOURD’HUI<Cur /></p>
            <p className="mt-4 max-w-prose text-lg">
              Bonsoir, Mathieu. Tout est prêt pour l’entraînement de ce soir. Il reste seulement
              <span className="mono"> 2</span> certificats à récupérer.
            </p>
            <div className="mono mt-6 flex flex-wrap gap-x-10 gap-y-3">
              <span><span className="text-[26px] font-bold">304</span> <span className="text-[11px] text-ink-soft">EN ÉQUIPAGE</span></span>
              <span><span className="text-[26px] font-bold">12</span> <span className="text-[11px] text-ink-soft">DOSSIERS</span></span>
              <span><span className="text-[26px] font-bold">38 200</span> <span className="text-[11px] text-ink-soft">€ ENCAISSÉS</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* 05 — PENSÉ POUR LES CLUBS */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="05">PENSÉ POUR LES CLUBS</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Quatre corvées en moins.</h2>
          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
            {PROBLEMES.map(([titre, texte]) => (
              <div key={titre} className="bg-paper px-7 py-8">
                <div className="text-[17px] font-medium">{titre}</div>
                <p className="mt-2 text-ink-soft">{texte}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 06 — ZÉRO COMMISSION */}
      <section className="border-b border-line bg-ink text-paper">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-28">
          <p className="mono text-[11px] uppercase tracking-label text-ink-faint">SECTION 06 — AUCUNE COMMISSION<span className="text-brand">_</span></p>
          <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-snug md:text-[34px]">
            Vos paiements ne passent jamais par nous.
          </h2>
          <p className="mt-8 max-w-prose text-lg text-paper/70">
            Ils arrivent directement sur votre compte Stripe. Vous restez propriétaire de votre
            argent. Klubster est simplement votre outil. Nous ne prenons <span className="text-paper">aucun pourcentage</span> —
            vous payez seulement votre abonnement.
          </p>
        </div>
      </section>

      {/* 07 — EN VINGT MINUTES */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="07">EN MOINS DE VINGT MINUTES</Surtitre>
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

      {/* 08 — CONÇU SUR LE TERRAIN */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
          <div className="flex flex-col justify-between bg-ink p-10 text-paper md:p-12" style={{ minHeight: 360 }}>
            <span className="mono text-[10px] tracking-label text-ink-faint">SECTION 08 — CONÇU SUR LE TERRAIN<span className="text-brand">_</span></span>
            <p className="text-2xl font-medium leading-snug md:text-[30px]">
              Conçu par un président.<br />Pour les présidents.<br />Point.
            </p>
          </div>
          <PhotoPlate fig="FIG. 02" legende="USM Boxe Montauban, avant l’entraînement." src="/boxe.jpg" border />
        </div>
      </section>

      {/* 09 — TARIFS */}
      <section id="tarifs" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="09">TARIFS</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Un abonnement simple. Sans commission.</h2>
          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            <Plan nom="STARTER" prix="9" cible="jusqu’à 100 adhérents" />
            <Plan nom="CLUB" prix="19" cible="101 à 300 adhérents" reco />
            <Plan nom="CLUB +" prix="29" cible="plus de 300 adhérents" />
          </div>
          <p className="mt-8 max-w-prose text-ink-soft">
            Vos paiements arrivent directement sur votre compte Stripe Connect. Klubster ne prend
            aucun pourcentage.
          </p>
        </div>
      </section>

      {/* 10 — DEMAIN */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Surtitre n="10">DEMAIN</Surtitre>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">On travaille déjà dessus.</h2>
          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 md:grid-cols-3">
            {DEMAIN.map((d) => (
              <div key={d} className="flex items-center justify-between bg-paper px-5 py-5">
                <span className="text-[15px]">{d}</span>
                <span className="mono text-[10px] tracking-wider text-ink-faint">EN COURS</span>
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
              <a href="#histoire" className="hover:text-ink">L’histoire</a>
              <a href="#tarifs" className="hover:text-ink">Tarifs</a>
              <Link href="/connexion" className="hover:text-ink">Espace président</Link>
            </nav>
          </div>
          <p className="mono mt-12 text-[11px] text-ink-faint">© {new Date().getFullYear()} KLUBSTER</p>
        </div>
      </footer>
    </main>
  );
}

function PhotoPlate({ fig, legende, src, border }: { fig: string; legende: string; src?: string; border?: boolean }) {
  const frame = "border-t border-line md:border-l md:border-t-0";
  if (src) {
    return (
      <div className={`relative ${frame}`} style={{ minHeight: 360 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={legende} className="absolute inset-0 h-full w-full object-cover" style={{ filter: "grayscale(1) contrast(1.04)" }} />
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink/85 px-5 py-3">
          <span className="mono text-[10px] uppercase tracking-label text-paper/60">{fig}</span>
          <span className="mono text-[11px] text-paper/90">{legende}</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex flex-col justify-between bg-bg-alt px-8 py-12 ${frame}`} style={{ minHeight: 320 }}>
      <span className="mono text-[10px] uppercase tracking-label text-ink-faint">{fig} — PHOTO N&amp;B</span>
      <div>
        <p className="text-ink-soft">{legende}</p>
        <p className="mono mt-3 text-[11px] text-ink-faint">[ emplacement réservé ]</p>
      </div>
    </div>
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
