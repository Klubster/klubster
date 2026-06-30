import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import EditorialGallery from "@/components/site/EditorialGallery";
import CockpitPreview from "@/components/site/CockpitPreview";

function Cur() {
  return <span className="cur">_</span>;
}

function Surtitre({ n, children, light }: { n: string; children: React.ReactNode; light?: boolean }) {
  return (
    <p className={`mono text-[11px] uppercase tracking-label ${light ? "text-paper/60" : "text-ink-soft"}`}>
      SECTION {n} — {children}
      <Cur />
    </p>
  );
}

// Citation éditoriale : 2-3 lignes max, beaucoup d'air, glissement discret.
function Citation({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-3xl px-6 py-28 text-center md:px-8 md:py-40">
        <Reveal kind="quote">
          <p className="text-[26px] font-medium italic leading-snug tracking-[-0.01em] md:text-[34px]">{children}</p>
          <div className="mx-auto mt-8 h-px w-10 bg-brand" />
        </Reveal>
      </div>
    </section>
  );
}

const DISCIPLINES: [string, string][] = [
  ["combat", "Sports de combat"],
  ["arts", "Arts martiaux"],
  ["nat", "Natation"],
  ["tennis", "Tennis"],
  ["collectif", "Sports collectifs"],
  ["danse", "Danse"],
  ["gym", "Gymnastique"],
  ["fitness", "Fitness"],
];

const PLANS: { nom: string; cible: string; prix: string; reco?: boolean; lignes: string[] }[] = [
  { nom: "STARTER", cible: "Idéal pour débuter", prix: "29", lignes: ["Adhérents illimités", "Comptabilité", "Support email"] },
  { nom: "CLUB", cible: "Le plus populaire", prix: "59", reco: true, lignes: ["Tout Starter", "Plannings", "Communications"] },
  { nom: "PREMIUM", cible: "Pour les clubs exigeants", prix: "99", lignes: ["Tout Club", "API & exports", "Support prioritaire"] },
];

