import { afterEach } from "vitest";

/**
 * Nettoyage entre deux tests de composants.
 *
 * Sans cela, un composant monté par un test précédent reste dans le document : une
 * recherche par texte trouve alors deux résultats, et le test échoue pour une raison qui
 * n'a rien à voir avec ce qu'il vérifie. C'est le piège habituel des suites de tests
 * d'interface, et il se paie en heures de diagnostic.
 *
 * L'import est dynamique et tolérant : les tests qui tournent en environnement `node`
 * (la grande majorité) n'ont pas de DOM, et `@testing-library/react` n'a rien à y faire.
 */
afterEach(async () => {
  if (typeof document === "undefined") return;
  const { cleanup } = await import("@testing-library/react");
  cleanup();
});
