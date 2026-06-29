import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container, Section, SurtitreMono } from "@/components/ui/Layout";

const PLANS = [
  { nom: "Starter", cible: "jusqu'à 100 adhérents", prix: "9 €", note: "Pour démarrer" },
  { nom: "Club", cible: "101 à 300 adhérents", prix: "19 €", note: "Le plus choisi" },
  { nom: "Club +", cible: "+ de 300 adhérents", prix: "29 €", note: "Gros volumes" },
];

const ETAPES = [
  "Créer son compte",
  "Choisir un template par sport",
  "Logo & couleurs",
  "Infos & adresse",
  "Cours, tarifs & créneaux",
  "Connecter le RIB",
  "Publier",
];

export default function Home() {
  return (
    <main>
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
        <Container className="flex items-center justify-between py-3">
          <span className="font-mono text-lg font-bold lowercase">klubster</span>
          <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
            <a href="#produit" className="hover:text-ink">Produit</a>
            <a href="#demarrage" className="hover:text-ink">Mise en route</a>
            <a href="#tarifs" className="hover:text-ink">Tarifs</a>
            <Link href="/usmboxe" className="hover:text-ink">Exemple</Link>
          </nav>
          <ButtonLink href="/creer">Créer mon association</ButtonLink>
        </Container>
      </header>

      {/* Hero */}
      <Section className="!py-24 md:!py-32">
        <div className="max-w-3xl">
          <SurtitreMono>l&apos;OS des associations</SurtitreMono>
          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-6xl">
            Votre association <span className="text-brand">entièrement en ligne</span>.
          </h1>
          <p className="mt-6 max-w-prose text-lg text-ink-soft">
            Le logiciel créé par un président d&apos;association, pour les présidents
            d&apos;association. Site, inscriptions, paiements et adhérents — publiez le site de
            votre club en <strong className="text-ink">moins de 20 minutes</strong>.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/creer">Créer mon association</ButtonLink>
            <ButtonLink href="/usmboxe" variant="secondary">Voir un exemple en ligne</ButtonLink>
          </div>
          <p className="mt-4 font-mono text-xs text-ink-soft">klubster.fr/usmboxe</p>
        </div>
      </Section>

      {/* Produit / arguments */}
      <Section id="produit" alt>
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { t: "Zéro commission", d: "Vos paiements sont reversés directement sur votre compte (Stripe Connect). On ne prend aucun pourcentage — vous payez juste votre abonnement." },
            { t: "Spécial clubs de sport", d: "Cours, créneaux et planning, appel par QR code, séances d'essai : pensé pour le sport, pas un outil générique." },
            { t: "10× plus simple", d: "Chaque écran enlève des décisions. Des templates par sport pré-remplis. En ligne, seul, en moins de 20 minutes." },
          ].map((f) => (
            <div key={f.t}>
              <h3 className="text-lg font-bold">{f.t}</h3>
              <p className="mt-2 text-ink-soft">{f.d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Mise en route */}
      <Section id="demarrage">
        <SurtitreMono>étoile du nord</SurtitreMono>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">En ligne en moins de 20 minutes</h2>
        <ol className="mt-8 flex flex-wrap gap-3">
          {ETAPES.map((e, i) => (
            <li key={e} className="flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm shadow-sm">
              <span className="tabular font-mono text-xs text-brand">{String(i + 1).padStart(2, "0")}</span>
              {e}
            </li>
          ))}
        </ol>
      </Section>

      {/* Tarifs */}
      <Section id="tarifs" alt>
        <SurtitreMono>tarifs</SurtitreMono>
        <h2 className="mt-2 text-2xl font-bold md:text-3xl">Un abonnement simple, sans commission</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div key={p.nom} className="flex flex-col rounded-card border border-line bg-surface p-6 shadow-sm">
              <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">{p.note}</p>
              <h3 className="mt-2 text-lg font-bold">{p.nom}</h3>
              <p className="text-sm text-ink-soft">{p.cible}</p>
              <p className="mt-4">
                <span className="tabular font-mono text-3xl font-bold">{p.prix}</span>
                <span className="text-ink-soft"> / mois</span>
              </p>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-ink-soft">Essai offert. Les frais Stripe (~1,5 % + 0,25 €) restent au coût, à la charge de l&apos;association.</p>
      </Section>

      <footer className="border-t border-line py-10">
        <Container className="flex flex-col items-center justify-between gap-3 text-sm text-ink-soft md:flex-row">
          <span className="font-mono lowercase">klubster</span>
          <span>Le Cockpit de votre association.</span>
        </Container>
      </footer>
    </main>
  );
}
