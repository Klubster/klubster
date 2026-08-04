import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cellule, ligneCsv, fichierCsv } from "../src/lib/csv-export";

describe("écriture CSV — injection de formule neutralisée", () => {
  it("préfixe d'une apostrophe les cellules qui commenceraient une formule", () => {
    // Reproduit sur klubster-dev : un adhérent nommé « =cmd|' /C calc'!A1 »
    // ressortait tel quel et Excel y voyait une formule, pas un prénom.
    expect(cellule("=cmd|' /C calc'!A1")).toBe(`"'=cmd|' /C calc'!A1"`);
    expect(cellule("+1234567890")).toBe(`"'+1234567890"`);
    expect(cellule("-2+3")).toBe(`"'-2+3"`);
    expect(cellule("@SUM(1+1)")).toBe(`"'@SUM(1+1)"`);
    expect(cellule("\tvaleur")).toBe(`"'\tvaleur"`);
  });

  it("ne touche pas à une valeur normale, même avec des accents ou une apostrophe", () => {
    expect(cellule("Anaïs O'Connor")).toBe(`"Anaïs O'Connor"`);
    expect(cellule("Saint-Étienne")).toBe(`"Saint-Étienne"`);
    // Le tiret en MILIEU de chaîne n'est pas une formule.
    expect(cellule("Durand-Lefèvre")).toBe(`"Durand-Lefèvre"`);
  });

  it("échappe les guillemets, garde virgules, points-virgules et retours à la ligne", () => {
    expect(cellule('Il a dit "oui"')).toBe(`"Il a dit ""oui"""`);
    expect(cellule("Dupont, Jean")).toBe(`"Dupont, Jean"`);
    expect(cellule("a;b")).toBe(`"a;b"`);
    expect(cellule("deux\nlignes")).toBe(`"deux\nlignes"`);
  });

  it("null, undefined et 0 ne deviennent pas du texte parasite", () => {
    expect(cellule(null)).toBe(`""`);
    expect(cellule(undefined)).toBe(`""`);
    expect(cellule(0)).toBe(`"0"`);
  });

  it("le fichier porte le BOM UTF-8 et des fins de ligne CRLF", () => {
    const f = fichierCsv([["a", "b"], ["1", "2"]]);
    expect(f.startsWith("﻿")).toBe(true);
    expect(f).toContain("\r\n");
    expect(f).toBe('﻿"a";"b"\r\n"1";"2"');
  });

  it("le séparateur est le point-virgule — l'Excel français ouvre sans assistant", () => {
    expect(ligneCsv(["a", "b", "c"])).toBe('"a";"b";"c"');
  });
});

describe("l'export porte réellement les données du club", () => {
  const route = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/export/route.ts"), "utf8");

  it("inclut ce qui manquait et rendait « export complet » faux", () => {
    for (const colonne of [
      "Identifiant",
      "Date de naissance",
      "Mineur",
      "Email du responsable légal",
      "Opposition aux communications",
      "Montant réglé",
      "Reste à payer",
      "État financier",
      "Règlements (détail)",
      "Pièces obligatoires manquantes",
      "Pièces fournies",
    ]) {
      expect(route, colonne).toContain(colonne);
    }
  });

  it("les montants viennent de la source financière unique, pas d'un calcul local", () => {
    expect(route).toMatch(/etatFinancier\(/);
    expect(route).toMatch(/libelleFinancier\(/);
  });

  it("n'exporte AUCUNE donnée de santé", () => {
    // On regarde la requête et les colonnes, pas les commentaires : la table
    // `questionnaires_sante` ne doit jamais être jointe, ni ses champs sortir.
    const sansCommentaires = route.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
    expect(sansCommentaires).not.toMatch(/questionnaires_sante/);
    expect(sansCommentaires).not.toMatch(/signataire|resultat/i);
  });

  it("ne compte comme manquantes que les pièces obligatoires (règle du 04/08)", () => {
    expect(route).toMatch(/statut === "manquante" && p\.obligatoire/);
  });

  it("reste réservé au président, au secrétaire et au trésorier", () => {
    expect(route).toMatch(/peut\(profil\.role, "adherents_ecriture"\) \|\| peut\(profil\.role, "paiements"\)/);
    expect(route).toMatch(/organisation_id.*org\.id|eq\("organisation_id", org\.id\)/);
  });

  it("les deux exports du produit passent par la même écriture CSV", () => {
    expect(route).toMatch(/from "@\/lib\/csv-export"/);
    const client = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/paiements/PaiementsClient.tsx"), "utf8");
    expect(client).toMatch(/fichierCsv\(/);
    // plus aucun échappement maison qui oublierait la neutralisation
    expect(client).not.toMatch(/replace\(\/"\/g, '""'\)/);
  });
});

describe("cohérence état ↔ montant (corrigé au lot P)", () => {
  it("un état où rien n'est dû annonce zéro, pas un solde théorique", async () => {
    const { etatFinancier } = await import("../src/lib/finances");
    // Liste d'attente : le club ne doit RIEN réclamer à quelqu'un sans place.
    const attente = etatFinancier({ montantCentimes: 18000, statut: "liste_attente", reglementsCentimes: [9000] });
    expect(attente.etat).toBe("liste_attente");
    expect(attente.resteCentimes).toBe(0);
    expect(attente.regleCentimes).toBe(9000); // ce qui a été encaissé reste visible

    const annule = etatFinancier({ montantCentimes: 20000, statut: "annule", reglementsCentimes: [] });
    expect(annule.resteCentimes).toBe(0);

    // Une adhésion active, elle, garde son solde réel.
    const partiel = etatFinancier({ montantCentimes: 18000, statut: "en_attente", reglementsCentimes: [9000] });
    expect(partiel.etat).toBe("partiellement_regle");
    expect(partiel.resteCentimes).toBe(9000);
  });
});
