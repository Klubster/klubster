import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import MenuMobile from "@/components/site/MenuMobile";
import CockpitPreview from "@/components/site/CockpitPreview";
import { ApercuFormulaire, ApercuScan, ApercuFiche, ApercuMessages, ApercuSite, ApercuRemise } from "@/components/site/Apercus";

export const metadata: Metadata = {
  title: "Fonctionnalités — Klubster",
  description:
    "Inscriptions sur mesure, dossiers sans papier, contrôle par scan, paiements jusqu’à 12 fois sans commission, données exportables. Tout est inclus, à partir de 9 €/mois.",
  alternates: { canonical: "https://klubster.fr/fonctionnalites" },
  // twitter:card=summary_large_image (héritée du layout racine) était déclarée sans
  // image de partage : on référence la vignette OG racine (app/opengraph-image.tsx).
  openGraph: {
    title: "Fonctionnalités — Klubster",
    description:
      "Inscriptions sur mesure, dossiers sans papier, contrôle par scan, paiements jusqu’à 12 fois sans commission, données exportables. Tout est inclus, à partir de 9 €/mois.",
    url: "https://klubster.fr/fonctionnalites",
    siteName: "Klubster",
    locale: "fr_FR",
    type: "website",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Klubster — Toute votre association, au même endroit." }],
  },
};

function Cur() {
  return <span className="cur">_</span>;
}

/** Un chapitre : le numéro, la promesse, la démonstration, la phrase qui reste. */
function Chapitre({
  num,
  kicker,
  titre,
  children,
}: {
  num: string;
  kicker: string;
  titre: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Reveal>
          {/* Numéro de chapitre = information de lecture en petit corps : brand-dark (4,5:1). */}
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            <span className="text-brand-dark">{num}</span> — {kicker}
            <Cur />
          </p>
          <h2 className="mt-6 text-[26px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-3xl sm:leading-[1.12] md:text-[40px] md:leading-[1.12]">
            {titre}
          </h2>
        </Reveal>
        {children}
      </div>
    </section>
  );
}

/** Les preuves : des phrases courtes, jamais des cases à cocher marketing. */
function Preuves({ lignes }: { lignes: string[] }) {
  return (
    <ul className="mt-8 max-w-2xl border-t border-line">
      {lignes.map((l) => (
        <li key={l} className="flex items-start gap-3 border-b border-line py-3.5 text-[15px]">
          <span className="mono mt-0.5 text-brand">✓</span>
          <span>{l}</span>
        </li>
      ))}
    </ul>
  );
}

function Chute({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono mt-10 text-lg font-normal leading-[1.2] tracking-[-0.02em] text-ink sm:text-2xl sm:leading-[1.2] md:text-[30px] md:leading-[1.2]">
      {children}
      <span className="cur">_</span>
    </p>
  );
}

