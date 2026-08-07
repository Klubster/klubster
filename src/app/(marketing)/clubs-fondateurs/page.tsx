import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import MenuMobile from "@/components/site/MenuMobile";
import SiteFooter from "@/components/site/SiteFooter";
// ChatSite, et non ChatSiteDiffere : le montage différé appartient au chantier
// performance encore non commité. À rebasculer quand celui-ci sera fusionné.
import ChatSite from "@/components/site/ChatSite";
import { EMAIL_CONTACT, TEL_AFFICHE, TEL_LIEN } from "@/components/site/SiteFooter";
import { USM_ADHERENTS } from "@/lib/preuves";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

const TITRE = "Clubs fondateurs — Klubster";
const DESCRIPTION =
  "Les quinze premiers clubs sont accompagnés personnellement : import du fichier d’adhérents, mise en route, trois mois offerts au lieu d’un. Sans engagement.";

/**
 * Page d'atterrissage de la campagne cold email.
 *
 * Cinq sections, pas une de plus : hero, mécanisme, offre, preuve, tarifs + contact.
 * Elle n'a pas à rejouer la home — le problème, les objections détaillées et le
 * manifeste vivent déjà sur / et /tarifs, et les répéter ici allongeait la page sans
 * rien ajouter à la décision.
 *
 * NOINDEX, mais suivie : page de campagne, datée, dont les paliers de prix reprennent
 * /tarifs. Indexée, elle entrerait en concurrence avec eux pour un contenu plus faible
 * et survivrait à l'offre qu'elle annonce. L'actif SEO du lancement, c'est
 * /cas-clients/usm-boxe-anglaise, qui lui est indexable.
 */
export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  robots: { index: false, follow: true },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: `${SITE}/clubs-fondateurs`,
    siteName: "Klubster",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Klubster — Toute votre association, au même endroit." }],
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

function Cur() {
  return <span className="cur">_</span>;
}

const PALIERS: { capacite: string; prix: string }[] = [
  { capacite: "Jusqu’à 300 adhérents", prix: "9" },
  { capacite: "301 à 500 adhérents", prix: "19" },
  { capacite: "Plus de 500 adhérents", prix: "29" },
];

// Ce que reçoit un club fondateur, et rien d'autre.
const FONDATEUR: [string, string][] = [
  ["Votre fichier repris par nos soins", "Vous envoyez votre tableur tel qu’il est. Nous l’importons, colonne par colonne, et vous validez le résultat avant qu’il soit enregistré."],
  ["Une mise en route accompagnée", "Vos cours, vos tarifs, votre formulaire d’inscription et votre page publique — configurés avec vous."],
  ["Trois premiers mois offerts", "Au lieu d’un. Sans carte bancaire, sans prélèvement, sans engagement."],
  ["Une ligne directe", "Depuis votre cockpit, vous écrivez au créateur de Klubster. C’est lui qui répond."],
];

// Trois réponses, à hauteur du CTA final. Les objections détaillées vivent sur /tarifs.
const RASSURANCES = [
  "Import de votre fichier inclus.",
  "Paiements par chèque, espèces ou en ligne.",
  "Données exportables et résiliation sans engagement.",
];

// Le parcours réel du contrôle, en trois étapes. Ni carte plastique, ni lecteur, ni
// wallet : le QR code vit dans l'Espace adhérent, sur le téléphone de l'adhérent.
const ETAPES_SCAN: [string, string][] = [
  ["01", "L’adhérent affiche son QR code"],
  ["02", "Le bénévole le scanne avec son téléphone"],
  ["03", "Klubster affiche ce qui est à jour et ce qui manque"],
];

/**
 * Reconstruction FIDÈLE de cockpit/scanner (Scanner.tsx). Cet écran n'affiche que deux
 * pastilles : RÈGLEMENT (« À jour » / « Non réglé ») et DOSSIER (« Complet » /
 * « N pièce(s) manquante(s) »).
 *
 * NE RIEN Y AJOUTER qui n'existe pas dans le produit : pas de statut « Inscription » ou
 * « Participation », pas de montant restant, pas de nom de pièce, pas de bouton de
 * relance. Toute évolution ici doit d'abord exister dans Scanner.tsx.
 */
function EtatAdherent() {
  return (
    <div className="max-w-md border border-line bg-paper">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
        <span className="font-logo text-[13px] font-semibold">
          k<span className="text-brand">_</span>
        </span>
        <span className="mono truncate text-[10px] uppercase tracking-label text-ink-faint">
          klubster.fr/mon-club/cockpit/scanner
        </span>
      </div>
      <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
        <div className="bg-paper px-5 py-5">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">RÈGLEMENT</div>
          <div className="mono mt-2.5 text-[15px] font-bold text-danger">✕ Non réglé</div>
        </div>
        <div className="bg-paper px-5 py-5">
          <div className="mono text-[10px] uppercase tracking-label text-ink-soft">DOSSIER</div>
          <div className="mono mt-2.5 text-[15px] font-bold text-danger">✕ 1 pièce manquante</div>
        </div>
      </div>
    </div>
  );
}

