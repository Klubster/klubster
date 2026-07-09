# Klubster — code de la page d'accueil (pour analyse design)

> **Contexte pour l'analyse.** Klubster est un SaaS pour associations (sportives et
> culturelles). Direction artistique **éditoriale « magazine-carnet »** (références Kinfolk,
> Monocle, Cereal). Stack : Next.js 14 (App Router), TypeScript, Tailwind CSS.
> Principes de DA : papier blanc cassé `#FCFCFA` + grain quasi imperceptible ; **0 arrondi
> partout** (`border-radius: 0`) ; typo **Inter** (corps) + **Space Mono** (labels/chiffres,
> curseur `_`) + **IBM Plex Mono** (logo) ; **vert de marque `#279B65` en accent ≤ 5 %** ;
> animations discrètes (une seule chose bouge à la fois), toutes compatibles
> `prefers-reduced-motion`.
>
> **Version actuelle.** Passe éditoriale de « respiration » : soustraction d'environ 20 % du
> contenu, suppression des numéros de chapitres (labels mono seuls), suppression des puces
> devant le cockpit + cockpit rétréci (~22 %), réduction du nombre de listes et de citations,
> et surtout **rupture du rythme d'espacement mécanique** (fini les marges régulières) au
> profit de silences irréguliers et de photos qui respirent seules.
>
> **Question posée :** analyse ce design (hiérarchie visuelle, rythme vertical, respiration,
> typographie, usage de la couleur, cohérence, accessibilité, points faibles, pistes
> concrètes). Reste dans l'esprit éditorial sobre — pas de suggestions « SaaS générique ».
> Objectif assumé : feuilleter un magazine, pas lire une documentation.

Les fichiers ci-dessous constituent le rendu réel de la home : la config des tokens
(`tailwind.config.ts`), le CSS global (`globals.css`), la page (`page.tsx`) et les 4
composants qu'elle utilise.

---

## 1. `tailwind.config.ts` — tokens couleur & typo

```ts
import type { Config } from "tailwindcss";

// DA Klubster — éditorial magazine-carnet.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "rgb(var(--k-ink) / <alpha-value>)", soft: "var(--k-ink-soft)", faint: "var(--k-ink-faint)" },
        brand: { DEFAULT: "#279B65", dark: "#1E7A4F" }, // vert ACCENT ≤5%
        paper: "rgb(var(--k-paper) / <alpha-value>)",
        surface: "var(--k-surface)",
        "bg-alt": "var(--k-bg-alt)",
        line: "var(--k-line)",
        success: "#279B65", warning: "#B8860B", danger: "#B23B3B", info: "#2D5B7A",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        logo: ["var(--font-logo)", "var(--font-mono)", "monospace"],
      },
      maxWidth: { prose: "62ch" },
      letterSpacing: { label: "0.18em" },
    },
  },
  plugins: [],
};
export default config;
```

---

## 2. `src/app/globals.css` — fondations DA + finition UI/UX

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "Space Mono", ui-monospace, monospace;
  --font-logo: "IBM Plex Mono", "Space Mono", monospace;

  --k-ink: 17 17 17;
  --k-ink-soft: #8C8C88;
  --k-ink-faint: #C2C2BD;
  --k-paper: 252 252 250;
  --k-bg-alt: #F5F5F3;
  --k-surface: #FFFFFF;
  --k-line: rgba(17,17,17,0.07);
}

html { -webkit-text-size-adjust: 100%; }

body {
  background-color: #FCFCFA;
  background-image: url("data:image/svg+xml,...grain fractalNoise opacity 0.035...");
  color: #111111;
  font-family: var(--font-sans);
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}

.mono { font-family: var(--font-mono); }
.tabular { font-variant-numeric: tabular-nums; }

/* Curseur signature : _ vert clignotant. */
@keyframes kblink { 0%,49%{opacity:1} 50%,100%{opacity:0} }
.cur { color: #279B65; font-family: var(--font-mono); }
@media (prefers-reduced-motion: no-preference) { .cur { animation: kblink 1.2s steps(1) infinite; } }

/* 0px partout : aucun arrondi. */
* { border-radius: 0 !important; }

/* Révélations au scroll — discrètes, additives. */
.kb-reveal { opacity: 0; transform: translateY(16px); transition: opacity .85s cubic-bezier(.22,.61,.36,1), transform .85s cubic-bezier(.22,.61,.36,1); }
.kb-reveal.kb-in { opacity: 1; transform: none; }
.kb-quote { opacity: 0; transform: translateY(10px); transition: opacity 1.05s ease, transform 1.05s ease; }
.kb-quote.kb-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .kb-reveal, .kb-quote { opacity: 1 !important; transform: none !important; transition: none !important; } }

