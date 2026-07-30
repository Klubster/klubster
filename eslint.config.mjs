// Configuration ESLint « à plat », requise depuis ESLint 9.
//
// Next 16 a supprimé `next lint` : le script npm appelle désormais eslint directement.
// eslint-config-next 16 exporte la configuration au format à plat, il n'y a donc plus
// besoin de la couche de compatibilité FlatCompat.
import next from "eslint-config-next/core-web-vitals";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "supabase/**"],
  },
  ...next,
  {
    // Le greffon doit être déclaré DANS l'objet qui utilise sa règle : en configuration
    // à plat, un `plugins` posé par un autre objet ne suffit pas. Sans cette ligne,
    // ESLint 9 refuse de démarrer — « could not find plugin react-hooks » — et la CI
    // échoue à l'étape Lint sans avoir analysé un seul fichier.
    //
    // `eslint-plugin-react-hooks` est déclaré en devDependency exacte. Il n'arrivait
    // jusqu'ici qu'en dépendance transitive hissée à la racine par npm : rien n'oblige
    // npm à la hisser, et rien n'empêche une résolution différente d'installer une autre
    // majeure. Importer un paquet qu'on n'a pas déclaré, c'est parier sur la mise à plat
    // de l'arbre de dépendances.
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Règle apportée par la montée en version. Les onze occurrences du projet sont le
      // motif habituel « API navigateur lue après le montage » : matchMedia,
      // IntersectionObserver, localStorage — impossibles à lire pendant le rendu serveur
      // sans provoquer une divergence d'hydratation. Ce n'est donc pas un bug, mais un
      // signal de performance réel : ces composants gagneraient à passer par
      // useSyncExternalStore. Laissé en avertissement pour rester visible, plutôt que
      // désactivé pour faire taire le compteur — à traiter dans une passe dédiée.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
];
