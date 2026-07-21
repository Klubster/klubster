import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import MenuMobile from "@/components/site/MenuMobile";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

const TITRE = "Tarifs — Klubster : 9, 19 ou 29 €/mois, tout inclus";
const DESCRIPTION =
  "Une seule offre, tout est inclus : site, inscriptions, paiements, documents, présences, messages. 9 €/mois jusqu’à 300 adhérents. Premier mois offert, sans carte bancaire. 0 % de commission sur les cotisations.";

// La nav « Tarifs » pointait une ancre de la home : suffisant pour naviguer, insuffisant
// pour une campagne. Un lien collé dans une réponse d'email, un partage entre bénévoles
// ou une requête « klubster prix » méritent une adresse à eux, avec ses propres
// métadonnées et une réponse directe aux questions d'argent.
export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/tarifs` },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: `${SITE}/tarifs`,
    siteName: "Klubster",
    locale: "fr_FR",
    type: "website",
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

const INCLUS = [
  "Le site internet de votre association",
  "Les inscriptions et les dossiers en ligne",
  "Les paiements en ligne jusqu’à 12 fois",
  "Les chèques et espèces, jusqu’à la remise en banque",
  "Les documents et certificats centralisés",
  "Les messages aux adhérents et aux parents",
  "Le suivi des présences",
  "Le cockpit Aujourd’hui_",
  "L’export complet de vos données",
  "Toutes les futures évolutions de Klubster",
];

// Les questions d'argent, telles qu'un trésorier les pose. Réponses courtes et
// vérifiables : chaque affirmation ici correspond à un comportement réel du produit.
const QUESTIONS: [string, string][] = [
  [
    "Qui paie l’abonnement : l’association ou les adhérents ?",
    "L’association. Vos adhérents ne paient que leur cotisation, dont Klubster ne prend rien.",
  ],
  [
    "Comment le tarif est-il déterminé ?",
    "Par le nombre d’adhérents de votre association, calculé automatiquement. Vous n’avez aucune offre à choisir, et rien à faire si votre effectif change en cours de saison.",
  ],
  [
    "Faut-il une carte bancaire pour commencer ?",
    "Non. Le premier mois est offert, sans carte et sans prélèvement. Vous décidez ensuite, une fois que vous avez vu ce que ça donne avec votre club.",
  ],
  [
    "Y a-t-il des frais cachés ?",
    "Non. Klubster ne prélève aucune commission sur les cotisations : elles arrivent directement sur le compte Stripe de votre association. Seuls les frais de paiement de Stripe s’appliquent — à partir de 1,5 % + 0,25 € pour une carte européenne standard, davantage pour une carte premium ou hors Europe — et ils sont facturés par Stripe, pas par nous.",
  ],
  [
    "Et si nous encaissons par chèque ou en espèces ?",
    "C’est prévu, et c’est inclus. Vous enregistrez le règlement depuis la fiche de l’adhérent, en deux clics, et vous préparez votre remise en banque avec son bordereau.",
  ],
  [
    "Peut-on résilier facilement ?",
    "Oui, en un clic depuis votre cockpit, sans préavis ni engagement. Vous exportez la liste complète de vos adhérents quand vous voulez : ces données sont les vôtres.",
  ],
  [
    "Le tarif peut-il augmenter ?",
    "Seulement si votre association grandit et change de palier. Toutes les évolutions de Klubster sont incluses, sans supplément.",
  ],
  [
    "L’association doit-elle payer pour son site internet ?",
    "Non, il est compris dans l’abonnement, et créé en même temps que votre association. Vous pouvez aussi y brancher votre propre nom de domaine.",
  ],
];

// Le même contenu, lisible par les moteurs de recherche : « klubster prix »,
// « logiciel association combien ça coûte » se répondent depuis la page de résultats.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: QUESTIONS.map(([q, r]) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: r },
  })),
};

export default function Tarifs() {
  return (
    <main className="text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />

      <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">
            k<Cur />
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <Link href="/fonctionnalites" className="mono text-[12px] text-ink-soft hover:text-ink">
              Fonctionnalités
            </Link>
            <Link href="/tarifs" className="mono text-[12px] text-ink">
              Tarifs
            </Link>
            <Link href="/usmboxe" className="mono text-[12px] text-ink-soft hover:text-ink">
              Voir un club
            </Link>
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
                { href: "/fonctionnalites", label: "Fonctionnalités" },
                { href: "/tarifs", label: "Tarifs" },
                { href: "/usmboxe", label: "Voir un club" },
                { href: "/connexion", label: "Espace président" },
                { href: "/creer", label: "Créer mon association" },
              ]}
            />
          </div>
        </div>
      </header>

      <section>
        <div className="mx-auto max-w-5xl px-6 pt-16 pb-12 md:px-8 md:pt-24 md:pb-[72px]">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">TARIFS<Cur /></p>
            <h1 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[44px]">
              Tout est déjà inclus.
            </h1>
            <p className="mt-6 max-w-prose text-lg text-ink-soft">
              Pas de version Pro. Pas d’options. Pas de modules supplémentaires.
              <br />
              Seule la taille de votre association fait évoluer le tarif.
            </p>
            <p className="mono mt-6 text-[12px] uppercase tracking-label text-ink">
              Premier mois offert · Sans carte bancaire<span className="text-brand">_</span>
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
                <div className="mono mt-5 text-[11px] uppercase tracking-label text-ink-faint">Premier mois offert</div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-5">
            <Link href="/creer" className="mono bg-ink px-7 py-3.5 text-[13px] text-paper hover:bg-ink/90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              Prêt en moins de 30 minutes · Sans engagement<span className="text-brand">_</span>
            </p>
          </div>

          <div className="mt-12 border border-line bg-paper px-7 py-8">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              TOUJOURS INCLUS<Cur />
            </p>
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
            Klubster ne prélève aucune commission. Les frais de paiement (à partir de 1,5 % + 0,25 € pour
            une carte européenne standard) sont facturés
            directement par Stripe. Premier mois offert, sans prélèvement. Changez d’offre ou résiliez à
            tout moment, depuis votre cockpit.
          </p>
        </div>
      </section>

      {/* LES QUESTIONS D'ARGENT — juste sous le prix, là où elles se posent. */}
      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 md:px-8 md:py-28">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              CE QUE VOUS ALLEZ NOUS DEMANDER<Cur />
            </p>
            <h2 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[36px]">
              Les questions d’argent.
            </h2>
          </Reveal>
          <div className="mt-12 border-t border-line">
            {QUESTIONS.map(([q, r], i) => (
              <div key={q} className="flex gap-5 border-b border-line py-7">
                <span className="mono shrink-0 pt-1 text-[11px] text-brand">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-xl font-medium tracking-[-0.01em]">{q}</p>
                  <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{r}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center md:px-8 md:py-24">
          <p className="mono text-[20px] leading-[1.15] tracking-[-0.02em] text-ink sm:text-[26px] md:text-[32px]">
            Neuf euros par mois.
            <br />
            Une soirée de paperasse en moins<span className="cur">_</span>
          </p>
          <div className="mt-10">
            <Link href="/creer" className="mono inline-block bg-brand px-8 py-4 text-[13px] uppercase tracking-wide text-white hover:bg-brand-dark">
              CRÉER MON ASSOCIATION →
            </Link>
          </div>
          <p className="mono mt-5 text-[11px] uppercase tracking-label text-ink-soft">
            Premier mois offert · Sans carte bancaire<span className="text-brand">_</span>
          </p>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <div>
              <Link href="/" className="font-logo text-lg font-semibold">
                k<Cur />
              </Link>
              <p className="mono mt-4 max-w-xs text-[11px] leading-relaxed text-ink-soft">
                Développé à Montauban. Utilisé chaque semaine à l’USM Boxe.
              </p>
            </div>
            <nav className="mono flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-ink-soft">
              <Link href="/creer" className="hover:text-ink">Créer mon association</Link>
              <Link href="/fonctionnalites" className="hover:text-ink">Fonctionnalités</Link>
              <Link href="/connexion" className="hover:text-ink">Espace président</Link>
              <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
              <Link href="/cgv" className="hover:text-ink">CGV</Link>
              <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
            </nav>
          </div>
        </div>
      </footer>
    </main>
  );
}
