import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

/**
 * Tests unitaires — Vitest.
 *
 * Le périmètre porte sur `src/lib` : la logique qui coûte cher quand elle se trompe
 * (permissions, tarifs, signatures Stripe, validation de fichiers, santé, redirections).
 * Ce sont des fonctions pures, testables sans base ni navigateur, donc rapides — un test
 * qu'on n'attend pas est un test qu'on lance.
 *
 * DEUX ENVIRONNEMENTS, ET POURQUOI
 * La démonstration `/demo` est une simulation entièrement côté navigateur : sa promesse
 * — « on peut tout essayer, rien n'est enregistré » — ne se vérifie qu'en manipulant
 * vraiment l'interface. Ces tests-là, et EUX SEULS, tournent dans `happy-dom` : le
 * fichier le déclare par `@vitest-environment happy-dom` en tête.
 *
 * Le défaut reste `node`. Charger un DOM pour tester `peut(role, "paiements")` aurait
 * ralenti toute la suite pour rien, et un test lent finit par ne plus être lancé.
 *
 * `happy-dom` plutôt que `jsdom` : nettement plus rapide au démarrage, et sans
 * dépendance native.
 *
 * Les parcours de bout en bout (webhooks rejoués, RLS multi-clubs avec une session par
 * rôle) demandent une base et des horloges Stripe : ils viendront séparément.
 */
export default defineConfig({
  // Nécessaire pour compiler le JSX des composants de démonstration.
  plugins: [react()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    reporters: "default",
    // Nettoie le DOM entre deux tests : sans cela, un composant monté par un test
    // précédent reste dans le document et fausse les recherches par texte.
    globals: true,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
