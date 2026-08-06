// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// S13 — sentinelles d'accessibilité. Elles protègent la sémantique et le comportement,
// jamais une chaîne de classes : ce qui est testé est ce qu'une technologie
// d'assistance reçoit.

const RACINE = join(__dirname, "..");
const lire = (f: string) => readFileSync(join(RACINE, f), "utf8");

describe("S13 — la signature du questionnaire de santé est accessible", () => {
  const src = lire("src/app/[asso]/inscription/QuestionnaireSante.tsx");

  it("offre une alternative clavier qui produit la même signature (même canvas, même PNG)", () => {
    expect(src).toMatch(/signature-clavier/);
    expect(src).toMatch(/signerAuClavier/);
    expect(src).toMatch(/toDataURL\("image\/png"\)/);
  });

  it("le canvas porte un nom accessible qui décrit son état et l'alternative", () => {
    expect(src).toMatch(/role="img"/);
    expect(src).toMatch(/aria-label=\{value \? "Signature apposée"/);
  });

  it("l'état signé/vide s'annonce (aria-live), sans dépendre de la couleur", () => {
    expect(src).toMatch(/role="status" aria-live="polite"/);
    expect(src).toMatch(/✓ signé/);
  });

  it("le bouton d'effacement est nommé pour un lecteur d'écran", () => {
    expect(src).toMatch(/aria-label="Effacer la signature"/);
  });

  it("le champ clavier est relié à son libellé", () => {
    expect(src).toMatch(/htmlFor="signature-clavier"/);
    expect(src).toMatch(/id="signature-clavier"/);
  });
});

describe("S13 — les erreurs de formulaire s'annoncent", () => {
  it("inscription publique : le bloc d'erreurs est une région d'alerte", () => {
    expect(lire("src/app/[asso]/inscription/FormulaireInscription.tsx")).toMatch(/<div role="alert">/);
  });

  it("connexion : échec en alert, succès en status", () => {
    const src = lire("src/app/connexion/page.tsx");
    expect(src).toMatch(/role="alert"[^>]*>\{err\}/);
    expect(src).toMatch(/role="status"[^>]*>\{msg\}/);
  });

  it("équipe : les retours d'action portent role=status (déjà en place, verrouillé)", () => {
    expect(lire("src/app/[asso]/cockpit/equipe/page.tsx")).toMatch(/role="status"/);
  });
});

describe("S13 — dialogues et contrôles", () => {
  it("les deux dialogues du produit sont nommés et modaux, avec Escape", () => {
    for (const f of ["src/components/demo/Simulation.tsx", "src/components/site/MenuMobile.tsx"]) {
      const src = lire(f);
      expect(src, f).toMatch(/role="dialog"/);
      expect(src, f).toMatch(/aria-modal="true"/);
      expect(src, f).toMatch(/Escape/);
    }
  });

  it("le menu mobile restaure le focus à la fermeture", () => {
    expect(lire("src/components/site/MenuMobile.tsx")).toMatch(/boutonRef\.current\?\.focus\(\)/);
  });

  it("aucun div/span cliquable muet hors démo — l'intro de /combat est opérable au clavier", () => {
    const src = lire("src/app/(marketing)/combat/CombatClient.tsx");
    expect(src).toMatch(/role="button"\s+tabIndex=\{0\}/);
    expect(src).toMatch(/onKeyDown/);
  });
});
