import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ACTIONS = lire("src/app/[asso]/cockpit/communication/actions.ts");
const PAGE = lire("src/app/[asso]/cockpit/communication/page.tsx");
const CLIENT = lire("src/app/[asso]/cockpit/communication/Communication.tsx");

describe("messages — « prévenez les parents » écrit AU représentant légal", () => {
  it("l'envoi résout l'adresse du représentant, avec repli sur le compte", () => {
    expect(ACTIONS).toMatch(/Responsable légal — email/);
    expect(ACTIONS).toMatch(/\|\| a\.email/);
  });

  it("un mineur sans adresse personnelle n'est plus exclu du ciblage parents", () => {
    // l'ancien code filtrait .not("email","is",null) AVANT le groupe
    expect(ACTIONS).not.toMatch(/\.not\("email", "is", null\)/);
  });

  it("le compteur affiché suit LA MÊME résolution que l'envoi", () => {
    expect(PAGE).toMatch(/Responsable légal — email/);
    expect(CLIENT).toMatch(/groupe === "parents" \? m\.emailParent : m\.email/);
  });

  it("déduplication par adresse : deux enfants d'un même parent = un destinataire", () => {
    expect(ACTIONS).toMatch(/parEmail\.has\(email\)/);
    expect(CLIENT).toMatch(/new Set\(/);
    expect(CLIENT).toMatch(/toLowerCase\(\)/);
  });
});

describe("messages — le ciblage « dossiers incomplets » suit la règle du 04/08", () => {
  it("manquante ET obligatoire, plus jamais « recue »", () => {
    for (const f of [ACTIONS, PAGE]) {
      expect(f).not.toMatch(/"recue"/);
      expect(f).toMatch(/\.eq\("obligatoire", true\)/);
    }
  });
});