export default function Home() {
  return (
    <main className="text-ink">
      {/* NAV */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-ink-soft md:flex">
            <a href="#cockpit" className="hover:text-ink">Le cockpit</a>
            <a href="#disciplines" className="hover:text-ink">Disciplines</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <Link href="/usmboxe" className="hover:text-ink">Un club</Link>
          </nav>
          <Link href="/creer" className="mono border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper">
            CRÉER MON ASSOCIATION →
          </Link>
        </div>
      </header>

      {/* 01 — HERO (photo plein cadre) */}
      <section className="relative border-b border-line">
        <Parallax src="/gym.jpg" alt="Un gymnase vide, en fin de journée." className="absolute inset-0" strength={0.06} />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/40 to-transparent" />
        <div className="relative mx-auto flex min-h-[86vh] max-w-6xl flex-col justify-center px-6 py-28 text-paper md:px-8">
          <p className="mono text-[11px] uppercase tracking-label text-paper/70">L’OS DES ASSOCIATIONS<Cur /></p>
          <h1 className="mt-8 max-w-[15ch] text-[42px] font-medium leading-[1.02] tracking-[-0.02em] md:text-[64px]">
            Les clubs méritent mieux qu’un tableur.
          </h1>
          <p className="mt-8 max-w-prose text-lg text-paper/80">
            Klubster centralise, simplifie et sécurise la gestion de votre association sportive.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/creer" className="mono bg-brand px-6 py-3 text-[13px] text-white hover:opacity-90">CRÉER MON ASSOCIATION →</Link>
            <a href="#cockpit" className="mono border border-paper/40 px-6 py-3 text-[13px] text-paper hover:bg-paper hover:text-ink">DÉCOUVRIR LE COCKPIT</a>
          </div>
        </div>
      </section>

      {/* 02 — PHOTO PLEINE LARGEUR */}
      <section className="border-b border-line">
        <div className="relative h-[260px] w-full overflow-hidden md:h-[460px]">
          <Parallax src="/pool.jpg" alt="Un bassin, juste avant l’ouverture." className="absolute inset-0" strength={0.09} />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink/75 px-6 py-3 md:px-8">
            <span className="mono text-[10px] uppercase tracking-label text-paper/55">FIG. 01</span>
            <span className="mono text-[11px] text-paper/90">Le bassin, avant tout le monde.</span>
          </div>
        </div>
      </section>

      <Citation>Les clubs existent sur le terrain.<br />Pas dans Excel.</Citation>

      {/* 03 — COCKPIT */}
      <section id="cockpit" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-28 md:px-8 md:py-40">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-[0.85fr_1.15fr] md:gap-16">
            <Reveal>
              <Surtitre n="03">LE COCKPIT</Surtitre>
              <h2 className="mt-8 text-3xl font-medium leading-tight md:text-[40px]">Tout votre club,<br />au même endroit.</h2>
              <p className="mt-6 max-w-prose text-lg text-ink-soft">
                Adhésions, licences, comptes, plannings, communications. Tout est connecté.
              </p>
              <p className="mono mt-8 text-[12px] text-ink-soft">
                <span className="text-brand">✓</span> Conforme RGPD · Hébergé en France
              </p>
            </Reveal>
            <Reveal delay={120}>
              <CockpitPreview />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 04 — PHOTO DIPTYQUE */}
      <section className="border-b border-line py-20 md:py-28">
        <EditorialGallery
          variant="duo"
          shots={[
            { src: "/pommel.jpg", alt: "Salle de gymnastique, le matin.", fig: "FIG. 02", legende: "La salle, au réveil." },
            { src: "/goal.jpg", alt: "Un but de handball, lumière rasante.", fig: "FIG. 03", legende: "Le silence d’avant-match." },
          ]}
        />
      </section>

      {/* 05 — DISCIPLINES */}
      <section id="disciplines" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-28 md:px-8 md:py-36">
          <Reveal>
            <Surtitre n="05">TOUTES LES DISCIPLINES</Surtitre>
            <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-[40px]">
              Un logiciel pensé pour tous les sports.
            </h2>
            <p className="mt-6 max-w-prose text-ink-soft">Adapté à toutes les disciplines et à toutes les tailles de clubs.</p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
              {DISCIPLINES.map(([key, label]) => (
                <div key={key} className="flex flex-col items-center gap-3 bg-paper px-4 py-8 text-center">
                  <Ico name={key} />
                  <span className="mono text-[11px] tracking-wide text-ink-soft">{label}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Citation>Le meilleur logiciel<br />est celui qu’on oublie.</Citation>

      {/* 07 — PHOTO TRIPTYQUE */}
      <section className="border-b border-line py-20 md:py-28">
        <EditorialGallery
          variant="feature"
          shots={[
            { src: "/basket.jpg", alt: "Un ballon de basket sur le parquet doré.", fig: "FIG. 04", legende: "Le calme avant l’entraînement." },
            { src: "/poolblock.jpg", alt: "Le plot de départ d’un bassin.", fig: "FIG. 05" },
            { src: "/studio.jpg", alt: "Une salle avec barre et miroir.", fig: "FIG. 06" },
          ]}
        />
      </section>

      {/* 08 — TARIFS */}
      <section id="tarifs" className="border-b border-line">
        <div className="mx-auto max-w-6xl px-6 py-28 md:px-8 md:py-36">
          <Reveal>
            <Surtitre n="08">TARIFS</Surtitre>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-[40px]">Des tarifs simples<br />et transparents.</h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
              {PLANS.map((p) => (
                <Plan key={p.nom} {...p} />
              ))}
            </div>
            <p className="mono mt-8 text-[12px] text-ink-soft">
              <span className="text-brand">✓</span> Aucun engagement · Paiements directs sur votre compte, 0 % de commission.
            </p>
          </Reveal>
        </div>
      </section>

      <Citation>Conçu par un président.<br />Pour les présidents. Point.</Citation>

      {/* 09 — CTA FINAL (photo plein cadre) */}
      <section className="relative border-b border-line">
        <Parallax src="/studio.jpg" alt="Une salle vide, lumière du soir." className="absolute inset-0" strength={0.06} />
        <div className="absolute inset-0 bg-ink/75" />
        <div className="relative mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-28 text-center text-paper md:py-36">
          <Reveal>
            <h2 className="text-3xl font-medium leading-tight md:text-[40px]">Prêt à simplifier la vie de votre club ?</h2>
            <p className="mx-auto mt-5 max-w-prose text-paper/75">
              Rejoignez les associations qui gèrent déjà tout au même endroit, en moins de vingt minutes.
            </p>
            <Link href="/creer" className="mono mt-10 inline-block bg-brand px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="flex flex-col justify-between gap-8 md:flex-row">
            <div>
              <span className="font-logo text-lg font-semibold">k<Cur /></span>
              <p className="mt-2 text-ink-soft">Le cockpit de votre association.</p>
            </div>
            <nav className="mono grid grid-cols-2 gap-x-12 gap-y-2 text-[12px] text-ink-soft sm:grid-cols-1">
              <Link href="/creer" className="hover:text-ink">Créer mon association</Link>
              <a href="#cockpit" className="hover:text-ink">Le cockpit</a>
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

function Plan({ nom, prix, cible, reco, lignes }: { nom: string; prix: string; cible: string; reco?: boolean; lignes: string[] }) {
  return (
    <div className="relative bg-paper px-7 py-9">
      {reco ? (
        <>
          <div className="absolute left-0 right-0 top-0 h-[2px] bg-brand" />
          <div className="mono absolute right-5 top-5 text-[9px] uppercase tracking-label text-brand">Recommandé</div>
        </>
      ) : null}
      <div className="mono text-[12px] tracking-label text-ink">{nom}</div>
      <div className="mt-1 text-[13px] text-ink-soft">{cible}</div>
      <div className="mono mt-6 text-[34px] font-bold tracking-tight">
        {prix}<span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
      </div>
      <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
        {lignes.map((l) => (
          <li key={l} className="flex items-center gap-3 text-[14px]">
            <span className="mono text-brand">✓</span>
            <span>{l}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Pictogrammes monoline minimalistes (abstraits, fidèles à la retenue éditoriale).
function Ico({ name }: { name: string }) {
  const c = "h-7 w-7 text-ink";
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "combat":
      return (
        <svg viewBox="0 0 28 28" className={c} {...{}}>
          <circle cx="10" cy="11" r="5" {...p} />
          <circle cx="18" cy="16" r="5" {...p} />
        </svg>
      );
    case "arts":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <path d="M14 3 L24 14 L14 25 L4 14 Z" {...p} />
          <path d="M9 14 L19 14" {...p} />
        </svg>
      );
    case "nat":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <path d="M3 11 q3.5 -3 7 0 t7 0 t7 0" {...p} />
          <path d="M3 17 q3.5 -3 7 0 t7 0 t7 0" {...p} />
        </svg>
      );
    case "tennis":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <circle cx="11" cy="11" r="7" {...p} />
          <path d="M16 16 L24 24" {...p} />
        </svg>
      );
    case "collectif":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <circle cx="14" cy="14" r="10" {...p} />
          <path d="M14 7 L20 12 L18 19 L10 19 L8 12 Z" {...p} />
        </svg>
      );
    case "danse":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <path d="M8 24 q2 -8 6 -10 q-4 -2 -2 -8 q4 4 6 0" {...p} />
        </svg>
      );
    case "gym":
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <path d="M5 5 L23 5" {...p} />
          <path d="M10 5 L10 14" {...p} />
          <path d="M18 5 L18 14" {...p} />
          <circle cx="10" cy="17" r="3" {...p} />
          <circle cx="18" cy="17" r="3" {...p} />
        </svg>
      );
    case "fitness":
    default:
      return (
        <svg viewBox="0 0 28 28" className={c}>
          <path d="M7 14 L21 14" {...p} />
          <path d="M5 10 L5 18" {...p} />
          <path d="M9 11 L9 17" {...p} />
          <path d="M19 11 L19 17" {...p} />
          <path d="M23 10 L23 18" {...p} />
        </svg>
      );
  }
}
