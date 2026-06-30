import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import CockpitPreview from "@/components/site/CockpitPreview";

function Cur() {
  return <span className="cur">_</span>;
}

// Photo-chapitre : plein cadre, sans bandeau, sans légende. L'image vit seule.
function Chapitre({ src, alt, h = "h-[72vh] md:h-screen" }: { src: string; alt: string; h?: string }) {
  return (
    <section className={`relative w-full overflow-hidden ${h}`}>
      <Parallax src={src} alt={alt} className="absolute inset-0" strength={0.08} />
    </section>
  );
}

// Citation : pure respiration. Aucun ornement, aucune explication.
function Citation({ children }: { children: React.ReactNode }) {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-40 text-center md:px-8 md:py-56">
        <Reveal kind="quote">
          <p className="text-[28px] font-medium leading-[1.25] tracking-[-0.01em] text-ink md:text-[42px]">{children}</p>
        </Reveal>
      </div>
    </section>
  );
}

// Double-page magazine : une photo plein bord, un texte en regard.
function DoublePage({
  src,
  alt,
  kicker,
  titre,
  children,
  flip,
}: {
  src: string;
  alt: string;
  kicker: string;
  titre: string;
  children: React.ReactNode;
  flip?: boolean;
}) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      <div className={`relative min-h-[58vh] overflow-hidden md:min-h-[88vh] ${flip ? "md:order-2" : ""}`}>
        <Parallax src={src} alt={alt} className="absolute inset-0" strength={0.06} />
      </div>
      <div className="flex items-center px-6 py-20 md:px-16 md:py-0">
        <Reveal className="max-w-md">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">{kicker}<Cur /></p>
          <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">{titre}</h2>
          <div className="mt-6 space-y-4 text-lg text-ink-soft">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}

const DISCIPLINES = ["Sports de combat", "Arts martiaux", "Natation", "Tennis", "Sports collectifs", "Danse", "Gymnastique", "Fitness"];

const SAISON: [string, string][] = [
  ["SEPTEMBRE", "Les portes rouvrent. Le site du club est déjà en ligne."],
  ["DÉCEMBRE", "Les dossiers sont complets. Personne n’a couru après un papier."],
  ["JUIN", "La saison se termine. On connaît déjà la suivante."],
];

type PlanT = { nom: string; segment: string; capacite: string; prix: string; reco?: boolean; reprise?: string; lignes: string[] };
const PLANS: PlanT[] = [
  {
    nom: "STARTER",
    segment: "Pour les petits clubs",
    capacite: "Jusqu’à 100 adhérents",
    prix: "9",
    lignes: ["Site web", "Inscriptions en ligne", "Paiements Stripe", "Adhérents", "Emails", "0 % de commission"],
  },
  {
    nom: "CLUB",
    segment: "Pour les clubs en développement",
    capacite: "101 à 300 adhérents",
    prix: "19",
    reco: true,
    reprise: "Tout Starter +",
    lignes: ["Plusieurs disciplines", "Équipe dirigeante", "Statistiques", "Gestion avancée"],
  },
  {
    nom: "CLUB+",
    segment: "Pour les grands clubs",
    capacite: "Plus de 300 adhérents",
    prix: "29",
    reprise: "Tout Club +",
    lignes: ["Utilisateurs illimités", "Support prioritaire", "Fonctionnalités avancées"],
  },
];