const LIENS_NAV: { href: string; label: string }[] = [
  { href: "/", label: "Accueil" },
  { href: "/fonctionnalites", label: "Fonctionnalités" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/cas-clients/usm-boxe-anglaise", label: "Le premier club" },
];

export default function ClubsFondateurs() {
  return (
    <main id="contenu" className="text-ink">
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
            <Link href="/demo" className="mono hidden text-[11px] uppercase tracking-label text-ink underline decoration-line underline-offset-4 hover:decoration-ink md:block">
              VOIR LA DÉMO
            </Link>
            <Link
              href="/creer?offre=fondateur"
              className="mono hidden bg-brand-dark px-5 py-2.5 text-[12px] uppercase tracking-wide text-white hover:opacity-90 md:block"
            >
              CRÉER MON CLUB
            </Link>
            <MenuMobile
              ton="sombre"
              liens={[
                ...LIENS_NAV,
                { href: "/demo", label: "Voir la démo" },
                { href: "/connexion", label: "Espace président" },
                { href: "/creer?offre=fondateur", label: "Créer mon club" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* 1 — HERO. Texte seul : la page reçoit du trafic email sur mobile, le premier
          écran doit s'afficher avant qu'une photo n'arrive. */}
      <section>
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-16 md:px-8 md:pt-24 md:pb-20">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              LANCEMENT — 15 CLUBS FONDATEURS<Cur />
            </p>
            <h1 className="mt-7 max-w-[20ch] text-[30px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-4xl sm:leading-[1.12] md:text-[50px] md:leading-[1.1]">
              Au moment d’ouvrir la salle, savez-vous vraiment qui est en règle&nbsp;?
            </h1>
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink-soft md:text-xl">
              Klubster réunit les inscriptions, les cotisations et les documents pour vous
              montrer immédiatement ce qui est complet — et ce qui ne l’est pas.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                href="/creer?offre=fondateur"
                className="mono bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90"
              >
                CRÉER MON CLUB →
              </Link>
              <a href="#mecanisme" className="mono py-3.5 text-[12px] uppercase tracking-label text-ink-soft hover:text-ink">
                VOIR COMMENT ÇA FONCTIONNE →
              </a>
            </div>

            <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">
              15 clubs fondateurs · Import de votre fichier inclus<span className="text-brand">_</span>
            </p>
            <p className="mono mt-2 text-[11px] uppercase tracking-label text-ink-soft">
              Trois mois offerts · Sans carte bancaire · Sans engagement
            </p>
            <p className="mono mt-2 text-[11px] uppercase tracking-label text-ink-soft">
              Conçu par un président de club <span className="text-ink-faint">·</span> Conçu et testé avec un club de {USM_ADHERENTS} adhérents
            </p>
          </Reveal>
        </div>
      </section>

      {/* 2 — LE MÉCANISME. Une seule démonstration. */}
      <section id="mecanisme" className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE MÉCANISME<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              L’état d’un adhérent en trois secondes.
            </h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              L’adhérent ouvre son Espace adhérent sur son téléphone et affiche son QR code
              personnel. Depuis son propre téléphone, un bénévole ouvre le scanner Klubster et
              scanne ce QR code. L’état du règlement et du dossier apparaît immédiatement.
              Aucun lecteur, aucune carte plastique et aucun matériel supplémentaire ne sont
              nécessaires.
            </p>
          </Reveal>

          <Reveal className="mt-12">
            <div className="border-t border-line">
              {ETAPES_SCAN.map(([n, texte]) => (
                <div key={n} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-5 md:grid-cols-[64px_1fr]">
                  <span className="mono pt-0.5 text-[13px] text-brand-dark">{n}</span>
                  <p className="text-[17px] font-medium tracking-[-0.01em]">{texte}</p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal className="mt-12">
            <EtatAdherent />
            <p className="mono mt-3 text-[10px] uppercase tracking-label text-ink-faint">
              APERÇU DE L’INTERFACE · DONNÉES DE DÉMONSTRATION
            </p>
          </Reveal>
        </div>
      </section>

      {/* 3 — L'OFFRE. L'argument n'est pas le prix, c'est le travail de migration repris. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">L’OFFRE<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Les 15 premiers clubs.
            </h2>
          </Reveal>

          <div className="mt-12 border-t border-line">
            {FONDATEUR.map(([titre, texte], i) => (
              <div key={titre} className="grid grid-cols-[48px_1fr] gap-4 border-b border-line py-7 md:grid-cols-[64px_1fr]">
                <span className="mono pt-1 text-[13px] text-brand-dark">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-xl font-medium tracking-[-0.01em]">{titre}</p>
                  <p className="mt-1.5 max-w-prose text-[15px] leading-relaxed text-ink-soft">{texte}</p>
                </div>
              </div>
            ))}
          </div>

          <Reveal className="mt-10">
            <p className="max-w-prose text-[15px] leading-relaxed text-ink-soft">
              Pour le lancement, Mathieu accompagne personnellement quinze clubs. Au-delà, il ne
              pourrait pas garantir le même niveau d’accompagnement.
            </p>
          </Reveal>
        </div>
      </section>

      {/* 4 — LA PREUVE. Un seul club, réel, et l'état exact d'avancement. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            {/* Pas de kicker ici, volontairement. Quatre sections sur cinq en portaient
                un : la mécanique devenait prévisible, et c'est justement la section la
                plus personnelle de la page. La rupture de rythme la met en avant.
                (Audit du 29/07/2026.) */}
            <h2 className="text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Je n’ai pas inventé Klubster. J’en avais besoin.
            </h2>
            <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-soft">
              <p>
                {/* &nbsp; et non une espace simple : quand le texte qui suit une expression
                    JSX court sur plusieurs lignes, le compilateur en supprime l'espace de
                    tête — « 313adhérents » relevé sur la préversion du 29/07/2026. */}
                Je préside l’USM Boxe Anglaise, à Montauban. {USM_ADHERENTS}&nbsp;adhérents, six cours,
                une poignée de bénévoles. Chaque rentrée ressemblait à la précédente&nbsp;: des
                dossiers incomplets, des paiements en plusieurs fois impossibles à suivre, et
                des soirées entières devant un tableur.
              </p>
              <p className="text-ink">
                Klubster est né de là. Le club prépare actuellement sa saison 2026-2027 avec Klubster.
              </p>
            </div>
            <p className="mono mt-8 text-[13px] tracking-wide text-ink">
              Mathieu Bourdieu — président de l’USM Boxe Anglaise<span className="text-brand">_</span>
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-8">
              <Link href="/cas-clients/usm-boxe-anglaise" className="mono py-3.5 text-[13px] text-brand-dark hover:underline">
                LIRE LE CAS DU PREMIER CLUB →
              </Link>
              <Link href="/usmboxe" className="mono py-3.5 text-[13px] text-brand-dark hover:underline">
                VOIR SON SITE PUBLIC →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — TARIFS, CTA ET CONTACT. Le détail des questions d'argent vit sur /tarifs. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">APRÈS LES TROIS MOIS<Cur /></p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
              Tout est déjà inclus.
            </h2>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Pas de version Pro, pas d’options, pas de modules. Seule la taille de votre
              association fait évoluer le tarif — et Klubster ne prend aucune commission sur
              vos cotisations.
            </p>
          </Reveal>

          <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
            {PALIERS.map((p) => (
              <div key={p.capacite} className="flex flex-col bg-paper px-7 py-9">
                <div className="mono text-[12px] uppercase tracking-wide text-ink">{p.capacite}</div>
                <div className="mono mt-5 text-[36px] font-bold tracking-tight text-brand">
                  {p.prix}
                  <span className="text-[13px] font-normal text-ink-soft"> €/mois</span>
                </div>
                <div className="mono mt-5 text-[11px] uppercase tracking-label text-ink-faint">
                  Trois mois offerts
                </div>
              </div>
            ))}
          </div>

          {/* Prix « clair et non ambigu » (LCEN art. 19) : franchise en base. */}
          <p className="mono mt-5 text-[11px] text-ink-faint">
            Tarifs nets — TVA non applicable, article 293 B du CGI.
          </p>
          <Link href="/tarifs" className="mono mt-3 inline-block py-3.5 text-[12px] uppercase tracking-label text-ink-soft hover:text-ink">
            Le détail des tarifs et les questions d’argent →
          </Link>

          <div className="mt-16 border-t border-line pt-12">
            <div className="flex flex-wrap items-center gap-5">
              <Link
                href="/creer?offre=fondateur"
                className="mono bg-brand-dark px-8 py-4 text-[13px] uppercase tracking-wide text-white hover:opacity-90"
              >
                CRÉER MON CLUB →
              </Link>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                Prêt en moins de 30 minutes · Sans carte bancaire<span className="text-brand">_</span>
              </p>
            </div>

            <ul className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
              {RASSURANCES.map((r) => (
                <li key={r} className="flex items-start gap-3 bg-paper px-5 py-5 text-[14px]">
                  <span className="mono text-brand">✓</span>
                  <span className="text-ink-soft">{r}</span>
                </li>
              ))}
            </ul>

            {/* Pas de formulaire de rappel : le chat du site et les coordonnées directes
                suffisent, et n'ajoutent pas un traitement de données de plus. */}
            <div className="mt-10 border border-line px-7 py-7">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                UNE QUESTION AVANT DE VOUS LANCER<Cur />
              </p>
              <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                Écrivez ou appelez. C’est Mathieu, le créateur de Klubster, qui répond.
              </p>
              <p className="mono mt-4 text-[13px] leading-relaxed text-ink">
                <a href={`mailto:${EMAIL_CONTACT}`} className="hover:underline">
                  {EMAIL_CONTACT}
                </a>
                <br />
                <a href={`tel:${TEL_LIEN}`} className="hover:underline">
                  {TEL_AFFICHE}
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

      <ChatSite />
    </main>
  );
}
