import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import CockpitPreview from "@/components/site/CockpitPreview";
import Citation from "@/components/site/Citation";

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
      <div className={`relative min-h-[62vh] overflow-hidden md:min-h-[92vh] ${flip ? "md:order-2" : ""}`}>
        <Parallax src={src} alt={alt} className="absolute inset-0" strength={0.08} />
      </div>
      <div className="flex items-center px-6 py-24 md:px-16 md:py-0">
        <Reveal className="max-w-md">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">{kicker}<Cur /></p>
          <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">{titre}</h2>
          <div className="mt-6 space-y-4 text-lg text-ink-soft">{children}</div>
        </Reveal>
      </div>
    </section>
  );
}

// Un seul produit. Le prix suit la taille du club. Toutes les fonctionnalités incluses partout.
const PALIERS: { capacite: string; prix: string }[] = [
  { capacite: "Jusqu’à 300 adhérents", prix: "9" },
  { capacite: "301 à 500 adhérents", prix: "19" },
  { capacite: "Plus de 500 adhérents", prix: "29" },
];

// Racontées en résultats, jamais en technologie. Six suffisent.
const INCLUS = [
  "Le site de votre club, en ligne dès le premier soir",
  "Les inscriptions se remplissent toutes seules — mineurs, cours, pièces : le formulaire s’adapte",
  "Les cotisations arrivent directement sur le compte du club — 0 % de commission",
  "L’appel se fait en scannant la carte d’adhérent",
  "Aujourd’hui_ : l’état de votre club en trois secondes",
  "Toutes les futures fonctionnalités, sans supplément",
];

