import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  STATUTS_PIECE,
  STATUTS_PIECE_FOURNIE,
  STATUT_PIECE_MANQUANTE,
  basculerStatutPiece,
  estFournie,
  estManquante,
  libellePiece,
} from "@/lib/pieces";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("statuts de pièce", () => {
  it("n'admet que les trois valeurs de la contrainte de base", () => {
    expect([...STATUTS_PIECE]).toEqual(["manquante", "fournie", "par_email"]);
  });

  it("« recue » et « attendue » ne sont pas des statuts", () => {
    expect(STATUTS_PIECE as readonly string[]).not.toContain("recue");
    expect(STATUTS_PIECE as readonly string[]).not.toContain("attendue");
  });

  it("une pièce fournie ou reçue par email n'est plus manquante", () => {
    for (const s of STATUTS_PIECE_FOURNIE) {
      expect(estFournie(s)).toBe(true);
      expect(estManquante(s)).toBe(false);
    }
    expect(estManquante(STATUT_PIECE_MANQUANTE)).toBe(true);
  });

  it("un statut absent ou inconnu compte comme manquant", () => {
    // Prudence volontaire : mieux vaut relancer une famille à tort que classer un dossier
    // incomplet comme réglé.
    expect(estManquante(null)).toBe(true);
    expect(estManquante(undefined)).toBe(true);
    expect(estManquante("recue")).toBe(true);
  });

  it("la bascule produit toujours une valeur acceptée par la base", () => {
    for (const s of [...STATUTS_PIECE, null, undefined, "recue"]) {
      expect(STATUTS_PIECE as readonly string[]).toContain(basculerStatutPiece(s));
    }
    expect(basculerStatutPiece("manquante")).toBe("fournie");
    expect(basculerStatutPiece("fournie")).toBe("manquante");
    expect(basculerStatutPiece("par_email")).toBe("manquante");
  });

  it("distingue une pièce reçue par email à l'écran", () => {
    expect(libellePiece("par_email")).toContain("email");
    expect(libellePiece("fournie")).toBe("✓ Reçue");
    expect(libellePiece("manquante")).toBe("○ Manquante");
  });
});

describe("aucun statut de pièce en dur hors du module", () => {
  const fichiers = [
    "src/lib/queries.ts",
    "src/app/[asso]/cockpit/adherents/actions.ts",
    "src/app/[asso]/cockpit/adherents/page.tsx",
    "src/app/[asso]/cockpit/adherents/[id]/page.tsx",
    "src/app/[asso]/cockpit/communication/page.tsx",
    "src/app/[asso]/cockpit/communication/actions.ts",
  ];

  it.each(fichiers)("%s n'invente plus de statut", (f) => {
    const src = lire(f);
    // Ces trois littéraux sont exactement ceux qui avaient divergé de la base.
    expect(src).not.toMatch(/"recue"|'recue'/);
    expect(src).not.toMatch(/"attendue"|'attendue'/);
  });

  it("les écrans qui lisent le statut passent par le module", () => {
    for (const f of fichiers) {
      const src = lire(f);
      if (/statut/.test(src) && /pieces_adherent|libellePiece|estFournie/.test(src)) {
        expect(src).toMatch(/from "@\/lib\/pieces"/);
      }
    }
  });
});
