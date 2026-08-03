import { describe, it, expect } from "vitest";
import {
  COULEUR_SECOURS,
  normaliserCouleur,
  estCouleurValide,
  luminanceDe,
  ratioContraste,
  texteSur,
  bordureSur,
  survolDe,
  themeClub,
  accentLisibleSur,
} from "../src/lib/contraste";

// Les dix cas du cahier des charges du lot. Chaque couleur est testée sur les
// mêmes garanties : le texte posé dessus est lisible (≥ 4,5:1), la bordure se
// détache (≥ 3:1), le survol reste lisible et se distingue du repos.
const CAS = [
  { nom: "blanc", hex: "#FFFFFF" },
  { nom: "noir", hex: "#000000" },
  { nom: "jaune très clair", hex: "#FFF9C4" },
  { nom: "vert clair", hex: "#7FD8A4" },
  { nom: "vert Klubster", hex: "#279B65" },
  { nom: "rouge sombre", hex: "#7A1E1E" },
  { nom: "bleu vif", hex: "#1A6FB5" },
] as const;

describe("contraste — texte automatiquement lisible", () => {
  for (const { nom, hex } of CAS) {
    it(`${nom} (${hex}) : le texte choisi passe 4,5:1`, () => {
      expect(ratioContraste(hex, texteSur(hex))).toBeGreaterThanOrEqual(4.5);
    });
  }

  it("jaune très clair et vert clair reçoivent de l'encre, pas du blanc", () => {
    // C'était le bug d'origine : blanc sur fond clair.
    expect(texteSur("#FFF9C4")).toBe("#111111");
    expect(texteSur("#7FD8A4")).toBe("#111111");
  });

  it("rouge sombre et bleu vif reçoivent du blanc", () => {
    expect(texteSur("#7A1E1E")).toBe("#FFFFFF");
    expect(texteSur("#1A6FB5")).toBe("#FFFFFF");
  });
});

describe("contraste — bordures", () => {
  for (const { nom, hex } of CAS) {
    it(`${nom} : la bordure se détache du fond (≥ 3:1)`, () => {
      expect(ratioContraste(bordureSur(hex), hex)).toBeGreaterThanOrEqual(3);
    });
  }
});

describe("contraste — survol", () => {
  for (const { nom, hex } of CAS) {
    it(`${nom} : le texte du repos reste lisible au survol`, () => {
      expect(ratioContraste(survolDe(hex), texteSur(hex))).toBeGreaterThanOrEqual(4.5);
    });
    it(`${nom} : le survol se distingue du repos`, () => {
      expect(survolDe(hex)).not.toBe(normaliserCouleur(hex));
    });
  }
});

describe("contraste — couleur invalide, valeur vide, ancien club", () => {
  it("une valeur invalide retombe sur la couleur de secours", () => {
    for (const mauvaise of ["bleu", "#12", "#GGGGGG", "12345", "#1234567"]) {
      expect(normaliserCouleur(mauvaise)).toBe(COULEUR_SECOURS);
      expect(estCouleurValide(mauvaise)).toBe(false);
    }
  });

  it("une valeur vide ou absente retombe sur la couleur de secours", () => {
    expect(normaliserCouleur("")).toBe(COULEUR_SECOURS);
    expect(normaliserCouleur(null)).toBe(COULEUR_SECOURS);
    expect(normaliserCouleur(undefined)).toBe(COULEUR_SECOURS);
  });

  it("la couleur de secours est elle-même lisible", () => {
    expect(ratioContraste(COULEUR_SECOURS, texteSur(COULEUR_SECOURS))).toBeGreaterThanOrEqual(4.5);
  });

  it("un ancien club garde sa couleur enregistrée, à la casse près", () => {
    // Les clubs existants ont des valeurs comme « #1a6fb5 » ou « 279B65 » :
    // la normalisation unifie la forme sans jamais changer la teinte.
    expect(normaliserCouleur("#1a6fb5")).toBe("#1A6FB5");
    expect(normaliserCouleur("279b65")).toBe("#279B65");
    expect(normaliserCouleur("  #7A1E1E  ")).toBe("#7A1E1E");
    expect(normaliserCouleur("#1AB")).toBe("#11AABB");
  });
});

describe("contraste — luminance et ratio", () => {
  it("luminance : 0 pour le noir, 1 pour le blanc, croissante entre les deux", () => {
    expect(luminanceDe("#000000")).toBe(0);
    expect(luminanceDe("#FFFFFF")).toBe(1);
    expect(luminanceDe("#7A1E1E")).toBeLessThan(luminanceDe("#7FD8A4"));
  });

  it("ratio : 21 entre noir et blanc, 1 entre couleurs identiques", () => {
    expect(ratioContraste("#000000", "#FFFFFF")).toBe(21);
    expect(ratioContraste("#279B65", "#279B65")).toBe(1);
  });
});

describe("contraste — themeClub, l'entrée unique des surfaces", () => {
  it("délivre un ensemble cohérent pour chaque cas", () => {
    for (const { hex } of CAS) {
      const t = themeClub(hex);
      expect(t.accent).toBe(normaliserCouleur(hex));
      expect(ratioContraste(t.accent, t.texteSurAccent)).toBeGreaterThanOrEqual(4.5);
      expect(ratioContraste(t.bordure, t.accent)).toBeGreaterThanOrEqual(3);
      expect(ratioContraste(t.survol, t.texteSurAccent)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("couleur absente : l'ensemble reste utilisable (secours)", () => {
    const t = themeClub(null);
    expect(t.accent).toBe(COULEUR_SECOURS);
    expect(t.texteSurAccent).toBe("#FFFFFF");
  });
});

describe("contraste — accent en couleur de texte (existant, non régressé)", () => {
  it("un accent clair est assombri jusqu'à 4,5:1 sur papier", () => {
    expect(ratioContraste(accentLisibleSur("#7FD8A4", "#FCFCFA"), "#FCFCFA")).toBeGreaterThanOrEqual(4.5);
  });
});
