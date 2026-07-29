import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import MenuMobile from "@/components/site/MenuMobile";
import SiteFooter from "@/components/site/SiteFooter";
// ChatSite, et non ChatSiteDiffere : le montage différé appartient au chantier
// performance encore non commité. À rebasculer quand celui-ci sera fusionné.
import ChatSite from "@/components/site/ChatSite";
import { USM_ADHERENTS, USM_COURS, USM_RELEVE } from "@/lib/preuves";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

const TITRE = "Comment l’USM Boxe prépare sa rentrée avec Klubster";
const DESCRIPTION = `Découvrez comment l’USM Boxe Anglaise de Montauban prépare les inscriptions, les cours et le suivi de ses ${USM_ADHERENTS} adhérents avec Klubster.`;

/**
 * L'étude de cas du premier club — et le seul actif SEO durable du lancement.
 *
 * Contrairement à /clubs-fondateurs (page de campagne, noindex), celle-ci est indexable :
 * son contenu est propre, daté, non dupliqué, et répond à une intention réelle
 * (« logiciel gestion club de boxe », « passer d'Excel à un logiciel d'association »).
 *
 * RÈGLE DE VÉRACITÉ — chaque chiffre ci-dessous vient de la base de production
 * (relevé du 29/07/2026) et non d'une estimation :
 *   313 adhérents · 6 cours · 3 actualités publiées · site public en ligne.
 * Les gains (temps gagné, impayés évités) ne sont PAS affirmés : la saison 2026-2027
 * n'a pas commencé, et les règlements de l'USM ne sont pas encore saisis dans Klubster.
 * Ne pas ajouter de pourcentage ici sans mesure réelle.
 */
