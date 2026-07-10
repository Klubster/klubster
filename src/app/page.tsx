import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import CockpitPreview from "@/components/site/CockpitPreview";
import Citation from "@/components/site/Citation";
import MenuMobile from "@/components/site/MenuMobile";

function Cur() {
  return <span className="cur">_</span>;
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

// Le titre promet « chaque association » : la liste doit tenir la promesse.
const DISCIPLINES = ["Sports de combat", "Danse", "Musique", "Théâtre", "Natation", "Sports collectifs", "Arts martiaux", "Loisirs créatifs"];

// Un seul produit. Le prix suit la taille du club. Toutes les fonctionnalités incluses partout.
const PALIERS: { capacite: string; prix: string }[] = [
  { capacite: "Jusqu’à 300 adhérents", prix: "9" },
  { capacite: "301 à 500 adhérents", prix: "19" },
  { capacite: "Plus de 500 adhérents", prix: "29" },
];

// Neuf lignes, courtes. Une liste qu'on lit debout, pas une brochure.
const INCLUS = [
  "Le site internet de votre association",
  "Les inscriptions et les dossiers en ligne",
  "Les paiements jusqu’à 12 fois",
  "Les documents et certificats centralisés",
  "Les messages aux adhérents et aux parents",
  "Le suivi des présences",
  "Le cockpit Aujourd’hui_",
  "L’export complet de vos données",
  "Toutes les futures évolutions de Klubster",
];

// Les trois questions qu'un président se pose juste après avoir vu le prix.
const OBJECTIONS: [string, string][] = [
  [
    "J’ai déjà mes adhérents dans un tableur.",
    "Importez votre fichier : Klubster fait correspondre vos colonnes aux siennes, et vous montre le résultat avant d’enregistrer quoi que ce soit.",
  ],
  [
    "Et si je veux partir ?",
    "Vous exportez la liste complète de vos adhérents en un clic, et vous résiliez depuis votre cockpit. Sans engagement, sans préavis.",
  ],
  [
    "Où vont les données de mes adhérents ?",
    "Elles sont hébergées dans l’Union européenne. Elles vous appartiennent, et ne sont ni revendues ni exploitées.",
  ],
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
            <Link href="/fonctionnalites" className="hover:text-paper">Fonctionnalités</Link>
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
                { href: "/fonctionnalites", label: "Fonctionnalités" },
                { href: "#tarifs", label: "Tarifs" },
                { href: "/usmboxe", label: "Voir un club" },
                { href: "/connexion", label: "Espace président" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* HERO — l'image et la promesse. Rien à lire par-dessus une photo.
          85vh, pas 100 : le bloc blanc doit affleurer, sinon rien n'appelle le scroll
          et le visiteur ne voit ni le prix ni le bouton. */}
      <section className="relative h-[85vh] min-h-[560px] w-full overflow-hidden">
        <Parallax src="/01-hero.jpg" alt="Une salle de sport vide, au lever du jour." className="absolute inset-0" strength={0.07} priority />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/15" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-16 md:px-8 md:pb-20">
            <p className="mono text-[11px] uppercase tracking-label text-paper/75">KLUBSTER<Cur /></p>
            {/* 30px sur téléphone : à 36px, « Toute votre association, » déborde de 70 px
                et le titre part sur quatre lignes au lieu de deux. */}
            <h1 className="mt-5 max-w-[20ch] text-[30px] font-medium leading-[1.06] tracking-[-0.02em] text-paper sm:text-4xl md:text-[58px]">
              Toute votre association,<br />au même endroit.
            </h1>
            <p className="mt-6 max-w-prose text-xl font-medium text-paper md:text-2xl">Les associations méritent mieux qu’un tableur.</p>
          </div>
        </div>
      </section>

      {/* L'OFFRE — sur fond blanc, sous la photo : ce qu'on lit, on le lit sur du papier. */}
      <section>
        <div className="mx-auto max-w-6xl px-6 pt-14 pb-20 md:px-8 md:pt-20 md:pb-28">
          <p className="max-w-prose text-lg leading-relaxed text-ink md:text-xl">
            Inscriptions, paiements, communication et site web. Tout ce dont une association a besoin,
            réuni dans un seul outil pensé pour les bénévoles.
          </p>
          <p className="mono mt-8 text-[13px] tracking-wide text-ink">
            À partir de 9 €/mois <span className="text-ink-faint">·</span> Premier mois offert
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/creer" className="mono bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              Prêt en moins de 30 minutes<span className="text-brand">_</span>
            </p>
          </div>
        </div>
      </section>

      {/* I — POURQUOI (fusion de l'ancien manifeste et de « Les clubs ») */}
      <DoublePage src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." num="I" kicker="POURQUOI" titre="Un club, ce n’est pas une base de données.">
        <p>
          C’est une salle qu’on ouvre le soir, des adhérents qui arrivent, et des bénévoles qui donnent déjà
          beaucoup de leur temps.
        </p>
        <p>
          Klubster s’occupe de la part invisible — les inscriptions, les paiements, les documents et les relances.
          Vous gardez le reste.
        </p>
      </DoublePage>

      <Citation serre lines={["Avant les adhérents.", "Avant le bruit.", "Pour ceux qui sont déjà là"]} />

      {/* II — LE COCKPIT (le produit, montré tôt) */}
      <section id="cockpit">
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-12 md:px-8 md:pt-32 md:pb-[72px]">
          <Reveal className="max-w-2xl">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">II</span> — LE COCKPIT<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              La salle ouvre dans quinze minutes.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Vous ouvrez Klubster.<br />
              Tout est prêt.
            </p>
          </Reveal>

          <Reveal className="mt-14">
            <CockpitPreview />
          </Reveal>

          <Reveal className="mt-12">
            <p className="max-w-2xl text-lg text-ink-soft">
              Tout ce qui demande habituellement plusieurs fichiers, plusieurs outils et plusieurs vérifications
              est réuni au même endroit. Inscriptions. Paiements. Documents. Présences. Messages.
            </p>
          </Reveal>
        </div>
      </section>

      {/* La conclusion du cockpit — une seule phrase, à gauche, le studio à droite.
          Alignée haut : centrée, elle flottait au milieu d'une colonne de 88vh. */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex items-start px-6 py-20 md:px-16 md:pt-32">
          <Reveal className="max-w-md">
            <p className="mono text-lg font-normal leading-[1.2] tracking-[-0.02em] text-ink sm:text-2xl md:text-[32px]">
              L’état de votre association,<br />en trois secondes<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
        <div className="relative min-h-[58vh] overflow-hidden md:min-h-[88vh]">
          <Parallax src="/08-studio.jpg" alt="Un studio de yoga, tapis déroulés, au soleil couchant." className="absolute inset-0" strength={0.08} />
        </div>
      </section>

      {/* III — TARIFS : tôt, lisibles, sans astérisque */}
      <section id="tarifs">
        <div className="mx-auto max-w-5xl px-6 pt-12 pb-12 md:px-8 md:pt-[72px] md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">III</span> — TARIFS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Tout est déjà inclus.</h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Pas de version Pro. Pas d’options. Pas de modules supplémentaires.<br />
              Seule la taille de votre association fait évoluer le tarif.
            </p>
            <p className="mono mt-6 text-[12px] uppercase tracking-label text-ink">
              Premier mois offert<span className="text-brand">_</span>
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            {PALIERS.map((p) => (
              <div key={p.capacite} className="flex flex-col bg-paper px-7 py-9">
                <div className="mono text-[12px] uppercase tracking-wide text-ink">{p.capacite}</div>
                <div className="mono mt-5 text-[36px] font-bold tracking-tight text-brand">
                  {p.prix}<span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
                </div>
                {/* Referme la carte : sans cette ligne, le prix flotte au-dessus d'un vide. */}
                <div className="mono mt-5 text-[11px] uppercase tracking-label text-ink-faint">
                  Premier mois offert
                </div>
              </div>
            ))}
          </div>

          {/* Le geste touche le prix : c'est là qu'on décide. */}
          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href="/creer" className="mono bg-ink px-7 py-3.5 text-[13px] text-paper hover:bg-ink/90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              Premier mois offert · Sans engagement<span className="text-brand">_</span>
            </p>
          </div>

          <div className="mt-12 border border-line bg-paper px-7 py-8">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">TOUJOURS INCLUS<Cur /></p>
            <ul className="mt-6 max-w-2xl space-y-3">
              {INCLUS.map((f) => (
                <li key={f} className="flex items-start gap-3 border-b border-line pb-3 text-[15px] last:border-b-0 last:pb-0">
                  <span className="mono text-brand">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mono mt-12 text-[11px] uppercase tracking-label text-ink-soft">
            0 % de commission Klubster<span className="text-brand">_</span>
          </p>
          <p className="mt-4 max-w-prose text-lg text-ink">
            Les cotisations arrivent directement sur le compte Stripe de votre association.
          </p>
          <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-soft">
            Klubster ne prélève aucune commission. Les frais de paiement (1,5 % + 0,25 €) sont facturés
            directement par Stripe. Premier mois offert, sans prélèvement. Changez d’offre ou résiliez à tout
            moment, depuis votre cockpit.
          </p>
        </div>
      </section>

      {/* LES TROIS QUESTIONS — juste après le prix, là où elles se posent.
          L'atelier à gauche : Klubster n'est pas qu'une affaire de gymnases. */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="relative min-h-[58vh] overflow-hidden md:min-h-[88vh]">
          <Parallax src="/09-atelier.jpg" alt="Une salle d’arts plastiques, tables et tabourets, lumière du matin." className="absolute inset-0" strength={0.08} />
        </div>
        <div className="flex items-center px-6 py-20 md:px-16 md:py-24">
          <Reveal className="max-w-md">
            <div className="border-t border-line">
              {OBJECTIONS.map(([question, reponse]) => (
                <div key={question} className="border-b border-line py-7">
                  <p className="text-xl font-medium tracking-[-0.01em]">{question}</p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{reponse}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* IV — UNE DEMI-HEURE (la promesse, racontée comme une expérience) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pt-24 pb-12 md:px-8 md:pt-36 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">IV</span> — UNE DEMI-HEURE<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Une demi-heure.<br />C’est tout.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Les bénévoles n’ont pas une demi-journée à consacrer à un nouveau logiciel.
              Alors tout est déjà prêt — il ne reste que l’essentiel.
            </p>
            <div className="mt-10 border-t border-line">
              {[
                ["01", "Créez votre association.", "Un nom, votre identité, vos couleurs."],
                ["02", "Ajoutez vos activités.", "Créneaux et tarifs, en quelques lignes."],
                ["03", "Ajustez votre page.", "Photos, présentation, FAQ — des chapitres prêts à l’emploi."],
                ["04", "Ouvrez les inscriptions.", "Votre site est en ligne. Les premiers dossiers peuvent arriver."],
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
            <p className="mono mt-12 text-lg font-normal leading-[1.2] tracking-[-0.02em] text-ink sm:text-2xl md:text-[32px]">
              Vous ne configurez pas<br />un logiciel.<br />Vous ouvrez votre association<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* V — SUR LE TERRAIN (fusion : terrain + fondateur + disciplines) */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex items-center px-6 py-20 md:px-16 md:py-24">
          <div className="max-w-md">
            <Reveal>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft"><span className="text-brand">V</span> — SUR LE TERRAIN<Cur /></p>
              <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[36px]">
                Je n’ai pas inventé Klubster. J’en avais besoin.
              </h2>
              <p className="mt-8 text-lg leading-relaxed text-ink-soft">
                Un mercredi soir, des documents manquaient. Des paiements attendaient encore.
                Le cours venait de commencer.
              </p>
              <p className="mt-5 text-lg leading-relaxed text-ink-soft">
                Je me suis demandé pourquoi des bénévoles passaient autant de temps devant des tableurs.
              </p>
              <p className="mt-5 text-lg leading-relaxed text-ink">Klubster est né de ce besoin.</p>
              <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">
                <span className="text-brand">●</span> Développé et utilisé chaque semaine à l’USM Boxe Anglaise
              </p>
              <p className="mono mt-4 text-[13px] tracking-wide text-ink">
                Mathieu Bourdieu — président de l’USM Boxe Anglaise<span className="text-brand">_</span>
              </p>
            </Reveal>
            <Reveal className="mt-12">
              <p className="mono text-[13px] leading-loose tracking-wide text-ink-soft">
                {DISCIPLINES.map((d, i) => (
                  <span key={d}>
                    {d}
                    {i < DISCIPLINES.length - 1 ? <span className="text-brand"> · </span> : null}
                  </span>
                ))}
              </p>
            </Reveal>
          </div>
        </div>
        <div className="relative min-h-[58vh] overflow-hidden md:min-h-[88vh]">
          <Parallax src="/02-silence.jpg" alt="Le bassin, immobile, avant l’ouverture." className="absolute inset-0" strength={0.08} />
        </div>
      </section>

      {/* SIGNATURE — le grand k_, une seule fois */}
      <section className="border-y border-line">
        <div className="flex flex-col items-center justify-center py-24 md:py-32">
          <span className="kb-float font-logo text-[110px] leading-none text-brand md:text-[190px]">k_</span>
          <span className="mono mt-5 text-[12px] uppercase tracking-label text-ink-soft">klubster.fr</span>
        </div>
      </section>

      {/* CTA FINAL — l'émotion, puis le geste */}
      <section className="relative min-h-[80vh] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.08} />
        <div className="absolute inset-0 bg-ink/60" />
        <div className="relative flex min-h-[80vh] items-center justify-center">
          <div className="px-6 py-24 text-center text-paper">
            <p className="mono mx-auto max-w-[720px] text-lg font-normal leading-[1.2] tracking-[-0.02em] sm:text-2xl md:text-[32px]">
              Quand l’association ouvre,<br />personne ne pense au logiciel.
            </p>
            <p className="mx-auto mt-8 max-w-prose text-lg text-paper/80">
              Les bénévoles pensent aux adhérents.<br />
              Et c’est exactement pour ça que Klubster existe<span className="cur">_</span>
            </p>
            <h2 className="mt-16 text-3xl font-medium leading-tight md:text-[40px]">
              Ouvrez la prochaine saison avec Klubster.
            </h2>
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
