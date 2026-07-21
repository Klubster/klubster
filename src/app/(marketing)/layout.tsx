import Mesure from "@/components/site/Mesure";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

/**
 * Données structurées de Klubster : l'offre, ses trois paliers, son éditeur.
 * Elles n'ont de sens que sur les pages de la marque. Dans le layout racine, elles
 * décrivaient aussi les vitrines des clubs — un club sportif s'annonçait alors comme
 * une application professionnelle vendue 9 €/mois.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Klubster",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: SITE,
  description:
    "Inscriptions, paiements, communication, site web — Klubster réunit tout ce dont une association a besoin dans un seul outil, pensé pour les bénévoles. Prêt en moins de 30 minutes.",
  inLanguage: "fr-FR",
  author: { "@type": "Person", name: "Mathieu Bourdieu" },
  offers: [
    { "@type": "Offer", price: "9", priceCurrency: "EUR", description: "Jusqu’à 300 adhérents", category: "Abonnement mensuel" },
    { "@type": "Offer", price: "19", priceCurrency: "EUR", description: "De 301 à 500 adhérents", category: "Abonnement mensuel" },
    { "@type": "Offer", price: "29", priceCurrency: "EUR", description: "Plus de 500 adhérents", category: "Abonnement mensuel" },
  ],
};

/**
 * Pages de la marque : accueil, tarifs, fonctionnalités, /combat, création d'association.
 * Le groupe entre parenthèses n'apparaît pas dans les URL — il ne sert qu'à isoler ce
 * qui appartient à Klubster de ce qui appartient aux clubs.
 *
 * C'est ici, et nulle part ailleurs, que vit la mesure d'audience. Montée dans le
 * layout racine, elle restait chargée après une navigation côté client vers un site de
 * club, un espace adhérent ou un cockpit : la liste blanche empêchait de charger le
 * script, pas de continuer à enregistrer une fois qu'il tournait. Un club et ses
 * adhérents pouvaient donc être suivis à leur insu (relevé à l'audit du 21/07/2026).
 * Sortir du groupe démonte le composant, et avec lui la mesure.
 */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {children}
      <Mesure />
    </>
  );
}