/* Photos : respiration très lente (dérive imperceptible). */
.kb-breathe { transform: scale(1.08); }
@media (prefers-reduced-motion: no-preference) { .kb-breathe { animation: kbbreathe 24s ease-in-out infinite alternate; } }
@keyframes kbbreathe { from { transform: scale(1.08); } to { transform: scale(1.14); } }

/* Citations : apparition ligne par ligne (machine à écrire). */
.kb-cite-line { display: block; opacity: 0; transform: translateY(8px); transition: opacity .6s ease, transform .6s ease; }
.kb-cite-in .kb-cite-line { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .kb-cite-line { opacity: 1 !important; transform: none !important; transition: none !important; } }

/* Grand k_ : respiration imperceptible. */
@media (prefers-reduced-motion: no-preference) { .kb-float { animation: kbfloat 6s ease-in-out infinite; } }
@keyframes kbfloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-2px) scale(1.006); } }

/* ——— Raffinements UI/UX (finition, accessibilité, typographie) ——— */
::selection { background: rgba(39,155,101,0.16); color: #111; }
@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth; } }
[id] { scroll-margin-top: 2.5rem; }
:focus-visible { outline: 2px solid #279B65; outline-offset: 3px; }
:focus:not(:focus-visible) { outline: none; }
h1, h2, h3 { text-wrap: balance; }
p { text-wrap: pretty; }
a, button { transition: color .22s ease, background-color .22s ease, opacity .22s ease, border-color .22s ease; }

/* Soulignement animé des liens de navigation. */
.link-underline { position: relative; }
.link-underline::after { content: ""; position: absolute; left: 0; bottom: -3px; height: 1px; width: 100%; background: currentColor; transform: scaleX(0); transform-origin: right; transition: transform .3s cubic-bezier(.22,.61,.36,1); }
.link-underline:hover::after { transform: scaleX(1); transform-origin: left; }
```

---

## 3. `src/app/page.tsx` — la page d'accueil (version « respiration »)

> Le rythme vertical est volontairement **irrégulier** : des `<div aria-hidden>` de hauteurs
> variables (`h-16` → `h-24` → `h-52` → `h-40`…) créent des silences inégaux entre les
> chapitres, et deux photos plein cadre (le ballon, la fin de saison) respirent seules,
> entourées de vide.

```tsx
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
function DoublePage({ src, alt, kicker, titre, children, flip }: {
  src: string; alt: string; kicker: string; titre: string; children: React.ReactNode; flip?: boolean;
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

const DISCIPLINES = ["Sports de combat", "Danse", "Arts martiaux", "Musique", "Natation", "Théâtre", "Activités culturelles", "Gymnastique", "Sports collectifs", "Loisirs"];

const SAISON: [string, string][] = [
  ["SEPTEMBRE", "Les portes rouvrent. Le site du club est déjà en ligne."],
  ["DÉCEMBRE", "Les dossiers sont complets.\nPersonne n’a couru après un papier."],
  ["JUIN", "La saison se termine. On connaît déjà la suivante."],
];

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

      {/* HERO */}
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

      {/* Résumé descriptif */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-12 md:px-8 md:py-16">
          <p className="max-w-prose text-ink md:text-lg">
            Inscriptions, paiements, communication, site web : tout ce dont un club a besoin, dans un seul outil <span className="text-ink-soft">pensé pour les bénévoles.</span>
          </p>
        </div>
      </section>

      {/* — grand silence — */}
      <div className="h-16 md:h-32" aria-hidden />

      {/* POURQUOI */}
      <DoublePage src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." kicker="POURQUOI" titre="Un club n’est pas une base de données.">
        <p>C’est une salle qu’on ouvre le soir.<br />Des bénévoles qui arrivent avant tout le monde.<br />Qui repartent après tout le monde.</p>
        <p>Klubster s’occupe du reste.</p>
      </DoublePage>

      {/* — très grand silence — */}
      <div className="h-24 md:h-52" aria-hidden />

      {/* SUR LE TERRAIN (texte à gauche, photo à droite) — la scène seule, sans la liste de notes */}
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

      {/* — grand silence — */}
      <div className="h-24 md:h-48" aria-hidden />

      {/* UNE DEMI-HEURE */}
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

      {/* — grand silence — */}
      <div className="h-20 md:h-40" aria-hidden />

      {/* AUJOURD'HUI_ (le produit) — intro très courte, le cockpit raconte le reste, rétréci et centré */}
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
          <Reveal className="mx-auto mt-20 max-w-4xl md:mt-28">
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

      {/* QUI FAIT KLUBSTER (note du fondateur) */}
      <section>
        <div className="mx-auto max-w-2xl px-6 pb-16 md:px-8 md:pb-24">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">QUI FAIT KLUBSTER<span className="text-brand">_</span></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Klubster est né un mercredi soir.
            </h2>
            <p className="mt-8 text-lg leading-relaxed text-ink-soft">
              Je ne l’ai pas créé parce que j’avais envie de faire un logiciel. Je l’ai créé parce que tous les mercredis soirs se ressemblaient : les mêmes certificats, les mêmes chèques, les mêmes relances.
            </p>
            <p className="mt-5 text-lg leading-relaxed text-ink-soft">
              Un soir, je me suis dit : ce n’est pas normal qu’un bénévole passe plus de temps devant un tableur que sur le terrain. Klubster est né ce soir-là.
            </p>
            <p className="mono mt-8 text-[13px] tracking-wide text-ink">
              Mathieu Bourdieu — président-fondateur, USM Boxe Anglaise<span className="text-brand">_</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* — grand silence — */}
      <div className="h-20 md:h-40" aria-hidden />

      {/* LES DISCIPLINES */}
      <section id="disciplines">
        <div className="mx-auto max-w-3xl px-6 pb-16 text-center md:px-8 md:pb-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LES DISCIPLINES<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Peu importe votre association.
            </h2>
            <p className="mx-auto mt-6 max-w-prose text-lg text-ink-soft">Klubster s’adapte au fonctionnement de votre association.</p>
            <p className="mono mt-8 text-[13px] leading-loose tracking-wide text-ink-soft">
              {DISCIPLINES.map((d, i) => (
                <span key={d}>{d}{i < DISCIPLINES.length - 1 ? <span className="text-brand"> · </span> : null}</span>
              ))}
            </p>
          </Reveal>
        </div>
      </section>

      <Citation lines={["Le meilleur logiciel", "est celui qu’on oublie"]} />

      {/* la saison (respire seule) */}
      <Chapitre src="/06-saison.jpg" alt="La lumière d’une fin de saison, à travers les baies." />

      {/* — silence — */}
      <div className="h-16 md:h-28" aria-hidden />

      {/* UNE SAISON */}
      <section>
        <div className="mx-auto max-w-3xl px-6 pb-16 md:px-8 md:pb-24">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">UNE SAISON<Cur /></p>
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

      {/* — grand silence — */}
      <div className="h-20 md:h-36" aria-hidden />

      {/* TARIFS */}
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

      {/* SIGNATURE — le grand k_ */}
      <section className="border-y border-line">
        <div className="flex flex-col items-center justify-center py-24 md:py-36">
          <span className="kb-float font-logo text-[110px] leading-none text-brand md:text-[190px]">k_</span>
          <span className="mono mt-5 text-[12px] uppercase tracking-label text-ink-soft">klubster.fr</span>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative h-[80vh] min-h-[460px] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.08} />
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

      {/* FOOTER */}
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
```

---

## 4. Composants utilisés par la home

### `src/components/site/Parallax.tsx`
```tsx
"use client";
import { useEffect, useRef } from "react";

// Parallaxe douce + respiration lente de l'image (.kb-breathe). Désactivée sur mobile
// et si prefers-reduced-motion. Le translate (parallaxe) est porté par un conteneur,
// le scale (respiration) par l'image : les deux transforms se composent sans se gêner.
export default function Parallax({ src, alt, className = "", strength = 0.1 }: {
  src: string; alt: string; className?: string; strength?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 768px)").matches) return; // pas de parallaxe sur mobile
    let raf = 0;
    const update = () => {
      raf = 0;
      const w = wrap.current, el = inner.current;
      if (!w || !el) return;
      const r = w.getBoundingClientRect();
      const center = r.top + r.height / 2 - window.innerHeight / 2;
      el.style.transform = `translate3d(0, ${(-center * strength).toFixed(1)}px, 0)`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [strength]);
  return (
    <div ref={wrap} className={`overflow-hidden ${className}`}>
      <div ref={inner} className="absolute inset-0 will-change-transform">
        <img src={src} alt={alt} className="kb-breathe absolute inset-0 h-full w-full object-cover" />
      </div>
    </div>
  );
}
```

### `src/components/site/Reveal.tsx`
```tsx
"use client";
import { useEffect, useRef, useState } from "react";

// Révélation au scroll : fondu + léger glissement. Respecte prefers-reduced-motion.
// Se déclenche avant l'entrée à l'écran (rootMargin) : jamais de contenu masqué.
export default function Reveal({ children, className = "", delay = 0, kind = "block" }: {
  children: React.ReactNode; className?: string; delay?: number; kind?: "block" | "quote";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px 25% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const base = kind === "quote" ? "kb-quote" : "kb-reveal";
  return <div ref={ref} className={`${base} ${shown ? "kb-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}
```

### `src/components/site/Citation.tsx`
```tsx
"use client";
import { useEffect, useRef, useState } from "react";

// Citation-manifeste : Space Mono, _ vert en fin. Lignes dessinées une par une (machine à écrire).
export default function Citation({ lines, topTight }: { lines: string[]; topTight?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    const io = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } }, { threshold: 0, rootMargin: "0px 0px -10% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const pt = topTight ? "pt-16 md:pt-24" : "pt-32 md:pt-48";
  return (
    <section>
      <div ref={ref} className={`mx-auto max-w-[720px] px-6 pb-32 text-center md:px-8 md:pb-48 ${pt}`}>
        <p className={`mono text-[26px] font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[40px] ${shown ? "kb-cite-in" : ""}`}>
          {lines.map((line, i) => (
            <span key={i} className="kb-cite-line" style={{ transitionDelay: `${i * 180}ms` }}>
              {line}{i === lines.length - 1 ? <span className="cur">_</span> : null}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
```

### `src/components/site/CockpitPreview.tsx`
```tsx
// Aperçu fidèle du vrai « Aujourd'hui_ » (données de démonstration, lexique et layout réels).
const NAV = ["AUJOURD’HUI", "INSCRIPTIONS", "PRÉSENCES", "PAIEMENTS", "MESSAGES", "ACTUALITÉ", "SITE"];
const POINTS: { ok?: boolean; texte: string }[] = [
  { ok: true, texte: "3 nouvelles inscriptions cette semaine" },
  { ok: true, texte: "Tous les paiements sont à jour" },
  { ok: true, texte: "Aucun dossier en attente" },
  { texte: "Ce soir : Boxe loisirs 18:30–20:00 · 18 inscrits" },
];

export default function CockpitPreview() {
  return (
    <div className="overflow-hidden border border-line bg-paper">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">k<span className="text-brand">_</span></span>
        <span className="mono text-[10px] uppercase tracking-label text-ink-faint">klubster.fr/mon-club/cockpit</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-[128px_1fr] md:grid-cols-[168px_1fr]">
        <nav className="hidden bg-ink px-3 py-4 text-paper sm:block md:px-4">
          {NAV.map((item, i) => (
            <div key={item} className={`mono py-[6px] text-[11px] ${i === 0 ? "font-bold text-paper" : "text-paper/45"}`}>
              {String(i + 1).padStart(2, "0")} {item}{i === 0 ? <span className="text-brand">_</span> : null}
            </div>
          ))}
        </nav>
        <div className="p-4 md:p-6">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">
            BONSOIR, MATHIEU · MERCREDI 4 SEPTEMBRE<span className="text-brand">_</span>
          </div>
          <p className="mt-3 text-[22px] font-medium leading-tight tracking-[-0.01em] md:text-[26px]">Le club est prêt.</p>
          <p className="mt-1.5 text-[13px] text-ink-soft">Tout est à jour pour le cours de ce soir.</p>
          <div className="mt-4 border border-line">
            <div className="mono border-b border-line px-3 py-2 text-[9px] uppercase tracking-label text-ink-soft">
              LE CLUB AUJOURD’HUI<span className="text-brand">_</span>
            </div>
            {POINTS.map((l) => (
              <div key={l.texte} className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0">
                <span className={`mono text-[11px] ${l.ok ? "text-brand" : "text-ink-faint"}`}>{l.ok ? "✓" : "●"}</span>
                <span className="flex-1 text-[12px]">{l.texte}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-px border border-line bg-line">
            {[["0","DOSSIER À TERMINER"],["0","COTISATION À RELANCER"],["3","INSCRIPTIONS · 7 JOURS"]].map(([n, label]) => (
              <div key={label} className="bg-paper px-3 py-3">
                <div className="mono text-[16px] font-bold tracking-tight md:text-[18px]">{n}</div>
                <div className="mono mt-0.5 text-[8px] uppercase tracking-label text-ink-faint">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```