export default function Fonctionnalites() {
  return (
    <main className="text-ink">
      {/* NAV — identique à la home, mais sur fond clair */}
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
          <nav className="mono hidden items-center gap-7 text-[12px] tracking-wide text-ink-soft md:flex">
            <Link href="/fonctionnalites" className="text-ink">Fonctionnalités</Link>
            <Link href="/tarifs" className="hover:text-ink">Tarifs</Link>
            <Link href="/usmboxe" className="hover:text-ink">Voir un club</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/creer" className="mono bg-brand-dark px-4 py-2 text-[12px] text-white hover:opacity-90">
              <span className="hidden sm:inline">CRÉER MON ASSOCIATION</span>
              <span className="sm:hidden">CRÉER</span>
            </Link>
            <MenuMobile
              ton="sombre"
              liens={[
                { href: "/fonctionnalites", label: "Fonctionnalités" },
                { href: "/tarifs", label: "Tarifs" },
                { href: "/usmboxe", label: "Voir un club" },
                { href: "/connexion", label: "Espace président" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* HERO — la promesse à gauche, le produit à droite. La page s'ouvre sur l'outil. */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-16 pb-16 md:grid-cols-[1fr_420px] md:gap-16 md:px-8 md:pt-24 md:pb-24">
          <div>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">FONCTIONNALITÉS<Cur /></p>
            {/* Pas de max-w en ch : « Moins d’administration. » fait 23 caractères et se
                cassait en deux. Les retours à la ligne sont écrits, pas subis. */}
            <h1 className="mt-6 text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-4xl sm:leading-[1.08] md:text-[46px] md:leading-[1.08]">
              Moins d’administration.<br />Plus de temps pour l’association.
            </h1>
            <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink-soft">
              Inscriptions, dossiers, paiements, contrôle sur le terrain, messages et site internet.
              Tout est réuni dans un seul outil pensé pour les bénévoles.
            </p>
            <p className="mono mt-8 text-[13px] tracking-wide text-ink">
              Toutes les fonctionnalités sont incluses <span className="text-ink-faint">·</span> À partir de 9 €/mois
            </p>
            {/* CTA et réassurance collés : un seul bloc, pas deux éléments qui flottent. */}
            <div className="mt-8">
              <Link href="/creer" className="mono inline-block bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90">
                CRÉER MON ASSOCIATION →
              </Link>
              <p className="mono mt-3 text-[11px] uppercase tracking-label text-ink-soft">
                Premier mois offert · Sans engagement<span className="text-brand">_</span>
              </p>
            </div>
          </div>

          {/* Le produit, dès la première seconde. Légèrement incliné pour ne pas figer la page.
              Colonne un peu plus étroite (420 au lieu de 460) : le titre reste l'entrée. */}
          <div className="md:rotate-[1.2deg] md:transition-transform md:hover:rotate-0">
            <CockpitPreview />
          </div>
        </div>
      </section>

      {/* I — LES INSCRIPTIONS */}
      <Chapitre num="I" kicker="LES INSCRIPTIONS" titre={<>Votre association.<br />Votre parcours d’inscription.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Une école de musique ne demande pas ce que demande un club de boxe. Alors vous construisez
            le formulaire de votre association : vos champs, vos pièces, vos activités.
          </p>
          <Preuves
            lignes={[
              "Ajoutez les champs dont vous avez besoin, et décidez lesquels sont obligatoires",
              "Demandez les pièces utiles : certificat, licence, autorisation parentale",
              "Une pièce peut n’être exigée que pour une activité, ou que pour les mineurs",
              "Le questionnaire de santé se remplit et se signe en ligne, du doigt",
              "Vos activités, vos créneaux et vos tarifs se modifient quand vous voulez",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuFormulaire />
          <p className="mono mt-4 text-[11px] text-ink-faint">
            À gauche, ce que vous réglez une fois. À droite, ce que l’adhérent remplit chez lui, un dimanche soir.
          </p>
        </Reveal>

        <Reveal>
          {/* Lignes courtes : en Space Mono 18px, « Vous choisissez ce qu’il faut demander. »
              mesure 430 px pour 342 disponibles sur un téléphone, et se brise au hasard. */}
          <Chute>Vous choisissez<br />ce qu’il faut demander.<br />Klubster s’occupe du reste</Chute>
        </Reveal>
      </Chapitre>

      {/* photo — respiration */}
      <section className="relative h-[50vh] min-h-[320px] w-full overflow-hidden md:h-[70vh]">
        <Parallax src="/03-vestiaire.jpg" alt="Un vestiaire vide, lumière de fin de journée." className="absolute inset-0" strength={0.1} />
      </section>

      {/* II — LES DOSSIERS */}
      <Chapitre num="II" kicker="LES DOSSIERS" titre={<>Un dossier complet.<br />Sans papier à ranger.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Le certificat n’arrive plus froissé au fond d’un sac. Il est déposé en ligne, il se range tout seul
            dans le dossier de l’adhérent, et vous voyez d’un coup d’œil ce qui manque encore.
          </p>
          <Preuves
            lignes={[
              "Les documents sont déposés par l’adhérent, ou ajoutés à son dossier par un bénévole",
              "Le questionnaire de santé est signé en ligne — rien à imprimer, rien à rapporter",
              "Seules les réponses utiles sont conservées : Klubster ne stocke pas le détail médical",
              "Le dossier affiche ce qui est reçu, et ce qui manque",
              "Les pièces ne sont visibles que par les personnes autorisées de votre association",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuFiche />
          <p className="mono mt-4 text-[11px] text-ink-faint">
            La fiche d’un adhérent : ses pièces, sa cotisation, ce qu’il a déjà réglé.
          </p>
        </Reveal>

        <Reveal>
          <Chute>Plus de feuilles à imprimer.<br />Plus de dossiers à chercher</Chute>
        </Reveal>
      </Chapitre>

      {/* III — LE CONTRÔLE */}
      <Chapitre num="III" kicker="LE CONTRÔLE" titre={<>Un scan.<br />Vous savez.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Chaque adhérent a sa carte de membre sur son téléphone. À l’entrée du cours, un bénévole la scanne :
            en deux secondes, il sait si la personne est inscrite, si sa cotisation est à jour, si son dossier est complet.
          </p>
          <Preuves
            lignes={[
              "La carte de membre vit dans l’espace personnel de l’adhérent, avec son QR",
              "Le scan affiche le cours, l’état de la cotisation et les pièces manquantes",
              "L’appel se fait dans la foulée, d’un seul bouton",
              "Si le scan n’est pas possible, cherchez l’adhérent par son nom : mêmes informations",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuScan />
          <p className="mono mt-4 text-[11px] text-ink-faint">
            Le scan ne dit pas seulement « présent ». Il dit ce qu’il faut réclamer, et à qui.
          </p>
        </Reveal>

        <Reveal>
          <Chute>Un contrôle rapide.<br />Une information fiable</Chute>
        </Reveal>
      </Chapitre>

      {/* photo — respiration */}
      <section className="relative h-[50vh] min-h-[320px] w-full overflow-hidden md:h-[70vh]">
        <Parallax src="/08-studio.jpg" alt="Un studio, tapis déroulés, au soleil couchant." className="absolute inset-0" strength={0.1} />
      </section>

      {/* IV — LES PAIEMENTS */}
      <Chapitre num="IV" kicker="LES PAIEMENTS" titre={<>Les cotisations arrivent.<br />Vous savez où elles en sont.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            L’adhérent règle pendant son inscription. L’argent va directement sur le compte de votre association :
            Klubster ne le touche jamais, et ne prélève aucune commission.
          </p>
          <Preuves
            lignes={[
              "Paiement en une fois, ou jusqu’à 12 échéances mensuelles",
              "C’est le club qui fixe le maximum ; l’adhérent choisit dans cette limite",
              "Chaque échéance encaissée est inscrite dans le dossier, sans rien saisir",
              "Une échéance rejetée par la banque ? L’adhérent et le club sont prévenus le jour même",
              "Un chèque, des espèces ? Vous l’enregistrez depuis la fiche, en deux clics",
              "Préparez votre remise et imprimez le bordereau à joindre au dépôt en banque",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuRemise />
          <p className="mono mt-4 text-center text-[11px] text-ink-faint">
            Le bordereau de remise : cochez les chèques, imprimez, déposez. Klubster tient le compte.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <div className="border border-line bg-bg-alt px-6 py-8 md:px-8">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              0 % de commission Klubster<span className="text-brand">_</span>
            </p>
            <p className="mt-4 max-w-prose text-lg text-ink">
              Les cotisations arrivent sur le compte Stripe de votre association.
            </p>
            <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-soft">
              Les frais de paiement (à partir de 1,5 % + 0,25 € pour une carte européenne standard) sont
              facturés directement par Stripe, comme pour n’importe
              quel encaissement par carte. Klubster ne prend rien au passage.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <Chute>Chaque paiement est suivi.<br />Chaque incident<br />vous est signalé</Chute>
        </Reveal>
      </Chapitre>

      {/* V — LES MESSAGES */}
      <Chapitre num="V" kicker="LES MESSAGES" titre={<>Les bonnes informations.<br />Aux bonnes personnes.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Un cours annulé, un horaire qui change, un document qui manque. Vous écrivez une fois,
            à qui vous voulez : les adresses sont déjà dans Klubster, reliées aux dossiers.
          </p>
          <Preuves
            lignes={[
              "Écrivez à tous vos adhérents, ou seulement à ceux d’un cours",
              "Prévenez les parents des adhérents mineurs, sans les trier à la main",
              "Relancez d’un message ceux dont le dossier est encore incomplet",
              "Les coordonnées sont déjà là, à jour avec les inscriptions",
              "Pas de logiciel d’emailing, pas de liste à maintenir, chacun en copie cachée",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuMessages />
          <p className="mono mt-4 text-[11px] text-ink-faint">
            Vous choisissez qui reçoit. Klubster envoie, chacun de son côté.
          </p>
        </Reveal>

        <Reveal>
          <Chute>Deux clics.<br />Les bonnes personnes<br />sont prévenues</Chute>
        </Reveal>
      </Chapitre>

      {/* photo — respiration */}
      <section className="relative h-[50vh] min-h-[320px] w-full overflow-hidden md:h-[70vh]">
        <Parallax src="/09-atelier.jpg" alt="Une salle d’arts plastiques, prête pour l’atelier." className="absolute inset-0" strength={0.1} />
      </section>

      {/* VI — LE SITE */}
      <Chapitre num="VI" kicker="LE SITE INTERNET" titre={<>L’essentiel.<br />Et vous gardez la main.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Votre association n’a pas besoin d’un site compliqué. Elle a besoin d’un site clair, à jour,
            qu’elle fait évoluer seule. Il est créé en même temps que votre association, et les inscriptions
            y sont déjà reliées.
          </p>
          <Preuves
            lignes={[
              "En ligne dès le premier soir, avec votre logo et vos couleurs",
              "Rangez vos sections dans l’ordre que vous voulez, ajoutez vos propres chapitres",
              "Photos, équipe, FAQ, actualités, cours et tarifs : vous les modifiez vous-même",
              "Votre propre adresse, monclub.fr, si vous le souhaitez",
              "Pas de développeur, pas de plugin à mettre à jour, pas de site à refaire chaque saison",
            ]}
          />
        </Reveal>

        <Reveal className="mt-12">
          <ApercuSite />
          <p className="mono mt-4 text-[11px] text-ink-faint">
            Les sections de votre site, que vous rangez et publiez depuis votre cockpit.
          </p>
        </Reveal>

        <Reveal>
          <Chute>Un site simple.<br />Autonome. Évolutif</Chute>
        </Reveal>
      </Chapitre>

      {/* VII — VOS DONNÉES */}
      <Chapitre num="VII" kicker="VOS DONNÉES" titre={<>Vos adhérents restent les vôtres.</>}>
        <Reveal>
          <p className="mt-7 max-w-prose text-lg text-ink-soft">
            Une association n’appartient pas à son logiciel. Vous arrivez avec vos adhérents, vous repartez avec.
          </p>
          <Preuves
            lignes={[
              "Importez votre tableur : Klubster fait correspondre vos colonnes aux siennes",
              "L’aperçu vous montre le résultat avant que rien ne soit enregistré",
              "Les doublons sont ignorés, jamais écrasés",
              "Exportez la liste complète de vos adhérents en un clic, quand vous voulez",
              "Vos données sont hébergées dans l’Union européenne, jamais revendues",
              "Vous résiliez depuis votre cockpit, sans engagement ni préavis",
            ]}
          />
        </Reveal>

        <Reveal>
          <Chute>Vos données<br />vous appartiennent.<br />Aujourd’hui comme demain</Chute>
        </Reveal>
      </Chapitre>

      {/* ET AUSSI — les évidences, en une ligne chacune */}
      <section className="border-t border-line bg-bg-alt">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-24">
          <Reveal>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ET AUSSI<Cur /></p>
            <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              {[
                ["Le cockpit Aujourd’hui_", "L’état de votre association en trois secondes : ce qui manque, ce qui attend, qui vient ce soir."],
                ["Les relances d’impayés", "Qui doit encore ? Un rappel par email avec le montant de chacun — une personne, ou tout le monde d’un coup."],
                ["Les remboursements et les litiges", "Un paiement remboursé ou contesté se suit depuis le cockpit, sans jamais être compté deux fois."],
                ["La jauge et la liste d’attente", "Un cours complet bascule les inscriptions en liste d’attente. Vous donnez la place dès qu’elle se libère."],
                ["Le suivi des présences", "Chaque scan garde la trace du passage. La feuille d’appel se remplit toute seule."],
                ["Les chèques et les espèces", "Ils s’enregistrent aussi, en deux clics : toute la trésorerie au même endroit."],
                ["Votre propre adresse", "monclub.fr plutôt que klubster.fr/monclub, si vous le souhaitez."],
              ].map(([titre, texte]) => (
                <div key={titre} className="bg-paper px-6 py-6">
                  <p className="text-[17px] font-medium tracking-[-0.01em]">{titre}</p>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">{texte}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="relative min-h-[70vh] w-full overflow-hidden">
        <Parallax src="/07-crepuscule.jpg" alt="Une salle éclairée, à la tombée du jour." className="absolute inset-0" strength={0.08} />
        <div className="absolute inset-0 bg-ink/60" />
        <div className="relative flex min-h-[70vh] items-center justify-center">
          <div className="px-6 py-24 text-center text-paper">
            <p className="mono mx-auto max-w-[720px] text-lg font-normal leading-[1.2] tracking-[-0.02em] sm:text-2xl sm:leading-[1.2] md:text-[30px] md:leading-[1.2]">
              Tout est inclus.<br />Seule la taille<br />de votre association<br />fait évoluer le prix.
            </p>
            <p className="mono mt-8 text-[13px] tracking-wide">
              9 € <span className="text-paper/50">·</span> 19 € <span className="text-paper/50">·</span> 29 € par mois
            </p>
            <Link href="/creer" className="mono mt-10 inline-block bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono mt-6 text-[11px] uppercase tracking-label text-paper/70">
              Premier mois offert · Sans engagement<span className="text-brand">_</span>
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <span className="font-logo text-lg font-semibold">k<Cur /></span>
              <p className="mono mt-3 text-[11px] text-ink-soft">Développé à Montauban. Utilisé chaque semaine à l’USM Boxe.</p>
            </div>
            <nav className="mono flex flex-wrap gap-x-6 gap-y-2 text-[11px] text-ink-soft">
              <Link href="/" className="hover:text-ink">Accueil</Link>
              <Link href="/creer" className="hover:text-ink">Créer mon association</Link>
              <Link href="/connexion" className="hover:text-ink">Espace président</Link>
              <Link href="/mentions-legales" className="hover:text-ink">Mentions légales</Link>
              <Link href="/cgv" className="hover:text-ink">CGV</Link>
              <Link href="/confidentialite" className="hover:text-ink">Confidentialité</Link>
            </nav>
          </div>
          <p className="mono mt-12 text-[11px] text-ink-faint">© {new Date().getFullYear()} KLUBSTER</p>
        </div>
      </footer>
    </main>
  );
}
