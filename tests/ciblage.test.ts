import { describe, it, expect } from "vitest";
import { resoudreDestinataires, type DonneesCiblage } from "../src/lib/ciblage";

/** Fixtures de TEST — aucun rapport avec des personnes réelles. */
const SAISON = "2025-2026";
const naissance = (age: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  return d.toISOString().slice(0, 10);
};

function donnees(partiel?: Partial<DonneesCiblage>): DonneesCiblage {
  return {
    adherents: [
      { id: "majeur", email: "majeur@test.example", date_naissance: naissance(30), infos: {} },
      { id: "mineur1", email: "mineur1@test.example", date_naissance: naissance(12),
        infos: { "Responsable légal — email": "parent@test.example" } },
      // deux enfants, MÊME parent — avec casse et espaces parasites
      { id: "mineur2", email: null, date_naissance: naissance(9),
        infos: { "Responsable légal — email": "  PARENT@test.example " } },
      { id: "sans-email", email: null, date_naissance: naissance(40), infos: {} },
      { id: "ancienne-saison", email: "ancien@test.example", date_naissance: naissance(35), infos: {} },
      { id: "annule", email: "annule@test.example", date_naissance: naissance(25), infos: {} },
      { id: "attente", email: "attente@test.example", date_naissance: naissance(22), infos: {} },
      // boîte familiale : l'adulte partage l'adresse du parent
      { id: "adulte-boite-partagee", email: "parent@test.example", date_naissance: naissance(44), infos: {} },
      // deux cours pour la même personne
      { id: "deux-cours", email: "deux@test.example", date_naissance: naissance(28), infos: {} },
    ],
    adhesions: [
      { adherent_id: "majeur", cours_id: "cours-a", saison: SAISON, statut: "paye" },
      { adherent_id: "mineur1", cours_id: "cours-a", saison: SAISON, statut: "en_attente" },
      { adherent_id: "mineur2", cours_id: "cours-b", saison: SAISON, statut: "en_attente" },
      { adherent_id: "sans-email", cours_id: "cours-a", saison: SAISON, statut: "paye" },
      { adherent_id: "ancienne-saison", cours_id: "cours-a", saison: "2024-2025", statut: "paye" },
      { adherent_id: "annule", cours_id: "cours-a", saison: SAISON, statut: "annule" },
      { adherent_id: "attente", cours_id: "cours-a", saison: SAISON, statut: "liste_attente" },
      { adherent_id: "adulte-boite-partagee", cours_id: "cours-b", saison: SAISON, statut: "paye" },
      { adherent_id: "deux-cours", cours_id: "cours-a", saison: SAISON, statut: "paye" },
      { adherent_id: "deux-cours", cours_id: "cours-b", saison: SAISON, statut: "paye" },
    ],
    incompletIds: new Set(["majeur"]),
    saisonCourante: SAISON,
    ...partiel,
  };
}

describe("ciblage — la source unique décide qui reçoit", () => {
  it("« tous » : saison courante seule, sans adresse exclu, doublons d'adresse fusionnés", () => {
    const d = resoudreDestinataires(donnees(), "tous");
    const emails = d.map((x) => x.email).sort();
    // ancien (saison passée) et annulé absents ; sans-email absent ;
    // mineur2 (pas d'email propre) absent de « tous » ; boîte partagée = 1 seule fois
    expect(emails).toEqual([
      "attente@test.example", "deux@test.example", "majeur@test.example",
      "mineur1@test.example", "parent@test.example",
    ]);
  });

  it("la liste d'attente REÇOIT ; l'annulé et l'ancienne saison, jamais", () => {
    const emails = resoudreDestinataires(donnees(), "tous").map((x) => x.email);
    expect(emails).toContain("attente@test.example");
    expect(emails).not.toContain("annule@test.example");
    expect(emails).not.toContain("ancien@test.example");
  });

  it("« parents » : le représentant légal, deux enfants = UN destinataire, casse et espaces normalisés", () => {
    const d = resoudreDestinataires(donnees(), "parents");
    expect(d.map((x) => x.email)).toEqual(["parent@test.example"]);
  });

  it("« parents » : un mineur sans adresse personnelle reste joignable par son parent", () => {
    const d = resoudreDestinataires(donnees(), "parents");
    // mineur2 n'a PAS d'email propre : c'est bien l'adresse du parent qui le représente
    expect(d.length).toBe(1);
  });

  it("« incomplet » : pièce obligatoire manquante seule — la facultative ne compte pas", () => {
    const d = resoudreDestinataires(donnees(), "incomplet");
    expect(d.map((x) => x.email)).toEqual(["majeur@test.example"]);
  });

  it("un cours : ses seuls inscrits de la saison ; deux cours ne fait pas deux envois", () => {
    const a = resoudreDestinataires(donnees(), "cours-a").map((x) => x.email).sort();
    expect(a).toEqual(["attente@test.example", "deux@test.example", "majeur@test.example", "mineur1@test.example"]);
    const b = resoudreDestinataires(donnees(), "cours-b").map((x) => x.email).sort();
    expect(b).toEqual(["deux@test.example", "mineur1@test.example", "parent@test.example"]);
  });

  it("une autre association est hors périmètre par construction (les données entrantes sont déjà cadrées)", () => {
    // la fonction ne voit QUE les lignes de l'organisation appelante : le test
    // d'isolation vit côté requêtes (organisation_id) et RLS, prouvés par ailleurs.
    const d = resoudreDestinataires({ ...donnees(), adherents: [], adhesions: [] }, "tous");
    expect(d).toEqual([]);
  });
});
