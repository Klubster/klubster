import { describe, it, expect } from "vitest";
import {
  estMineur,
  resultatDe,
  resultatDepuisReponses,
  questionsPour,
  QS_ADULTE,
  QS_MINEUR,
} from "@/lib/sante";

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
  it("toutes les réponses « non » donnent une attestation", () => {
    expect(resultatDepuisReponses("non,non,non,non")).toBe("atteste_negatif");
  });

  it("un seul « oui » suffit à exiger un certificat", () => {
    expect(resultatDepuisReponses("non,non,oui,non")).toBe("certificat_requis");
    expect(resultatDepuisReponses("oui,non,non")).toBe("certificat_requis");
    expect(resultatDepuisReponses("non,non,oui")).toBe("certificat_requis");
  });

  it("un questionnaire vide exige un certificat", () => {
    // Le cas de la requête tronquée : ne rien répondre ne vaut pas répondre « non ».
    expect(resultatDepuisReponses("")).toBe("certificat_requis");
    expect(resultatDepuisReponses(null)).toBe("certificat_requis");
    expect(resultatDepuisReponses(undefined)).toBe("certificat_requis");
  });

  it("un questionnaire incomplet exige un certificat", () => {
    // Une réponse manquante au milieu : « non,,non » ne doit pas passer pour complet.
    expect(resultatDepuisReponses("non,,non")).toBe("certificat_requis");
    expect(resultatDepuisReponses("non,non,")).toBe("certificat_requis");
  });

  it("ignore la casse et les espaces", () => {
    expect(resultatDepuisReponses(" NON , non ,Non")).toBe("atteste_negatif");
    expect(resultatDepuisReponses("Non, OUI ")).toBe("certificat_requis");
  });

  it("une valeur inattendue rend le questionnaire invalide", () => {
    // Ni « oui » ni « non » : on ne devine pas, on demande le certificat.
    expect(resultatDepuisReponses("non,peut-etre,non")).toBe("certificat_requis");
    expect(resultatDepuisReponses("true,false")).toBe("certificat_requis");
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
