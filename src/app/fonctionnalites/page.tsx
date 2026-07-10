import type { Metadata } from "next";
import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import Parallax from "@/components/site/Parallax";
import MenuMobile from "@/components/site/MenuMobile";
import { ApercuFormulaire, ApercuScan, ApercuFiche } from "@/components/site/Apercus";

export const metadata: Metadata = {
  title: "Fonctionnalités — Klubster",
  description:
    "Inscriptions sur mesure, dossiers sans papier, contrôle par scan, paiements jusqu’à 12 fois sans commission, données exportables. Tout est inclus, à partir de 9 €/mois.",
  alternates: { canonical: "https://klubster.fr/fonctionnalites" },
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
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            <span className="text-brand">{num}</span> — {kicker}
            <Cur />
          </p>
          <h2 className="mt-6 text-[26px] font-medium leading-[1.12] tracking-[-0.02em] sm:text-3xl md:text-[40px]">
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
    <p className="mono mt-10 text-lg font-normal leading-[1.2] tracking-[-0.02em] text-ink sm:text-2xl md:text-[30px]">
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
            <Link href="/#tarifs" className="hover:text-ink">Tarifs</Link>
            <Link href="/usmboxe" className="hover:text-ink">Un club</Link>
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
                { href: "/#tarifs", label: "Tarifs" },
                { href: "/usmboxe", label: "Voir un club" },
                { href: "/connexion", label: "Espace président" },
              ]}
            />
          </div>
        </div>
      </header>

      {/* HERO — sobre, sur papier. La promesse, pas la liste. */}
      <section>
        <div className="mx-auto max-w-5xl px-6 pt-20 pb-16 md:px-8 md:pt-28 md:pb-24">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">FONCTIONNALITÉS<Cur /></p>
          {/* Pas de max-w en ch : « Moins d’administration. » fait 23 caractères et se
              cassait en deux. Les retours à la ligne sont écrits, pas subis. */}
          <h1 className="mt-6 text-[30px] font-medium leading-[1.08] tracking-[-0.02em] sm:text-4xl md:text-[52px]">
            Moins d’administration.<br />Plus de temps pour l’association.
          </h1>
          <p className="mt-7 max-w-prose text-lg leading-relaxed text-ink-soft">
            Inscriptions, dossiers, adhérents, paiements, contrôle sur le terrain, messages et site internet.
            Tout est réuni dans un seul outil, pensé pour des bénévoles qui n’ont pas le temps d’apprendre un logiciel.
          </p>
          <p className="mono mt-8 text-[13px] tracking-wide text-ink">
            Toutes les fonctionnalités sont incluses <span className="text-ink-faint">·</span> À partir de 9 €/mois
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <Link href="/creer" className="mono bg-brand-dark px-7 py-3.5 text-[13px] text-white hover:opacity-90">
              CRÉER MON ASSOCIATION →
            </Link>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              Premier mois offert<span className="text-brand">_</span>
            </p>
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
              "Les documents sont déposés par l’adhérent, ou envoyés par email et cochés à la main",
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
              "Sans caméra — ou sur un iPhone — la recherche par nom donne la même réponse",
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
              "Les règlements par chèque ou en espèces s’enregistrent aussi, en deux clics",
            ]}
          />
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
              Les frais de paiement (1,5 % + 0,25 €) sont facturés directement par Stripe, comme pour n’importe
              quel encaissement par carte. Klubster ne prend rien au passage.
            </p>
          </div>
        </Reveal>

        <Reveal>
          <Chute>Chaque paiement est suivi.<br />Chaque incident<br />vous est signalé</Chute>
        </Reveal>
      </Chapitre>

      {/* V — VOS DONNÉES */}
      <Chapitre num="V" kicker="VOS DONNÉES" titre={<>Vos adhérents restent les vôtres.</>}>
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
                ["Le site de votre association", "En ligne dès le premier soir. Photos, présentation, FAQ, équipe, actualités : vous modifiez tout vous-même."],
                ["Les messages", "Écrivez à tous vos adhérents, ou à ceux d’un seul cours. Les adresses sont déjà là."],
                ["Le cockpit Aujourd’hui_", "L’état de votre association en trois secondes : ce qui manque, ce qui attend, qui vient ce soir."],
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
            <p className="mono mx-auto max-w-[720px] text-lg font-normal leading-[1.2] tracking-[-0.02em] sm:text-2xl md:text-[30px]">
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
