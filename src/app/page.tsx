import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import CockpitPreview from "@/components/site/CockpitPreview";
import Citation from "@/components/site/Citation";
import MenuMobile from "@/components/site/MenuMobile";

function Cur() {
  return <span className="cur">_</span>;
}

// Photo-chapitre : plein cadre, sans bandeau, sans légende. L'image vit seule.
function Chapitre({ src, alt, h = "h-[72vh] md:h-screen" }: { src: string; alt: string; h?: string }) {
  return (
    <section className={`relative w-full overflow-hidden ${h}`}>
      <Parallax src={src} alt={alt} className="absolute inset-0" strength={0.12} />
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
        <Parallax src={src} alt={alt} className="absolute inset-0" strength={0.08} />
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

// Le titre de la section promet « chaque association » : la liste doit tenir la promesse.
const DISCIPLINES = ["Sports de combat", "Danse", "Musique", "Théâtre", "Natation", "Sports collectifs", "Arts martiaux", "Loisirs créatifs"];

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

// Racontées en résultats, jamais en technologie.
const INCLUS = [
  "Le site de votre club, en ligne dès le premier soir",
  "Les inscriptions se remplissent toutes seules — mineurs, cours, pièces : le formulaire s’adapte",
  "Les cotisations arrivent directement sur le compte du club — 0 % de commission",
  "Le paiement jusqu’à 12 fois — le club fixe la limite, l’adhérent choisit",
  "Les certificats et documents arrivent directement au bon endroit",
  "Prévenez tous les parents en deux clics",
  "L’appel se fait en scannant la carte d’adhérent",
  "Aujourd’hui_ : l’état de votre club en trois secondes",
  "L’export de vos adhérents, quand vous voulez — vos données vous appartiennent",
  "Les évolutions de Klubster, incluses dans votre abonnement",
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
          <div className="flex items-center gap-3">
            <Link href="/creer" className="mono bg-brand-dark px-4 py-2 text-[12px] text-white hover:opacity-90">
              <span className="hidden sm:inline">CRÉER MON ASSOCIATION</span>
              <span className="sm:hidden">CRÉER</span>
            </Link>
            <MenuMobile
              ton="clair"
              liens={[
                { href: "#cockpit", label: "Le cockpit" },
                { href: "#disciplines", label: "Disciplines" },
                { href: "#tarifs", label: "Tarifs" },
                { href: "/usmboxe", label: "Voir un club" },
                { href: "/connexion", label: "Espace président" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* HERO — clarté d'abord (H1), puis le slogan en émotion, puis la signature */}
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
        <Parallax src="/01-hero.jpg" alt="Une salle de sport vide, au lever du jour." className="absolute inset-0" strength={0.07} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/15" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-16 md:px-8 md:pb-20">
            <p className="mono text-[11px] uppercase tracking-label text-paper/75">KLUBSTER<Cur /></p>
            <h1 className="mt-5 max-w-[20ch] text-4xl font-medium leading-[1.04] tracking-[-0.02em] text-paper md:text-[58px]">
              Toute votre association,<br />au même endroit.
            </h1>
            <p className="mt-6 max-w-prose text-xl font-medium text-paper md:text-2xl">Les associations méritent mieux qu’un tableur.</p>
            <p className="mono mt-4 text-[12px] uppercase tracking-wide text-paper/70">
              Prêt en moins de 30 minutes<span className="text-brand">_</span>
            </p>
          </div>
        </div>
      </section>

      {/* Résumé descriptif — une seule phrase, puis la respiration */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-10 md:px-8">
          <p className="max-w-prose text-ink md:text-lg">
            Inscriptions, paiements, communication, site web.<br />Tout ce dont une association a besoin, dans un seul outil pensé pour les bénévoles.
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
        <p>Klubster s’occupe de la part invisible — les dossiers, les paiements, les relances. Eux gardent le reste.</p>
      </DoublePage>

      <Citation lines={["Avant les adhérents.", "Avant le bruit.", "Pour ceux qui sont déjà là"]} />

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
              <p className="mt-4 text-lg text-ink-soft">C’est comme ça que Klubster évolue.</p>
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
          <Parallax src="/02-silence.jpg" alt="Le bassin, immobile, avant l’ouverture." className="absolute inset-0" strength={0.08} />
        </div>
      </section>

      <Citation lines={["Parce que personne", "ne devient bénévole", "dans un club", "pour remplir des formulaires"]} />

      {/* l’objet — le ballon */}
      <Chapitre src="/04-objet.jpg" alt="Un ballon posé sur le parquet." h="h-[60vh] md:h-[80vh]" />

      {/* IV — UNE DEMI-HEURE (la promesse, racontée comme une expérience) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:px-8 md:pt-36 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">IV</span> — UNE DEMI-HEURE<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Une demi-heure.<br />C’est tout.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Le bureau n’a jamais une demi-journée à consacrer à un logiciel.
              Alors tout est déjà prêt — il ne reste que l’essentiel.
            </p>
            <div className="mt-10 border-t border-line">
              {[
                ["01", "Créez votre club.", "Un nom, un design, vos couleurs."],
                ["02", "Ajoutez vos cours.", "Créneaux et tarifs, en quelques lignes."],
                ["03", "Ajustez votre page.", "Photos, mot du président, FAQ — des chapitres prêts à l’emploi."],
                ["04", "Ouvrez les inscriptions.", "Votre site est en ligne. Les dossiers arrivent tout seuls."],
              ].map(([n, titre, texte]) => (
                <div key={n} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-6 md:grid-cols-[64px_1fr]">
                  <span className="mono text-[13px] text-brand">{n}</span>
                  <div>
                    <p className="text-xl font-medium tracking-[-0.01em] md:text-2xl">{titre}</p>
                    <p className="mt-1.5 text-[15px] text-ink-soft">{texte}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="mono mt-10 text-[11px] uppercase tracking-label text-ink-soft">
              PRÊT EN MOINS DE 30 MINUTES<span className="text-brand">_</span> <span className="text-ink-faint">· Testé en conditions réelles à l’USM Boxe</span>
            </p>
            <p className="mono mt-12 text-2xl font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[32px]">
              Vous ne configurez pas<br />un logiciel.<br />Vous ouvrez votre club<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* V — AUJOURD'HUI_ (le produit : une scène, pas un écran) */}
      <section id="cockpit">
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal className="max-w-2xl">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">V</span> — AUJOURD’HUI<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Le club ouvre dans quinze minutes.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Vous ouvrez Klubster.<br />
              Le club est prêt.
            </p>
          </Reveal>
          <Reveal className="mt-14">
            <CockpitPreview />
          </Reveal>
        </div>
      </section>

      {/* VI — LE PARCOURS (la magie du produit, en temps réel) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VI</span> — PENDANT CE TEMPS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Une inscription, vue de votre côté.
            </h2>
            <div className="mt-10 border-t border-line">
              {[
                ["18:02", "Une nouvelle inscription arrive."],
                ["18:04", "Le paiement est reçu — directement sur le compte du club."],
                ["18:05", "Le questionnaire de santé est signé, la pièce est déposée."],
                ["18:06", "L’adhérent apparaît dans son cours."],
              ].map(([h, texte]) => (
                <div key={h} className="grid grid-cols-[64px_1fr] gap-4 border-b border-line py-5 md:grid-cols-[88px_1fr]">
                  <span className="mono text-[13px] text-ink-faint">{h}</span>
                  <p className="text-lg text-ink">{texte}</p>
                </div>
              ))}
            </div>
            <p className="mono mt-10 text-2xl font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[32px]">
              Vous n’avez rien eu à faire<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* VII — QUAND LE CLUB OUVRE (contemplatif — une scène, pas des chiffres) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VII</span> — QUAND LE CLUB OUVRE<Cur /></p>
            <p className="mono mt-10 max-w-[720px] text-2xl font-normal leading-[1.2] tracking-[-0.02em] text-ink md:text-[32px]">
              Quand le club ouvre,<br />personne ne pense au logiciel.
            </p>
            <p className="mt-8 text-lg text-ink-soft">
              Les bénévoles pensent aux adhérents.<br />
              Et c’est exactement pour ça que Klubster existe<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* INTERLUDE — QUI FAIT KLUBSTER (note du fondateur, photo à venir) */}
      <section>
        <div className="mx-auto max-w-2xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">QUI FAIT KLUBSTER<span className="text-brand">_</span></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Je n’ai pas inventé Klubster. J’en avais besoin.
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-ink-soft">
              Un mercredi soir. Deux certificats manquaient. Trois chèques attendaient encore. Le cours venait de commencer.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Je me suis demandé pourquoi un bénévole passait autant de temps devant un tableur.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink">
              Klubster est né ce soir-là.
            </p>
            <p className="mono mt-8 text-[13px] tracking-wide text-ink">
              Mathieu Bourdieu — président de l’USM Boxe Anglaise<span className="text-brand">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* VII — LES DISCIPLINES */}
      <section id="disciplines">
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-12 text-center md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">VIII</span> — LES DISCIPLINES<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Chaque association fonctionne différemment.
            </h2>
            <p className="mx-auto mt-6 max-w-prose text-lg text-ink-soft">Klubster s’adapte à la vôtre.</p>
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

      {/* la saison */}
      <Chapitre src="/06-saison.jpg" alt="La lumière d’une fin de saison, à travers les baies." />

      {/* VIII — UNE SAISON (apparaît d’un bloc) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:px-8 md:pt-36 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">IX</span> — UNE SAISON<Cur /></p>
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

      {/* X — TARIFS : tout est déjà inclus, le prix suit la taille du club */}
      <section id="tarifs">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">X</span> — TARIFS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Tout est déjà inclus.</h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Pas de version Pro. Pas d’options. Pas de modules.<br />
              Seule la taille de votre association fait évoluer le tarif.
            </p>
            <p className="mt-6 max-w-prose text-xl font-medium text-ink">
              Le premier mois est offert<span className="text-brand">.</span>
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
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">DANS TOUTES LES OFFRES<Cur /></p>
            <ul className="mt-6 max-w-2xl space-y-3">
              {INCLUS.map((f) => (
                <li key={f} className="flex items-start gap-3 border-b border-line pb-3 text-[15px] last:border-b-0 last:pb-0">
                  <span className="mono text-brand">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-10 max-w-prose text-lg text-ink">
            Les paiements arrivent directement sur votre compte Stripe.<br />Klubster ne prélève aucune commission.
          </p>
          <p className="mt-4 max-w-prose text-lg text-ink-soft">
            Vos adhérents restent les vôtres : la liste complète s’exporte en un clic, à tout moment.
            Vos données sont hébergées dans l’Union européenne.
          </p>
          <p className="mono mt-3 text-[11px] leading-relaxed text-ink-soft">
            Premier mois offert, sans prélèvement. Changez d’offre ou résiliez à tout moment, depuis votre cockpit.
            Aucun engagement. Les paiements Stripe (1,5 % + 0,25 €) sont facturés directement par Stripe.
          </p>
        </div>
      </section>

      <Citation topTight lines={["On ne fait jamais", "les inscriptions", "quand on a le temps"]} />

      {/* SIGNATURE — le grand k_, une seule fois */}
      <section className="border-y border-line">
        <div className="flex flex-col items-center justify-center py-24 md:py-32">
          <span className="kb-float font-logo text-[110px] leading-none text-brand md:text-[190px]">k_</span>
          <span className="mono mt-5 text-[12px] uppercase tracking-label text-ink-soft">klubster.fr</span>
        </div>
      </section>

      {/* CTA FINAL — photo plein écran */}
      <section className="relative h-[80vh] min-h-[460px] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.08} />
        <div className="absolute inset-0 bg-ink/55" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="px-6 text-center text-paper">
            <h2 className="text-3xl font-medium leading-tight md:text-[40px]">Ouvrez la saison avec Klubster.</h2>
            <Link href="/creer" className="mono mt-10 inline-block bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono mt-6 text-[11px] uppercase tracking-label text-paper/70">
              Prêt en moins de 30 minutes<span className="text-brand">_</span>
            </p>
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
              <Link href="/cgu" className="hover:text-ink">CGU</Link>
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