export default function Home() {
  return (
    <main className="text-ink">
      {/* NAV */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold text-paper drop-shadow">k<Cur /></Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-paper/80 md:flex">
            <a href="#cockpit" className="hover:text-paper">Le cockpit</a>
            <a href="#disciplines" className="hover:text-paper">Disciplines</a>
            <a href="#tarifs" className="hover:text-paper">Tarifs</a>
            <Link href="/usmboxe" className="hover:text-paper">Un club</Link>
          </nav>
          <Link href="/creer" className="mono border border-paper/40 px-4 py-2 text-[12px] text-paper hover:bg-paper hover:text-ink">
            CRÉER MON ASSOCIATION
          </Link>
        </div>
      </header>

      {/* HERO — photo plein écran, très peu de texte, beaucoup de silence */}
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
        <Parallax src="/01-hero.jpg" alt="Une salle de sport vide, au lever du jour." className="absolute inset-0" strength={0.05} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-ink/20" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-16 md:px-8 md:pb-20">
            <p className="mono text-[11px] uppercase tracking-label text-paper/70">KLUBSTER<Cur /></p>
            <p className="mt-5 max-w-[18ch] text-2xl font-medium leading-snug text-paper md:text-[34px]">
              Le logiciel des clubs qui préfèrent le terrain.
            </p>
          </div>
        </div>
      </section>

      {/* POURQUOI — manifeste, texte seul */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-32 md:px-8 md:py-48">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">POURQUOI<Cur /></p>
            <h1 className="mt-8 text-[34px] font-medium leading-[1.08] tracking-[-0.02em] md:text-[52px]">
              Les clubs méritent mieux qu’un tableur.
            </h1>
            <p className="mt-8 text-lg text-ink-soft">
              Un club, ce n’est pas une base de données. C’est un gymnase qu’on ouvre le soir, des
              bénévoles qui restent tard, une saison qui recommence. Klubster a été pensé pour disparaître
              derrière tout ça.
            </p>
          </Reveal>
        </div>
      </section>

      <Citation>Le club ouvre dans quinze minutes.</Citation>

      {/* CHAPITRE — le silence avant l’entraînement */}
      <Chapitre src="/02-silence.jpg" alt="Le bassin, immobile, avant l’ouverture." />

      {/* LES CLUBS — double-page */}
      <DoublePage src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." kicker="LES CLUBS" titre="Tout repose sur quelques personnes.">
        <p>Des bénévoles qui font vivre un lieu, une équipe, une saison. Souvent les mêmes, souvent seuls.</p>
        <p>Klubster prend la part invisible — les dossiers, les paiements, les relances — pour leur laisser le reste.</p>
      </DoublePage>

      {/* CHAPITRE — l’objet */}
      <Chapitre src="/04-objet.jpg" alt="Un ballon posé sur le parquet." h="h-[60vh] md:h-[80vh]" />

      <Citation>Avant les adhérents.<br />Avant le bruit.</Citation>

      {/* CHAPITRE — transition vers le produit */}
      <Chapitre src="/05-couloir.jpg" alt="Un couloir de gymnase, désert." h="h-[58vh] md:h-[78vh]" />

      {/* LE COCKPIT — le produit, une fois l’émotion installée */}
      <section id="cockpit">
        <div className="mx-auto max-w-6xl px-6 py-32 md:px-8 md:py-48">
          <Reveal className="max-w-2xl">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE COCKPIT<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Et un matin, tout est au même endroit.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Adhésions, licences, paiements, plannings. Vous ouvrez une page, vous voyez votre club.
            </p>
          </Reveal>
          <Reveal delay={120} className="mt-14">
            <CockpitPreview />
          </Reveal>
        </div>
      </section>

      {/* LES DISCIPLINES — aéré, sans grille marketing */}
      <section id="disciplines">
        <div className="mx-auto max-w-3xl px-6 py-32 text-center md:px-8 md:py-48">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LES DISCIPLINES<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Tous les sports. Le même calme.
            </h2>
            <p className="mono mt-10 text-[13px] leading-loose tracking-wide text-ink-soft">
              {DISCIPLINES.map((d, i) => (
                <span key={d}>
                  {d}
                  {i < DISCIPLINES.length - 1 ? <span className="text-ink-faint"> · </span> : null}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      <Citation>Le meilleur logiciel<br />est celui qu’on oublie.</Citation>

      {/* CHAPITRE — la saison */}
      <Chapitre src="/06-saison.jpg" alt="La lumière d’une fin de saison, à travers les baies." />

      {/* LA SAISON — texte court, racontée */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-32 md:px-8 md:py-48">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">UNE SAISON<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Une année, sans y penser.</h2>
          </Reveal>
          <div className="mt-12">
            {SAISON.map(([mois, texte], i) => (
              <Reveal key={mois} delay={i * 80}>
                <div className="grid grid-cols-1 gap-2 border-t border-line py-7 md:grid-cols-[160px_1fr] md:gap-8">
                  <div className="mono text-[13px] tracking-wider text-ink">{mois}<span className="text-brand">_</span></div>
                  <p className="text-lg text-ink-soft">{texte}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* TARIFS — ce que le club garde, pas le prix */}
      <section id="tarifs">
        <div className="mx-auto max-w-5xl px-6 py-32 md:px-8 md:py-48">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">TARIFS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Vous gardez 100 % de vos cotisations.</h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
              {PLANS.map((p) => (
                <div key={p.nom} className="flex flex-col bg-paper px-7 py-9">
                  <div className="mono text-[12px] tracking-label text-ink">
                    {p.nom}<span className="text-brand">_</span>
                    {p.reco ? <span className="ml-2 text-brand">●</span> : null}
                  </div>
                  <div className="mt-2 text-[15px] font-medium">{p.segment}</div>
                  <div className="mono mt-0.5 text-[11px] text-ink-soft">{p.capacite}</div>
                  <div className="mono mt-6 text-[34px] font-bold tracking-tight">
                    {p.prix}<span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
                  </div>
                  <div className="mt-6 border-t border-line pt-6">
                    {p.reprise ? <div className="mono text-[11px] uppercase tracking-wide text-ink-soft">{p.reprise}</div> : null}
                    <ul className={`${p.reprise ? "mt-3" : ""} space-y-2.5`}>
                      {p.lignes.map((l) => (
                        <li key={l} className="flex items-center gap-3 text-[14px]">
                          <span className="mono text-brand">✓</span>
                          <span>{l}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-10 max-w-prose text-lg text-ink">
              Les paiements arrivent directement sur votre compte Stripe. Klubster ne prélève aucune commission.
            </p>
            <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
              Changez d’offre à tout moment. Aucun engagement. Les paiements Stripe (1,5 % + 0,25 €) sont facturés directement par Stripe.
            </p>
          </Reveal>
        </div>
      </section>

      <Citation>Conçu par un président.<br />Pour les présidents. Point.</Citation>

      {/* CTA FINAL — photo plein écran */}
      <section className="relative h-[80vh] min-h-[460px] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.06} />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Reveal className="px-6 text-center text-paper">
            <h2 className="text-3xl font-medium leading-tight md:text-[40px]">Ouvrez la saison avec Klubster.</h2>
            <Link href="/creer" className="mono mt-10 inline-block bg-brand px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* FOOTER — c’est ici que vivent les mentions */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-16 md:px-8">
          <div className="flex flex-col justify-between gap-10 md:flex-row">
            <div>
              <span className="font-logo text-lg font-semibold">k<Cur /></span>
              <p className="mt-2 text-ink-soft">Le cockpit de votre association.</p>
              <p className="mono mt-4 text-[11px] text-ink-faint">Conforme RGPD · Hébergé en France</p>
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
