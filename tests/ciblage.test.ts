import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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
    // mineur2 (cours-b) n'a pas d'adresse propre : hors « parents », il n'est pas
    // joignable — c'est le libellé du groupe qui le dit, pas un oubli.
    expect(b).toEqual(["deux@test.example", "parent@test.example"]);
  });

  it("une autre association est hors périmètre par construction (les données entrantes sont déjà cadrées)", () => {
    // la fonction ne voit QUE les lignes de l'organisation appelante : le test
    // d'isolation vit côté requêtes (organisation_id) et RLS, prouvés par ailleurs.
    const d = resoudreDestinataires({ ...donnees(), adherents: [], adhesions: [] }, "tous");
    expect(d).toEqual([]);
  });

  it("opposition : exclu de « tous », des cours et de « parents » (communications facultatives)", () => {
    const base = donnees();
    const opposes = {
      ...base,
      adherents: base.adherents.map((a) =>
        a.id === "majeur" ? { ...a, opposition_communications: "2026-08-04T10:00:00Z" } : a
      ),
    };
    expect(resoudreDestinataires(opposes, "tous").map((x) => x.email)).not.toContain("majeur@test.example");
    expect(resoudreDestinataires(opposes, "cours-a").map((x) => x.email)).not.toContain("majeur@test.example");
    // témoin : sans opposition, il y était
    expect(resoudreDestinataires(base, "tous").map((x) => x.email)).toContain("majeur@test.example");
  });

  it("opposition : « dossiers incomplets » reste servi — message nécessaire, pas une communication", () => {
    const base = donnees();
    const opposes = {
      ...base,
      adherents: base.adherents.map((a) =>
        a.id === "majeur" ? { ...a, opposition_communications: "2026-08-04T10:00:00Z" } : a
      ),
    };
    expect(resoudreDestinataires(opposes, "incomplet").map((x) => x.email)).toEqual(["majeur@test.example"]);
  });

  it("opposition par adhérent : le parent opposé via un enfant reste joignable au titre de l'autre", () => {
    const base = donnees();
    const opposes = {
      ...base,
      adherents: base.adherents.map((a) =>
        a.id === "mineur1" ? { ...a, opposition_communications: "2026-08-04T10:00:00Z" } : a
      ),
    };
    // mineur1 opposé → il sort ; mineur2 (même famille, sans adresse propre) porte
    // toujours l'adresse du parent dans « parents ».
    expect(resoudreDestinataires(opposes, "parents").length).toBe(1);
  });

  it("les messages NÉCESSAIRES ignorent l'opposition : le cron de relances ne lit pas la colonne", () => {
    // Sentinelle de règle produit : l'opposition ne vise QUE les communications
    // facultatives. Si un jour quelqu'un ajoute ce filtre au cron, les relances de
    // pièces et de cotisation cesseraient de partir — ce test tombe avant.
    const cron = readFileSync(join(process.cwd(), "src/app/api/cron/relances/route.ts"), "utf8");
    expect(cron).not.toMatch(/opposition_communications/);
  });
});
