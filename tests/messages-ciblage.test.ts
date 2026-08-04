import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ACTIONS = lire("src/app/[asso]/cockpit/communication/actions.ts");
const PAGE = lire("src/app/[asso]/cockpit/communication/page.tsx");
const CLIENT = lire("src/app/[asso]/cockpit/communication/Communication.tsx");
const LIB = lire("src/lib/ciblage.ts");

describe("messages — une SEULE source décide qui reçoit", () => {
  it("l'envoi et la page consomment resoudreDestinataires — aucune copie des règles", () => {
    expect(ACTIONS).toMatch(/resoudreDestinataires\(/);
    expect(PAGE).toMatch(/resoudreDestinataires\(/);
    // plus aucune règle locale : ni minorité ni représentant dans l'action/page
    expect(ACTIONS).not.toMatch(/function estMineur/);
    expect(PAGE).not.toMatch(/seuilMineur/);
  });

  it("le client n'invente rien : il lit la liste précalculée du groupe", () => {
    expect(CLIENT).toMatch(/listes\[groupe\] \?\? \[\]/);
  });

  it("« parents » écrit au représentant légal, repli sur le compte — dans la lib", () => {
    expect(LIB).toMatch(/Responsable légal — email/);
    expect(LIB).toMatch(/\|\| a\.email/);
  });

  it("« incomplets » = obligatoires manquantes ; requêtes alignées des deux côtés", () => {
    for (const f of [ACTIONS, PAGE]) {
      expect(f).toMatch(/\.eq\("obligatoire", true\)/);
      expect(f).not.toMatch(/"recue"/);
    }
  });

  it("le périmètre est la saison courante, l'annulé et le remboursé sont dehors, la liste d'attente dedans", () => {
    expect(LIB).toMatch(/STATUTS_JOIGNABLES = new Set\(\["en_attente", "paye", "en_retard", "liste_attente"\]\)/);
    expect(LIB).toMatch(/saisonCourante/);
  });
});
