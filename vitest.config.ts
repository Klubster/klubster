import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Tests unitaires — Vitest.
 *
 * Le périmètre est volontairement restreint à `src/lib` : la logique qui coûte cher
 * quand elle se trompe (permissions, tarifs, signatures Stripe, validation de fichiers,
 * santé, redirections). Ce sont des fonctions pures, testables sans base ni navigateur,
 * donc rapides — un test qu'on n'attend pas est un test qu'on lance.
 *
 * Les parcours de bout en bout (paiement en plusieurs fois, webhooks rejoués, RLS
 * multi-clubs) demandent une base et des horloges Stripe : ils viendront séparément,
 * et n'ont pas leur place ici.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: "default",
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