export default function Home() {
  return (
    <main className="text-ink">
      {/* NAV */}
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold text-paper drop-shadow">k<Cur /></Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-paper/80 md:flex">
            <a href="#cockpit" className="link-underline hover:text-paper">Le cockpit</a>
            <a href="#disciplines" className="link-underline hover:text-paper">Disciplines</a>
            <a href="#tarifs" className="link-underline hover:text-paper">Tarifs</a>
            <Link href="/usmboxe" className="link-underline hover:text-paper">Un club</Link>
          </nav>
          <Link href="/creer" className="mono bg-brand px-4 py-2 text-[12px] text-white hover:opacity-90">
            CRÉER MON ASSOCIATION
          </Link>
        </div>
      </header>

      {/* HERO — clarté d'abord (H1), puis le slogan en émotion, puis la signature */}
      <section className="relative h-screen min-h-[600px] w-full overflow-hidden">
        <Parallax src="/01-hero.jpg" alt="Une salle de sport vide, au lever du jour." className="absolute inset-0" strength={0.07} />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/35 to-ink/15" />
        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto max-w-6xl px-6 pb-16 md:px-8 md:pb-20">
            <p className="mono text-[11px] uppercase tracking-label text-paper/75">KLUBSTER<Cur /></p>
            <h1 className="mt-5 max-w-[20ch] text-4xl font-medium leading-[1.04] tracking-[-0.02em] text-paper md:text-[58px]">
              Toute votre association,<br />au même endroit.
            </h1>
            <p className="mt-6 max-w-prose text-xl font-medium text-paper md:text-2xl">Personne ne devient bénévole pour remplir des formulaires.</p>
            <p className="mono mt-4 text-[12px] uppercase tracking-wide text-paper/70">
              Prêt en moins de 30 minutes<span className="text-brand">_</span>
            </p>
          </div>
        </div>
      </section>

      {/* — le hero bascule directement sur la première photo — */}
      <div className="h-8 md:h-20" aria-hidden />

      {/* POURQUOI (double-page) */}
      <DoublePage src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." kicker="POURQUOI" titre="Un club n’est pas une base de données.">
        <p>C’est une salle qu’on ouvre le soir.<br />Des bénévoles qui arrivent avant tout le monde.<br />Qui repartent après tout le monde.</p>
        <p>Klubster s’occupe du reste.</p>
      </DoublePage>

      {/* — très grand silence — */}
      <div className="h-24 md:h-52" aria-hidden />

      {/* SUR LE TERRAIN (texte à gauche, photo à droite) — la scène seule */}
      <section className="grid grid-cols-1 md:grid-cols-2">
        <div className="flex items-center px-6 py-24 md:px-16 md:py-0">
          <Reveal className="max-w-md">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SUR LE TERRAIN<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[36px]">
              Chaque fonctionnalité commence de la même façon.
            </h2>
            <p className="mt-7 text-lg leading-relaxed text-ink">Un mercredi soir.<br />Un parent cherche son certificat.<br />Une cotisation manque.<br />Un dossier est incomplet.</p>
            <p className="mt-5 text-lg text-ink-soft">On rentre. On corrige. Puis on construit.</p>
            <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">
              <span className="text-brand">●</span> Développé et utilisé chaque semaine à l’USM Boxe
            </p>
          </Reveal>
        </div>
        <div className="relative min-h-[62vh] overflow-hidden md:min-h-[92vh]">
          <Parallax src="/02-silence.jpg" alt="Le bassin, immobile, avant l’ouverture." className="absolute inset-0" strength={0.08} />
        </div>
      </section>

      {/* — silence — */}
      <div className="h-16 md:h-28" aria-hidden />

      {/* l’objet — le ballon (respire seul) */}
      <Chapitre src="/04-objet.jpg" alt="Un ballon posé sur le parquet." h="h-[64vh] md:h-[84vh]" />

      {/* — très grand silence (≈200px) — */}
      <div className="h-28 md:h-56" aria-hidden />

      {/* UNE DEMI-HEURE (la promesse, racontée comme une expérience) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pb-16 md:px-8 md:pb-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">UNE DEMI-HEURE<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Une demi-heure.<br />Pas une demi-journée.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              À 18 h 30, les adhérents arrivent. Personne n’apprend un logiciel à ce moment-là. Alors Klubster est prêt avant vous.
            </p>
            <div className="mt-12 border-t border-line">
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
            <p className="mono mt-14 text-2xl font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[32px]">
              Vous ne configurez pas<br />un logiciel.<br />Vous ouvrez votre club<span className="cur">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* — très grand silence (≈200px) — */}
      <div className="h-28 md:h-56" aria-hidden />

      {/* AUJOURD'HUI_ (le produit) — intro très courte, le cockpit comme une planche de magazine */}
      <section id="cockpit">
        <div className="mx-auto max-w-5xl px-6 pb-16 md:px-8 md:pb-28">
          <Reveal className="mx-auto max-w-2xl text-center">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AUJOURD’HUI<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Le club ouvre dans quinze minutes.
            </h2>
            <p className="mt-6 text-lg text-ink-soft">
              Vous ouvrez Klubster. Le club est prêt.
            </p>
          </Reveal>
          <Reveal className="mx-auto mt-24 max-w-4xl md:mt-32">
            <CockpitPreview />
          </Reveal>
        </div>
      </section>

      {/* — silence — */}
      <div className="h-8 md:h-16" aria-hidden />

      {/* QUAND LE CLUB OUVRE (respiration éditoriale, whitespace, aucun encadré) */}
      <section>
        <div className="mx-auto max-w-3xl px-6 py-40 text-center md:px-8 md:py-64">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">QUAND LE CLUB OUVRE<Cur /></p>
            <p className="mx-auto mt-16 max-w-2xl text-2xl font-medium leading-[1.7] tracking-[-0.01em] text-ink md:text-[30px] md:leading-[1.75]">
              Quand le club ouvre,<br />
              personne ne pense au logiciel.<br />
              <span className="text-ink-soft">Les bénévoles pensent aux adhérents.</span><br />
              <span className="text-ink-soft">Les entraîneurs pensent au cours.</span><br />
              <span className="text-ink-soft">Les parents pensent à leurs enfants.</span><br />
              C’est exactement pour ça que Klubster existe.
            </p>
          </Reveal>
        </div>
      </section>

      {/* QUI FAIT KLUBSTER (une scène, pas un parcours) */}
      <section>
        <div className="mx-auto max-w-2xl px-6 pb-16 md:px-8 md:pb-24">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">QUI FAIT KLUBSTER<span className="text-brand">_</span></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Klubster est né un mercredi soir.
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-ink-soft">
              Vingt-deux heures. La salle est vide, les néons encore allumés. Sur une table, une pile de certificats, des chèques agrafés, une liste de relances à faire.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              La même pile que le mercredi d’avant. Klubster est né devant cette table — pour qu’un bénévole ne passe plus ses soirs sur un tableur.
            </p>
            <p className="mono mt-8 text-[13px] tracking-wide text-ink">
              Mathieu Bourdieu — président-fondateur, USM Boxe Anglaise<span className="text-brand">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* — grand silence — */}
      <div className="h-20 md:h-40" aria-hidden />

      {/* Pour qui — une respiration, pas un chapitre (l'ancre disciplines reste) */}
      <section id="disciplines">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center md:px-8 md:py-24">
          <Reveal>
            <p className="text-2xl font-medium leading-[1.5] tracking-[-0.01em] text-ink md:text-[30px] md:leading-[1.6]">
              Pour le sport.<br />
              Pour la culture.<br />
              <span className="text-ink-soft">Pour toutes les associations.</span>
            </p>
          </Reveal>
        </div>
      </section>

      <Citation topTight lines={["Le meilleur logiciel", "est celui qu’on oublie"]} />

      {/* la saison (respire seule) */}
      <Chapitre src="/06-saison.jpg" alt="La lumière d’une fin de saison, à travers les baies." />

      {/* une saison — devenue une simple citation */}
      <Citation lines={["La saison se termine.", "On connaît déjà la suivante."]} />

      {/* TARIFS : tout est déjà inclus, le prix suit la taille du club */}
      <section id="tarifs">
        <div className="mx-auto max-w-5xl px-6 pb-16 md:px-8 md:pb-32">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">TARIFS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">Tout est déjà inclus.</h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Pas de version Pro. Pas d’options. Pas de modules.<br />
              Le prix suit simplement la taille de votre club.
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
          <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
            Changez d’offre à tout moment. Aucun engagement. Les paiements Stripe (1,5 % + 0,25 €) sont facturés directement par Stripe.
          </p>
        </div>
      </section>

      {/* SIGNATURE — le grand k_, une seule fois */}
      <section className="border-y border-line">
        <div className="flex flex-col items-center justify-center py-24 md:py-36">
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
            <h2 className="text-3xl font-medium leading-tight md:text-[40px]">Le prochain mercredi soir<br />commence ici.</h2>
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
