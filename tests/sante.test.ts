import { describe, it, expect } from "vitest";
import {
  estMineur,
  estDateNaissanceValide,
  resultatDe,
  resultatDepuisReponses,
  questionsPour,
  QS_ADULTE,
  QS_MINEUR,
} from "@/lib/sante";

describe("estDateNaissanceValide — vraie date calendaire", () => {
  const ref = new Date("2026-07-22T00:00:00Z");
  it("accepte une date normale", () => {
    expect(estDateNaissanceValide("1990-03-15", ref)).toBe(true);
  });
  it("refuse un mois/jour hors bornes (2026-99-99)", () => {
    expect(estDateNaissanceValide("2026-99-99", ref)).toBe(false);
  });
  it("refuse un jour qui déborde (31 avril)", () => {
    expect(estDateNaissanceValide("2000-04-31", ref)).toBe(false);
  });
  it("refuse le 29 février d'une année non bissextile", () => {
    expect(estDateNaissanceValide("2001-02-29", ref)).toBe(false);
    expect(estDateNaissanceValide("2000-02-29", ref)).toBe(true);
  });
  it("refuse une date future", () => {
    expect(estDateNaissanceValide("2030-01-01", ref)).toBe(false);
  });
  it("refuse une année absurde et un format non ISO", () => {
    expect(estDateNaissanceValide("1800-01-01", ref)).toBe(false);
    expect(estDateNaissanceValide("15/03/1990", ref)).toBe(false);
    expect(estDateNaissanceValide("", ref)).toBe(false);
  });
});

/**
 * Questionnaire de santé. Deux enjeux distincts :
 *
 * — le résultat conditionne la demande d'un certificat médical, donc l'aptitude
 *   déclarée d'une personne à pratiquer ;
 * — il est calculé à partir de données envoyées par un navigateur, qui peut mentir.
 *
 * D'où la règle : en cas de doute, on demande le certificat. Ne jamais accorder
 * l'attestation par défaut.
 */

describe("resultatDepuisReponses — recalcul serveur", () => {
  // Le questionnaire adulte compte 9 questions, le mineur 21. Un « non » complet doit
  // en fournir exactement autant.
  const nonAdulte = Array(QS_ADULTE.length).fill("non").join(",");
  const nonMineur = Array(QS_MINEUR.length).fill("non").join(",");

  it("un questionnaire adulte entièrement « non » donne une attestation", () => {
    expect(resultatDepuisReponses("adulte", nonAdulte)).toBe("atteste_negatif");
  });

  it("un questionnaire mineur entièrement « non » donne une attestation", () => {
    expect(resultatDepuisReponses("mineur", nonMineur)).toBe("atteste_negatif");
  });

  it("un seul « oui » suffit à exiger un certificat", () => {
    const avecOui = ["oui", ...Array(QS_ADULTE.length - 1).fill("non")].join(",");
    expect(resultatDepuisReponses("adulte", avecOui)).toBe("certificat_requis");
  });

  it("le nombre de réponses doit correspondre au questionnaire — le cœur de la faille", () => {
    // Un seul « non » ne vaut PAS un questionnaire adulte complet (9 questions). C'était
    // le contournement : envoyer « non » se déclarait apte.
    expect(resultatDepuisReponses("adulte", "non")).toBe("certificat_requis");
    expect(resultatDepuisReponses("adulte", "non,non,non")).toBe("certificat_requis");
    // Un « non » adulte (9) présenté comme mineur (21) est incomplet.
    expect(resultatDepuisReponses("mineur", nonAdulte)).toBe("certificat_requis");
    // Trop de réponses est tout aussi invalide.
    expect(resultatDepuisReponses("adulte", nonAdulte + ",non")).toBe("certificat_requis");
  });

  it("un questionnaire vide exige un certificat", () => {
    expect(resultatDepuisReponses("adulte", "")).toBe("certificat_requis");
    expect(resultatDepuisReponses("adulte", null)).toBe("certificat_requis");
    expect(resultatDepuisReponses("adulte", undefined)).toBe("certificat_requis");
  });

  it("ignore la casse et les espaces", () => {
    const casse = Array(QS_ADULTE.length).fill(" NoN ").join(",");
    expect(resultatDepuisReponses("adulte", casse)).toBe("atteste_negatif");
  });

  it("une valeur inattendue rend le questionnaire invalide", () => {
    const avecNawak = ["peut-etre", ...Array(QS_ADULTE.length - 1).fill("non")].join(",");
    expect(resultatDepuisReponses("adulte", avecNawak)).toBe("certificat_requis");
  });
});

describe("resultatDe — depuis un dictionnaire de réponses", () => {
  it("aucun « oui » donne une attestation", () => {
    expect(resultatDe({ q1: "non", q2: "non" })).toBe("atteste_negatif");
  });
  it("un « oui » exige un certificat", () => {
    expect(resultatDe({ q1: "non", q2: "oui" })).toBe("certificat_requis");
  });
});

describe("estMineur", () => {
  const ref = new Date("2026-07-21T12:00:00Z");

  it("reconnaît un adulte largement majeur", () => {
    expect(estMineur("1990-01-01", ref)).toBe(false);
  });

  it("reconnaît un enfant", () => {
    expect(estMineur("2018-05-05", ref)).toBe(true);
  });

  it("la veille des 18 ans, la personne est encore mineure", () => {
    // Frontière exacte : c'est là que se joue l'autorisation parentale.
    expect(estMineur("2008-07-22", ref)).toBe(true);
  });

  it("le jour des 18 ans, la personne est majeure", () => {
    expect(estMineur("2008-07-21", ref)).toBe(false);
  });

  it("une date invalide n'est pas traitée comme mineure", () => {
    expect(estMineur("", ref)).toBe(false);
    expect(estMineur("pas-une-date", ref)).toBe(false);
  });
});

describe("questionsPour", () => {
  it("sert le questionnaire mineur ou adulte selon le cas", () => {
    expect(questionsPour("mineur")).toBe(QS_MINEUR);
    expect(questionsPour("adulte")).toBe(QS_ADULTE);
  });
  it("les deux questionnaires sont non vides", () => {
    expect(QS_ADULTE.length).toBeGreaterThan(0);
    expect(QS_MINEUR.length).toBeGreaterThan(0);
  });
});