export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/cas-clients/usm-boxe-anglaise` },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: `${SITE}/cas-clients/usm-boxe-anglaise`,
    siteName: "Klubster",
    locale: "fr_FR",
    type: "article",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Klubster — Toute votre association, au même endroit." }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

function Cur() {
  return <span className="cur">_</span>;
}

const IDENTITE: [string, string][] = [
  ["Association", "USM Boxe Anglaise"],
  ["Ville", "Montauban (82)"],
  ["Adhérents", String(USM_ADHERENTS)],
  ["Cours", String(USM_COURS)],
  ["Bénévoles au bureau", "Une poignée"],
  ["Sur Klubster depuis", "Juin 2026"],
];

const COURS = ["Aéroboxe", "Baby Boxe", "Boxe Éducative", "Loisirs", "Training Boxe", "Amateurs"];

// Le « avant » — la situation d'origine, décrite par le président lui-même.
const AVANT = [
  ["Le fichier des adhérents", "Un tableur, recopié d’une saison sur l’autre, avec des colonnes ajoutées au fil des besoins et des lignes que plus personne n’osait supprimer."],
  ["Les dossiers", "Des certificats médicaux reçus par email, par SMS, ou apportés en main propre. Réclamés une fois en septembre, rarement relancés ensuite."],
  ["Les paiements en plusieurs fois", "Des chèques gardés dans une pochette, encaissés à des dates convenues à l’oral. Savoir qui avait réglé quoi demandait de tout ressortir."],
  ["Le contrôle à l’entraînement", "Aucun. Un adhérent qui s’entraînait sans avoir réglé ou sans dossier complet n’était repéré qu’en fin de saison — ou pas du tout."],
];

// Le « avec » — uniquement ce qui est réellement en place, vérifiable en production.
const AVEC = [
  [`${USM_ADHERENTS} adhérents repris depuis le tableur`, "Le fichier existant a été importé, colonne par colonne, sans ressaisie. C’est ce même import qui est proposé aux clubs fondateurs."],
  ["Six cours configurés", "Aéroboxe, Baby Boxe, Boxe Éducative, Loisirs, Training Boxe, Amateurs — chacun avec ses créneaux, son tarif et sa capacité."],
  ["Un formulaire d’inscription préparé", "Le club choisit ce qu’il demande, ce qui est obligatoire et quelles pièces sont à fournir. Le dossier se constitue au moment de l’inscription, pas après."],
  ["Le site public du club", "Créé en même temps que l’association, à l’adresse klubster.fr/usmboxe, avec ses actualités et ses cours. Aucun site à faire développer à côté."],
  ["Le scanner disponible pour les entraînements", "Chaque adhérent retrouve son QR code personnel dans son Espace adhérent. À l’entraînement, un bénévole le scanne avec son propre téléphone depuis Klubster : l’état du règlement et du dossier s’affiche immédiatement. Aucun lecteur ni carte plastique ne sont nécessaires."],
];

// Ce qui sera mesuré — et à quel moment. C'est cette liste qui remplacera un jour les
// promesses génériques par des chiffres.
const A_MESURER = [
  "Le nombre de dossiers encore incomplets un mois après la rentrée",
  "Le délai moyen entre l’inscription et le dossier complet",
  "Le montant des cotisations non réglées au 31 décembre",
  "Le temps passé par le bureau sur l’administratif, sur une semaine type",
  "Le nombre d’adhérents repérés au scan comme non à jour",
];

const LIENS_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/usmboxe", label: "Voir le club" },
];

export default function CasUsmBoxe() {
  return (
    <main className="text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">
            k<Cur />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {LIENS_NAV.map((l) => (
              <Link key={l.href} href={l.href} className="mono text-[12px] text-ink-soft hover:text-ink">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/connexion" className="mono hidden text-[11px] uppercase tracking-label text-ink-soft hover:text-ink md:block">
              ESPACE PRÉSIDENT
            </Link>
            <Link href="/creer" className="mono hidden bg-brand px-5 py-2.5 text-[12px] uppercase tracking-wide text-white hover:bg-brand-dark md:block">
              CRÉER MON ASSOCIATION
            </Link>
            <MenuMobile
              ton="sombre"
              liens={[
                ...LIENS_NAV,
                { href: "/connexion", label: "Espace président" },
                { href: "/creer", label: "Créer mon association" },
              ]}
            />
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto max-w-3xl px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-16">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              LE PREMIER CLUB<Cur />
            </p>
            <h1 className="mt-7 text-[30px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-4xl sm:leading-[1.12] md:text-[48px] md:leading-[1.1]">
              Le club où Klubster est né.
            </h1>
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink-soft md:text-xl">
              L’USM Boxe Anglaise prépare sa saison 2026-2027 avec Klubster. Voici ce qui est
              déjà en place, et ce qui sera mesuré pendant la rentrée.
            </p>
          </Reveal>

          <Reveal className="mt-12">
            <div className="grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
              {IDENTITE.map(([label, valeur]) => (
                <div key={label} className="bg-paper px-5 py-5">
                  <div className="mono text-[10px] uppercase tracking-label text-ink-faint">{label}</div>
                  <div className="mt-2 text-[15px] font-medium">{valeur}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-8">
            <p className="mono text-[11px] leading-relaxed text-ink-faint">
              Relevé le {USM_RELEVE} dans Klubster. Cette page est mise à jour à mesure que
              la saison avance.
            </p>
          </Reveal>
        </div>
      </section>

      {/* AVANT */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AVANT<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Quatre endroits, aucune vue d’ensemble.
            </h2>
          </Reveal>

          <div className="mt-12 border-t border-line">
            {AVANT.map(([titre, texte], i) => (
              <div key={titre} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-7 md:grid-cols-[64px_1fr]">
                <span className="mono pt-1 text-[13px] text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-xl font-medium tracking-[-0.01em]">{titre}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{texte}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AVEC */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AVEC KLUBSTER<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Ce qui est en place aujourd’hui.
            </h2>
          </Reveal>

          <div className="mt-12 border-t border-line">
            {AVEC.map(([titre, texte]) => (
              <div key={titre} className="flex items-start gap-4 border-b border-line py-7">
                <span className="mono pt-1.5 text-[13px] text-brand">✓</span>
                <div>
                  <p className="text-xl font-medium tracking-[-0.01em]">{titre}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{texte}</p>
                </div>
              </div>
            ))}
          </div>

          <Reveal className="mt-12">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LES SIX COURS<Cur /></p>
            <p className="mono mt-4 text-[13px] leading-loose tracking-wide text-ink-soft">
              {COURS.map((c, i) => (
                <span key={c}>
                  {c}
                  {i < COURS.length - 1 ? <span className="text-brand"> · </span> : null}
                </span>
              ))}
            </p>
            <Link href="/usmboxe" className="mono mt-6 inline-block text-[13px] text-brand-dark hover:underline">
              VOIR LE SITE PUBLIC DU CLUB →
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CE QUI SERA MESURÉ — un encadré compact, pas une section défensive. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-20">
          <Reveal>
            <div className="border border-line px-7 py-7">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                CE QUE NOUS MESURERONS CETTE SAISON<Cur />
              </p>
              <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                Pendant la saison 2026-2027, nous suivrons le nombre de dossiers incomplets,
                les cotisations restant à régler, le temps consacré à l’administration et les
                contrôles réalisés à l’entraînement. Les résultats seront ajoutés ici au fil
                de la saison.
              </p>
              <ul className="mt-6 border-t border-line">
                {A_MESURER.map((m) => (
                  <li key={m} className="flex items-start gap-3 border-b border-line py-3 text-[14px] last:border-b-0">
                    <span className="mono pt-1 text-[11px] text-ink-faint">●</span>
                    <span className="text-ink-soft">{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CE QU'UN AUTRE CLUB PEUT EN RETENIR */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              CE QU’UN AUTRE CLUB PEUT EN RETENIR<Cur />
            </p>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
              <p>
                La reprise d’un fichier de {USM_ADHERENTS} lignes n’a pas nécessité de ressaisie, ni de
                mise au format préalable&nbsp;: c’est le tableur du club qui a été importé,
                tel qu’il existait.
              </p>
              <p>
                Un club de cette taille n’a pas besoin de plus de fonctions&nbsp;: il a besoin
                que celles qu’il utilise soient au même endroit.
              </p>
              <p className="text-ink">
                Si votre club ressemble à celui-là, l’import de votre fichier fait partie de
                l’offre réservée aux quinze premiers clubs.
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/clubs-fondateurs"
                className="mono bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90"
              >
                DEVENIR CLUB FONDATEUR →
              </Link>
              <Link href="/tarifs" className="mono text-[12px] uppercase tracking-label text-ink-soft hover:text-ink">
                Voir les tarifs →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />

      <ChatSite />
    </main>
  );
}
