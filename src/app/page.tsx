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

// Citation = bloc-manifeste. Pas de police littéraire : du Space Mono très grand,
// mesure courte, interligne serré, beaucoup de vide, _ vert en fin. La différence
// vient de la mise en page, pas d'une voix extérieure (univers terminal/carnet).
function Citation({ children, topTight }: { children: React.ReactNode; topTight?: boolean }) {
  const pt = topTight ? "pt-16 md:pt-24" : "pt-32 md:pt-48";
  return (
    <section>
      <div className={`mx-auto max-w-[720px] px-6 pb-32 text-center md:px-8 md:pb-48 ${pt}`}>
        <Reveal kind="quote">
          <p className="mono text-[26px] font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[40px]">
            {children}<span className="cur">_</span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}

// Double-page magazine : une photo plein bord, un texte en regard.
function DoublePage({
  src,
  alt,
  num,
  kicker,
  titre,
  children,
  flip,
}: {
  src: string;
  alt: string;
  num: string;
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
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">{num}</span> — {kicker}<Cur /></p>
          <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">{titre}</h2>
          <div className="mt-6 space-y-4 text-lg text-ink-soft">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}

const DISCIPLINES = ["Sports de combat", "Arts martiaux", "Natation", "Tennis", "Sports collectifs", "Danse", "Gymnastique", "Fitness"];

// Notes de terrain — signature éditoriale récurrente (home, Journal, LinkedIn…).
const NOTES: [string, string][] = [
  ["07", "Le premier mercredi de septembre, les dossiers incomplets arrivent tous en même temps."],
  ["12", "Les bénévoles ouvrent souvent la salle trente minutes avant tout le monde."],
  ["18", "Les paiements arrivent rarement quand on a le temps de les vérifier."],
];

const SAISON: [string, string][] = [
  ["SEPTEMBRE", "Les portes rouvrent. Le site du club est déjà en ligne."],
  ["DÉCEMBRE", "Les dossiers sont complets.\nPersonne n’a couru après un papier."],
  ["JUIN", "La saison se termine. On connaît déjà la suivante."],
];

// Un seul produit. Le prix suit la taille du club. Toutes les fonctionnalités incluses partout.
const PALIERS: { capacite: string; prix: string }[] = [
  { capacite: "Jusqu’à 300 adhérents", prix: "9" },
  { capacite: "301 à 500 adhérents", prix: "19" },
  { capacite: "Plus de 500 adhérents", prix: "29" },
];

const INCLUS = [
  "Site web de votre association",
  "Inscriptions en ligne",
  "Paiement sécurisé avec Stripe",
  "Gestion des adhérents",
  "Gestion des disciplines",
  "Communication par email",
  "Actualité à la une",
  "Documents des adhérents",
  "Tableau de bord",
  "Statistiques",
  "Membres du bureau",
  "0 % de commission",
  "Toutes les futures fonctionnalités",
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
          <Link href="/creer" className="mono bg-brand px-4 py-2 text-[12px] text-white hover:opacity-90">
            CRÉER MON ASSOCIATION
          </Link>
        </div>
      </header>

      {/* HERO — clarté d'abord (H1), puis le slogan en émotion, puis la signature */}
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
        <Parallax src="/01-hero.jpg" alt="Une salle de sport vide, au lever du jour." className="absolute inset-0" strength={0.05} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/15" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-16 md:px-8 md:pb-20">
            <p className="mono text-[11px] uppercase tracking-label text-paper/75">KLUBSTER<Cur /></p>
            <h1 className="mt-5 max-w-[20ch] text-4xl font-medium leading-[1.04] tracking-[-0.02em] text-paper md:text-[58px]">
              Toute votre association,<br />au même endroit.
            </h1>
            <p className="mt-6 max-w-prose text-xl font-medium text-paper md:text-2xl">Les clubs méritent mieux qu’un tableur.</p>
            <p className="mono mt-4 text-[12px] uppercase tracking-wide text-paper/70">Créé par un président. Pour les présidents.</p>
          </div>
        </div>
      </section>

      {/* Résumé descriptif — un cran plus bas, sans alourdir le hero */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          <p className="max-w-prose text-ink md:text-lg">
            Inscriptions, adhérents, paiements, communication, site web,…<br />Klubster réunit tout ce dont un club a besoin dans un seul outil, pensé pour les bénévoles.
          </p>
        </div>
      </section>

      {/* I — POURQUOI (manifeste) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-24 md:px-8 md:py-36">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">I</span> — POURQUOI<Cur /></p>
            <h2 className="mt-8 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] md:text-[48px]">
              Un club, ce n’est pas une base de données.
            </h2>
            <p className="mt-8 text-lg text-ink-soft">
              C’est un gymnase qu’on ouvre le soir, des bénévoles qui restent tard, une saison qui recommence.
              Klubster a été pensé pour disparaître derrière tout ça.
            </p>
          </Reveal>
        </div>
      </section>

      {/* II — LES CLUBS (double-page) */}
      <DoublePage src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." num="II" kicker="LES CLUBS" titre="Tout repose sur quelques personnes.">
        <p>Des bénévoles qui font vivre un lieu, une équipe, une saison. Souvent les mêmes, souvent seuls.</p>
        <p>Klubster prend la part invisible — les dossiers, les paiements, les relances — pour leur laisser le reste.</p>
      </DoublePage>

      <Citation>Avant les adhérents.<br />Avant le bruit</Citation>

      {/* III — SUR LE TERRAIN (double-page : texte à gauche, bassin à droite) */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex items-center px-6 py-20 md:px-16 md:py-24">
          <div className="max-w-md">
            <Reveal>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">III</span> — SUR LE TERRAIN<Cur /></p>
              <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[36px]">
                Avant d’être une fonctionnalité, c’est un problème rencontré un soir d’entraînement.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-ink">Un parent arrive sans certificat.<br />Une licence est expirée.<br />Le trésorier attend un paiement.</p>
              <p className="mt-4 text-lg text-ink-soft">C’est là que naissent les fonctionnalités de Klubster.</p>
              <p className="mono mt-6 text-[11px] uppercase tracking-label text-ink-soft">
                <span className="text-brand">●</span> Développé et utilisé chaque semaine à l’USM Boxe
              </p>
            </Reveal>
            <Reveal className="mt-10">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">NOTES DE TERRAIN<Cur /></p>
              <div className="mt-5 border-t border-line">
                {NOTES.map(([num, texte]) => (
                  <p key={num} className="border-b border-line py-4 text-[15px] text-ink-soft">{texte}</p>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
        <div className="relative min-h-[58vh] overflow-hidden md:min-h-[88vh]">
          <Parallax src="/02-silence.jpg" alt="Le bassin, immobile, avant l’ouverture." className="absolute inset-0" strength={0.06} />
        </div>
      </section>

      <Citation>Parce que personne<br />ne devient<br />président d’un club<br />pour remplir des formulaires</Citation>

      {/* l’objet — le ballon */}
      <Chapitre src="/04-objet.jpg" alt="Un ballon posé sur le parquet." h="h-[60vh] md:h-[80vh]" />

      {/* IV — CONÇU POUR LE TERRAIN (la promesse 30 min) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:px-8 md:pt-36 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">IV</span> — CONÇU POUR LE TERRAIN<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Un président n’a jamais<br />une demi-journée à consacrer à un logiciel.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Alors nous avons conçu Klubster pour être configuré en moins de trente minutes. Le reste est déjà prêt.
            </p>
            <ul className="mt-8 space-y-2.5">
              {["Pas de configuration complexe", "Pas de menus inutiles", "Pas de jargon", "Des réglages intelligents par défaut"].map((l) => (
                <li key={l} className="flex items-center gap-3 text-[15px] text-ink-soft">
                  <span className="mono text-brand">✓</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">
              <span className="text-brand">●</span> Chronométré à l’USM Boxe
            </p>
            <p className="mono mt-12 text-2xl font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[32px]">
              Parce qu’un président de club<br />a mieux à faire<br />que d’apprendre un logiciel<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* V — LE COCKPIT (le produit, une fois l’émotion installée) */}
      <section id="cockpit">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal className="max-w-2xl">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">V</span> — LE COCKPIT<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Et un matin,<br />tout est au même endroit.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Adhésions, licences, paiements, plannings.<br />Vous ouvrez une page, vous voyez votre club.
            </p>
          </Reveal>
          <Reveal className="mt-14">
            <CockpitPreview />
          </Reveal>
        </div>
      </section>

      {/* VI — UN MERCREDI SOIR (le bénéfice, pas les fonctionnalités) */}
      <section>
        <div className="mx-auto max-w-4xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VI</span> — UN MERCREDI SOIR<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">18 h 30. Le club ouvre.</h2>
          </Reveal>
          <Reveal className="mt-12">
            <div className="grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-2">
              <div className="bg-paper px-7 py-9">
                <p className="mono text-[10px] uppercase tracking-label text-ink-soft">AVANT</p>
                <ul className="mono mt-5 space-y-2 text-[15px] text-ink-soft">
                  <li>5 SMS</li>
                  <li>3 mails</li>
                  <li>17 dossiers papier</li>
                  <li>2 chèques</li>
                  <li>1 tableur</li>
                </ul>
              </div>
              <div className="bg-paper px-7 py-9">
                <p className="mono text-[10px] uppercase tracking-label text-ink-soft">AVEC KLUBSTER<span className="text-brand">_</span></p>
                <p className="mt-5 text-[40px] font-medium leading-none tracking-[-0.01em] md:text-[56px]">1 notification<span className="text-brand">.</span></p>
                <p className="mt-4 text-lg text-ink-soft">C’est tout.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* VII — LES DISCIPLINES */}
      <section id="disciplines">
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-12 text-center md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VII</span> — LES DISCIPLINES<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Peu importe votre sport.
            </h2>
            <p className="mx-auto mt-6 max-w-prose text-lg text-ink-soft">Klubster s’adapte au fonctionnement de votre club.</p>
            <p className="mono mt-8 text-[13px] leading-loose tracking-wide text-ink-soft">
              {DISCIPLINES.map((d, i) => (
                <span key={d}>
                  {d}
                  {i < DISCIPLINES.length - 1 ? <span className="text-brand"> · </span> : null}
                </span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      <Citation topTight>Le meilleur logiciel<br />est celui qu’on oublie</Citation>

      {/* la saison */}
      <Chapitre src="/06-saison.jpg" alt="La lumière d’une fin de saison, à travers les baies." />

      {/* VIII — UNE SAISON (apparaît d’un bloc) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:px-8 md:pt-36 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VIII</span> — UNE SAISON<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Une année, sans y penser.</h2>
            <div className="mt-10">
              {SAISON.map(([mois, texte]) => (
                <div key={mois} className="grid grid-cols-1 gap-1 border-t border-line py-5 md:grid-cols-[160px_1fr] md:gap-8">
                  <div className="mono text-[13px] tracking-wider text-ink">{mois}<span className="text-brand">_</span></div>
                  <p className="whitespace-pre-line text-lg text-ink-soft">{texte}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* IX — TARIFS : un seul produit, le prix suit la taille du club */}
      <section id="tarifs">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">IX</span> — TARIFS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Le même Klubster pour tous les clubs.</h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Le prix s’adapte simplement au nombre d’adhérents.<br />Toutes les fonctionnalités sont incluses, quel que soit votre abonnement.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            {PALIERS.map((p) => (
              <div key={p.capacite} className="flex flex-col bg-paper px-7 py-9">
                <div className="mono text-[12px] uppercase tracking-wide text-ink">{p.capacite}</div>
                <div className="mono mt-5 text-[36px] font-bold tracking-tight text-brand">
                  {p.prix}<span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
                </div>
              </div>
            ))}
          </div>

          <div className="-mt-px border-x border-b border-line bg-paper px-7 py-8">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">INCLUS DANS TOUTES LES OFFRES<Cur /></p>
            <ul className="mt-6 grid grid-cols-1 gap-x-10 gap-y-2.5 sm:grid-cols-2 md:grid-cols-3">
              {INCLUS.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[14px]">
                  <span className="mono text-brand">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 max-w-prose text-lg text-ink">
            Les paiements arrivent directement sur votre compte Stripe.<br />Klubster ne prélève aucune commission.
          </p>
          <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
            Changez d’offre à tout moment. Aucun engagement. Les paiements Stripe (1,5 % + 0,25 €) sont facturés directement par Stripe.
          </p>
        </div>
      </section>

      <Citation topTight>On ne fait jamais<br />les inscriptions<br />quand on a le temps</Citation>

      {/* SIGNATURE — le grand k_, une seule fois */}
      <section className="border-y border-line">
        <div className="flex flex-col items-center justify-center py-24 md:py-32">
          <span className="font-logo text-[110px] leading-none text-brand md:text-[190px]">k_</span>
          <span className="mono mt-5 text-[12px] uppercase tracking-label text-ink-soft">klubster.fr</span>
        </div>
      </section>

      {/* CTA FINAL — photo plein écran */}
      <section className="relative h-[80vh] min-h-[460px] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.06} />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-6 text-center text-paper">
            <h2 className="text-3xl font-medium leading-tight md:text-[40px]">Ouvrez la saison avec Klubster.</h2>
            <Link href="/creer" className="mono mt-10 inline-block bg-brand px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER — minimal. Les mentions vivent ici. */}
      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="font-logo text-lg font-semibold">k<Cur /></span>
              <p className="mono mt-3 text-[11px] text-ink-soft">Développé à Montauban. Utilisé chaque semaine à l’USM Boxe.</p>
            </div>
            <nav className="mono flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-ink-soft">
              <Link href="/creer" className="hover:text-ink">Créer mon association</Link>
              <Link href="/connexion" className="hover:text-ink">Espace président</Link>
              <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
              <Link href="/cgv" className="hover:text-ink">CGV</Link>
              <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
              <Link href="/sous-traitance" className="hover:text-ink">Sous-traitance</Link>
            </nav>
          </div>
          <p className="mono mt-12 text-[11px] text-ink-faint">© {new Date().getFullYear()} KLUBSTER</p>
        </div>
      </footer>
    </main>
  );
}
