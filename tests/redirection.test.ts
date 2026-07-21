import { describe, it, expect } from "vitest";
import { destinationSure } from "@/lib/redirection";

/**
 * Redirection après authentification. Le paramètre `next` vient de l'URL, donc de
 * n'importe qui : un lien forgé peut être envoyé par email. Le visiteur vient de saisir
 * son mot de passe sur le vrai site — l'expédier ensuite ailleurs ferait un hameçonnage
 * particulièrement crédible.
 */

describe("destinationSure", () => {
  it("accepte un chemin interne", () => {
    expect(destinationSure("/usmboxe/cockpit")).toBe("/usmboxe/cockpit");
    expect(destinationSure("/creer?etape=2")).toBe("/creer?etape=2");
  });

  it("refuse une URL absolue vers un autre site", () => {
    expect(destinationSure("https://exemple-malveillant.fr")).toBe("/creer");
    expect(destinationSure("http://exemple-malveillant.fr")).toBe("/creer");
  });

  it("refuse une URL relative au protocole", () => {
    // « //exemple.fr » est une URL absolue complète pour un navigateur.
    expect(destinationSure("//exemple-malveillant.fr")).toBe("/creer");
    expect(destinationSure("//exemple-malveillant.fr/klubster/connexion")).toBe("/creer");
  });

  it("refuse la variante à antislash, que des navigateurs normalisent en //", () => {
    expect(destinationSure("/\\exemple-malveillant.fr")).toBe("/creer");
  });

  it("refuse un schéma javascript ou data", () => {
    expect(destinationSure("javascript:alert(1)")).toBe("/creer");
    expect(destinationSure("data:text/html,<script>alert(1)</script>")).toBe("/creer");
  });

  it("refuse un chemin qui ne commence pas par /", () => {
    expect(destinationSure("cockpit")).toBe("/creer");
    expect(destinationSure("exemple-malveillant.fr")).toBe("/creer");
  });

  it("retombe sur la valeur par défaut si rien n'est fourni", () => {
    expect(destinationSure(undefined)).toBe("/creer");
    expect(destinationSure(null)).toBe("/creer");
    expect(destinationSure("")).toBe("/creer");
  });

  it("accepte une valeur par défaut personnalisée", () => {
    expect(destinationSure("https://ailleurs.fr", "/connexion")).toBe("/connexion");
    expect(destinationSure(null, "/connexion")).toBe("/connexion");
  });

  it("renvoie un président connecté vers son cockpit, pas vers l'assistant de création", () => {
    // Le bug du 21/07/2026 : la destination par défaut après connexion était `/creer`.
    // Un président qui gère déjà son club atterrissait sur l'assistant de création, qui y
    // restaurait son brouillon local — jusqu'à lui présenter un club fantôme portant un
    // vieux nom de test. La destination est désormais calculée par
    // destinationApresConnexion() et passée ici en valeur par défaut.
    expect(destinationSure(undefined, "/usmboxe/cockpit")).toBe("/usmboxe/cockpit");
  });

  it("protège aussi cette destination calculée contre une valeur externe", () => {
    // La valeur par défaut change, la règle ne change pas : `next` reste non fiable.
    expect(destinationSure("https://exemple-malveillant.fr", "/usmboxe/cockpit")).toBe("/usmboxe/cockpit");
    expect(destinationSure("//exemple-malveillant.fr", "/usmboxe/cockpit")).toBe("/usmboxe/cockpit");
  });
});
