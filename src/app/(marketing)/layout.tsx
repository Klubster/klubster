import Mesure from "@/components/site/Mesure";

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
      {children}
      <Mesure />
    </>
  );
}
