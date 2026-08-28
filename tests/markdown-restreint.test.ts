import { describe, it, expect } from "vitest";
import { parseMarkdownRestreint, parseInline, urlSure, texteBrut, CONTENU_INFO_MAX } from "@/lib/markdown-restreint";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("markdown restreint — bloc descriptif du formulaire d'inscription", () => {
  it("paragraphes séparés par une ligne vide, retour simple = saut de ligne", () => {
    const b = parseMarkdownRestreint("Bonjour\nà tous\n\nSecond paragraphe");
    expect(b).toHaveLength(2);
    expect(b[0]).toEqual({ type: "paragraphe", enfants: [{ type: "texte", texte: "Bonjour" }, { type: "saut" }, { type: "texte", texte: "à tous" }] });
    expect(texteBrut(b)).toBe("Bonjour\nà tous\n\nSecond paragraphe");
  });

  it("gras et italique", () => {
    expect(parseInline("un **mot** et *un autre*")).toEqual([
      { type: "texte", texte: "un " },
      { type: "gras", enfants: [{ type: "texte", texte: "mot" }] },
      { type: "texte", texte: " et " },
      { type: "italique", enfants: [{ type: "texte", texte: "un autre" }] },
    ]);
  });

  it("un lien vers le planning du club (le cas demandé par un club testeur)", () => {
    const b = parseMarkdownRestreint("Consultez [le planning](https://monclub.fr/planning) avant de choisir.");
    expect(b[0].type).toBe("paragraphe");
    const lien = (b[0] as { enfants: unknown[] }).enfants[1];
    expect(lien).toEqual({ type: "lien", url: "https://monclub.fr/planning", enfants: [{ type: "texte", texte: "le planning" }] });
  });

  it("liste à puces", () => {
    const b = parseMarkdownRestreint("- lundi 18h\n- mercredi 19h\n* vendredi");
    expect(b).toEqual([{ type: "liste", items: [[{ type: "texte", texte: "lundi 18h" }], [{ type: "texte", texte: "mercredi 19h" }], [{ type: "texte", texte: "vendredi" }]] }]);
  });

  it("image seule sur sa ligne = bloc image, avec légende", () => {
    const b = parseMarkdownRestreint("![Planning de la saison](https://monclub.fr/planning.png)");
    expect(b).toEqual([{ type: "image", url: "https://monclub.fr/planning.png", alt: "Planning de la saison" }]);
  });

  it("seules les adresses http(s) absolues sont acceptées — le reste redevient du texte", () => {
    expect(urlSure("https://a.fr/x")).toBe("https://a.fr/x");
    expect(urlSure("http://a.fr")).toBe("http://a.fr");
    expect(urlSure("javascript:alert(1)")).toBeNull();
    expect(urlSure("data:text/html;base64,AAAA")).toBeNull();
    expect(urlSure("/inscription")).toBeNull();
    expect(urlSure("https://a.fr/x\"onmouseover=\"x")).toBeNull();
    // Dans le texte : la syntaxe reste visible telle quelle, aucun lien créé.
    const b = parseMarkdownRestreint("[clic](javascript:alert(1))");
    expect(texteBrut(b)).toBe("[clic](javascript:alert(1))");
    expect(JSON.stringify(b)).not.toContain('"lien"');
  });

  it("ne produit jamais de HTML : balises saisies = texte brut", () => {
    const b = parseMarkdownRestreint("<script>alert(1)</script> <b>gras</b>");
    expect(b).toEqual([{ type: "paragraphe", enfants: [{ type: "texte", texte: "<script>alert(1)</script> <b>gras</b>" }] }]);
  });

  it("étoiles non fermées : texte brut, pas de mise en forme bancale", () => {
    expect(parseInline("2 * 3 = 6")).toEqual([{ type: "texte", texte: "2 * 3 = 6" }]);
    expect(parseInline("**ouvert")).toEqual([{ type: "texte", texte: "**ouvert" }]);
  });

  it("contenu vide ou blanc : aucun bloc", () => {
    expect(parseMarkdownRestreint("")).toEqual([]);
    expect(parseMarkdownRestreint("  \n\n  ")).toEqual([]);
  });

  it("fins de ligne Windows et plafond de longueur", () => {
    expect(parseMarkdownRestreint("a\r\n\r\nb")).toHaveLength(2);
    expect(texteBrut(parseMarkdownRestreint("x".repeat(CONTENU_INFO_MAX + 500))).length).toBe(CONTENU_INFO_MAX);
  });
});

describe("rendu — jamais d'innerHTML, liens et images cadrés", () => {
  const RENDU = lire("src/components/site/TexteRestreint.tsx");
  it("aucun dangerouslySetInnerHTML", () => {
    expect(RENDU).not.toMatch(/dangerouslySetInnerHTML/);
  });
  it("liens en nouvel onglet sans référent, images sans référent", () => {
    expect(RENDU).toMatch(/target="_blank" rel="noopener noreferrer"/);
    expect(RENDU).toMatch(/referrerPolicy="no-referrer"/);
  });
});
