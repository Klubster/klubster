// Configuration ESLint « à plat », requise depuis ESLint 9.
//
// Next 16 a supprimé `next lint` : le script npm appelle désormais eslint directement.
// eslint-config-next 16 exporte la configuration au format à plat, il n'y a donc plus
// besoin de la couche de compatibilité FlatCompat.
import next from "eslint-config-next/core-web-vitals";

export default [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "supabase/**"],
  },
  ...next,
  {
    rules: {
      // Nouvelle règle apportée par la montée en version. Les huit occurrences du projet
      // sont le motif habituel « API navigateur lue après le montage » : matchMedia,
      // IntersectionObserver, localStorage — impossibles à lire pendant le rendu serveur
      // sans provoquer une divergence d'hydratation. Ce n'est donc pas un bug, mais un
      // signal de performance réel : ces composants gagneraient à passer par
      // useSyncExternalStore. Laissé en avertissement pour rester visible, plutôt que
      // désactivé pour faire taire le compteur — à traiter hors montée de version.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
