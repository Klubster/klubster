import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

// Lot S — sentinelles des fondations d'interface.
// Trois régressions déjà payées qu'elles empêchent de revenir :
//   1. les couleurs de statut recodées en hex inline, écran par écran (50 fichiers au départ) ;
//   2. la disparition silencieuse d'une frontière loading/error ;
//   3. un token de statut qui repasse sous le seuil de contraste AA.

const RACINE = join(__dirname, "..");

function fichiersTsx(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) fichiersTsx(p, out);
    else if (/\.tsx?$/.test(e)) out.push(p);
  }
  return out;
}

// Les commentaires peuvent citer un hex (pour expliquer un choix) : on ne juge que le code.
function codeSeul(chemin: string): string {
  return readFileSync(chemin, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const ZONES_MIGREES = ["src/app/[asso]", "src/app/admin", "src/app/connexion", "src/components/cockpit"];

describe("lot S — plus d'hex de statut inline dans les zones migrées", () => {
  const fichiers = ZONES_MIGREES.flatMap((z) => fichiersTsx(join(RACINE, z)));

  it("balaie un périmètre non vide (le jour où le dossier bouge, ce test doit crier)", () => {
    expect(fichiers.length).toBeGreaterThan(20);
  });

  // Exceptions assumées : les pastilles d'aperçu des templates (identite) montrent la
  // couleur du thème lui-même — l'hex y est le contenu — et l'image OpenGraph est un
  // rendu Satori où les classes Tailwind n'existent pas.
  const EXCEPTIONS_STYLE_HEX = [
    "src/app/[asso]/cockpit/identite/page.tsx",
    "src/app/[asso]/opengraph-image.tsx",
    "src/app/[asso]/icone/route.tsx", // icône PWA : rendu Satori, pas de classes
  ];

  it("aucun style inline ne porte un hex littéral (hors aperçus de thème)", () => {
    // Cible : style={{ … "#B23B3B" … }}. Les couleurs dynamiques du club (variables,
    // couleur_primaire) restent légitimes — elles ne sont pas des littéraux hex.
    const interdit = /style=\{\{[^}]*["']#[0-9A-Fa-f]{6}/;
    for (const f of fichiers) {
      if (EXCEPTIONS_STYLE_HEX.some((e) => f.split("\\").join("/").endsWith(e))) continue;
      expect(codeSeul(f), f).not.toMatch(interdit);
    }
  });

  it("les anciens hex de statut ne réapparaissent nulle part dans le code migré", () => {
    // #8A6A2F : un QUATRIÈME ocre découvert pendant la migration (admin, connexion) —
    // la preuve vivante de ce que produit l'absence de token.
    const interdit = /#(B23B3B|1E7A4F|8A6508|8A6A2F|B8860B|FBEDED)\b/;
    for (const f of fichiers) {
      expect(codeSeul(f), f).not.toMatch(interdit);
    }
  });
});

describe("lot S — les frontières loading/error existent", () => {
  const attendus = [
    "src/app/[asso]/cockpit/loading.tsx",
    "src/app/[asso]/cockpit/error.tsx",
    "src/app/[asso]/espace/loading.tsx",
    "src/app/[asso]/espace/error.tsx",
    "src/app/[asso]/inscription/loading.tsx",
    "src/app/[asso]/inscription/error.tsx",
    "src/app/admin/loading.tsx",
    "src/app/admin/error.tsx",
  ];
  for (const f of attendus) {
    it(`${f} est présent`, () => {
      expect(existsSync(join(RACINE, f))).toBe(true);
    });
  }

  it("chaque error.tsx est un composant client qui journalise et propose reset", () => {
    for (const f of attendus.filter((a) => a.endsWith("error.tsx"))) {
      const src = readFileSync(join(RACINE, f), "utf8");
      expect(src, f).toMatch(/^"use client";/);
      expect(src, f).toMatch(/console\.error/); // ne jamais avaler une erreur
      expect(src, f).toMatch(/reset/);
    }
  });
});

describe("lot S — tokens de statut lisibles (AA) et composants sans ombre", () => {
  it("tailwind : success/warning/danger portent les valeurs AA décidées au lot S", () => {
    const cfg = readFileSync(join(RACINE, "tailwind.config.ts"), "utf8");
    expect(cfg).toMatch(/success:\s*(\{\s*DEFAULT:\s*)?"#1E7A4F"/);
    expect(cfg).toMatch(/warning:\s*"#8A6508"/);
    expect(cfg).toMatch(/danger:\s*\{\s*DEFAULT:\s*"#B23B3B"/);
  });

  it("les composants ui/ ne portent aucune ombre — la DA du produit n'en a pas", () => {
    for (const f of fichiersTsx(join(RACINE, "src/components/ui"))) {
      expect(codeSeul(f), f).not.toMatch(/shadow-(sm|md|lg|xl)/);
    }
  });

  it("ui/Button : le primaire est bien le motif réel du produit (mono, encre, 44px)", () => {
    const src = readFileSync(join(RACINE, "src/components/ui/Button.tsx"), "utf8");
    expect(src).toMatch(/mono/);
    expect(src).toMatch(/min-h-\[44px\]/);
    expect(src).toMatch(/bg-ink text-paper/);
  });
});
