import { describe, it, expect } from "vitest";
import {
  normaliserPageConfig,
  SECTIONS_STANDARD,
  TAILLES_LOGO,
  tailleLogoSure,
  classeLogoHero,
} from "@/lib/page-config";
import type { PageConfig, SectionCustom } from "@/types/db";

/**
 * Composition de la vitrine d'un club. Cette fonction décide de ce que voient les
 * visiteurs : une erreur ici fait disparaître le planning d'un club, ou ressusciter un
 * chapitre qu'il avait retiré.
 */

const chapitre = (id: string): SectionCustom => ({
  id, type: "faq", titre: null, texte: null, texte2: null, image_url: null,
});

describe("normaliserPageConfig", () => {
  it("part d'une config vide avec toutes les sections standard", () => {
    const pc = normaliserPageConfig(null);
    expect(pc.ordre).toEqual([...SECTIONS_STANDARD]);
    expect(pc.custom).toEqual([]);
  });

  it("conserve l'ordre choisi par le club", () => {
    const pc = normaliserPageConfig({ ordre: ["tarifs", "cours"], custom: [] } as PageConfig);
    expect(pc.ordre.slice(0, 2)).toEqual(["tarifs", "cours"]);
  });

  it("ajoute les sections standard absentes de l'ordre", () => {
    const pc = normaliserPageConfig({ ordre: ["tarifs"], custom: [] } as PageConfig);
    for (const s of SECTIONS_STANDARD) expect(pc.ordre).toContain(s);
  });

  it("ne ressuscite PAS une section explicitement masquée", () => {
    // Le cœur du sujet : sans la liste `masquees`, la ligne précédente remettait
    // aussitôt le chapitre retiré, et la suppression n'avait aucun effet visible.
    const pc = normaliserPageConfig({ ordre: [], custom: [], masquees: ["planning"] } as PageConfig);
    expect(pc.ordre).not.toContain("planning");
    expect(pc.masquees).toContain("planning");
    // Les autres restent bien là.
    expect(pc.ordre).toContain("cours");
    expect(pc.ordre).toContain("tarifs");
  });

  it("peut masquer plusieurs sections à la fois", () => {
    const pc = normaliserPageConfig({
      ordre: [], custom: [], masquees: ["planning", "contact", "infos"],
    } as PageConfig);
    expect(pc.ordre).not.toContain("planning");
    expect(pc.ordre).not.toContain("contact");
    expect(pc.ordre).not.toContain("infos");
    expect(pc.ordre).toContain("presentation");
  });

  it("ignore une clé masquée inconnue", () => {
    // Une donnée abîmée ne doit pas faire disparaître autre chose.
    const pc = normaliserPageConfig({ ordre: [], custom: [], masquees: ["nawak"] } as PageConfig);
    expect(pc.masquees).not.toContain("nawak");
    expect(pc.ordre).toEqual([...SECTIONS_STANDARD]);
  });

  it("retire les clés inconnues de l'ordre", () => {
    const pc = normaliserPageConfig({ ordre: ["cours", "fantome"], custom: [] } as PageConfig);
    expect(pc.ordre).not.toContain("fantome");
  });

  it("supprime les doublons dans l'ordre", () => {
    const pc = normaliserPageConfig({ ordre: ["cours", "cours", "tarifs"], custom: [] } as PageConfig);
    expect(pc.ordre.filter((k) => k === "cours")).toHaveLength(1);
  });

  it("ajoute en fin les chapitres personnalisés absents de l'ordre", () => {
    const pc = normaliserPageConfig({ ordre: [], custom: [chapitre("c1")] } as PageConfig);
    expect(pc.ordre.at(-1)).toBe("c1");
  });

  it("écarte un chapitre personnalisé sans identifiant", () => {
    const pc = normaliserPageConfig({
      ordre: [], custom: [{ ...chapitre("c1"), id: undefined as unknown as string }],
    } as PageConfig);
    expect(pc.custom).toHaveLength(0);
  });

  it("affiche le logo du hero par défaut", () => {
    // Un club qui n'a jamais touché au réglage doit voir son logo.
    expect(normaliserPageConfig(null).hero?.logo).toBe(true);
  });

  it("respecte le choix de masquer le logo", () => {
    const pc = normaliserPageConfig({ ordre: [], custom: [], hero: { logo: false } } as PageConfig);
    expect(pc.hero?.logo).toBe(false);
  });

  it("donne au logo la taille normale par défaut", () => {
    expect(normaliserPageConfig(null).hero?.logoTaille).toBe("m");
  });

  it("respecte la taille choisie", () => {
    const pc = normaliserPageConfig({ ordre: [], custom: [], hero: { logoTaille: "xl" } } as PageConfig);
    expect(pc.hero?.logoTaille).toBe("xl");
  });
});

describe("tailleLogoSure — la valeur vient d'un formulaire, donc du dehors", () => {
  it("garde les paliers connus", () => {
    for (const t of ["s", "m", "l", "xl"] as const) expect(tailleLogoSure(t)).toBe(t);
  });

  it("retombe sur « m » devant une valeur inventée", () => {
    // Un champ trafiqué ne doit pas produire une classe Tailwind inexistante :
    // le logo disparaîtrait purement et simplement de la page.
    expect(tailleLogoSure("gigantesque")).toBe("m");
    expect(tailleLogoSure("")).toBe("m");
    expect(tailleLogoSure(null)).toBe("m");
    expect(tailleLogoSure(undefined)).toBe("m");
    expect(tailleLogoSure(42)).toBe("m");
  });

  it("ne se laisse pas piéger par une clé héritée d'Object", () => {
    // `"toString" in TAILLES_LOGO` est vrai via le prototype — d'où le contrôle.
    expect(tailleLogoSure("toString")).toBe("m");
    expect(tailleLogoSure("constructor")).toBe("m");
  });
});

describe("classeLogoHero", () => {
  it("rend toujours des classes utilisables", () => {
    expect(classeLogoHero(null)).toContain("object-contain");
    expect(classeLogoHero(null)).toContain("h-32");
  });

  it("grandit avec le palier choisi", () => {
    const petit = classeLogoHero({ ordre: [], custom: [], hero: { logoTaille: "s" } } as PageConfig);
    const grand = classeLogoHero({ ordre: [], custom: [], hero: { logoTaille: "xl" } } as PageConfig);
    expect(petit).not.toBe(grand);
    expect(petit).toContain("h-20");
    expect(grand).toContain("h-48");
  });

  it("chaque palier prévoit une taille mobile distincte de la taille bureau", () => {
    // Sinon un logo « très grand » occuperait tout l'écran d'un téléphone.
    for (const t of ["s", "m", "l", "xl"] as const) {
      const c = TAILLES_LOGO[t].classe;
      expect(c).toMatch(/(^| )h-\d+/);
      expect(c).toMatch(/md:h-\d+/);
    }
  });
});
