import { describe, it, expect } from "vitest";
import {
  parseMarkdownRestreint,
  parseInline,
  urlSure,
  texteBrut,
  CONTENU_INFO_MAX,
  BASE_STOCKAGE,
  urlImageSure,
  urlsImagesBrutes,
} from "@/lib/markdown-restreint";
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
    // Depuis le 28/08/2026, une image ne s'affiche que si elle vient de notre stockage
    // (le bouton « Ajouter une image » de l'Atelier) — voir le bloc dédié plus bas.
    const url = `${BASE_STOCKAGE}11111111-2222-3333-4444-555555555555/bloc-planning.png`;
    const b = parseMarkdownRestreint(`![Planning de la saison](${url})`);
    expect(b).toEqual([{ type: "image", url, alt: "Planning de la saison" }]);
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

/**
 * Images restreintes au stockage Klubster — arbitrage du 28/08/2026.
 *
 * Une image se télécharge toute seule à l'affichage : hébergée ailleurs, elle envoie
 * l'IP de chaque visiteur du formulaire chez un tiers. Un lien, lui, ne charge rien
 * sans un clic — c'est pourquoi les liens restent libres.
 */
describe("images : seul le stockage Klubster s'affiche", () => {
  const NOTRE = `${BASE_STOCKAGE}11111111-2222-3333-4444-555555555555/bloc-planning.png`;

  it("une image de notre stockage devient un bloc image", () => {
    const blocs = parseMarkdownRestreint(`![Planning](${NOTRE})`);
    expect(blocs).toEqual([{ type: "image", url: NOTRE, alt: "Planning" }]);
  });

  it("une image hébergée ailleurs ne se télécharge pas : elle retombe en lien", () => {
    const blocs = parseMarkdownRestreint("![Planning](https://un-tiers.example/pixel.png)");
    expect(blocs.some((b) => b.type === "image")).toBe(false);
    const [bloc] = blocs;
    expect(bloc.type).toBe("paragraphe");
    if (bloc.type === "paragraphe") {
      const lien = bloc.enfants.find((n) => n.type === "lien");
      expect(lien).toBeTruthy();
      if (lien && lien.type === "lien") expect(lien.url).toBe("https://un-tiers.example/pixel.png");
    }
  });

  it("un lien vers un site extérieur reste un lien", () => {
    const blocs = parseMarkdownRestreint("Voir [le planning](https://votreclub.fr/planning) du club.");
    const [bloc] = blocs;
    expect(bloc.type).toBe("paragraphe");
    if (bloc.type === "paragraphe") {
      expect(bloc.enfants.some((n) => n.type === "lien" && n.url === "https://votreclub.fr/planning")).toBe(true);
    }
  });

  it("urlImageSure refuse tout ce qui n'est pas notre stockage", () => {
    expect(urlImageSure(NOTRE)).toBe(NOTRE);
    expect(urlImageSure("https://un-tiers.example/x.png")).toBeNull();
    expect(urlImageSure("javascript:alert(1)")).toBeNull();
    expect(urlImageSure("data:image/png;base64,AAAA")).toBeNull();
    expect(urlImageSure("/local/x.png")).toBeNull();
    // Un domaine qui commence pareil mais n'est pas le nôtre.
    expect(urlImageSure("https://basnfuvdjobanejahayt.supabase.co.evil.test/storage/v1/object/public/sections/x.png")).toBeNull();
  });

  it("les adresses d'images sont lisibles telles quelles pour la validation serveur", () => {
    const contenu = `Texte\n\n![A](${NOTRE})\n\n![B](https://un-tiers.example/b.png)`;
    expect(urlsImagesBrutes(contenu)).toEqual([NOTRE, "https://un-tiers.example/b.png"]);
  });
});
