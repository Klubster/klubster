import { describe, it, expect } from "vitest";
import { decisionRelanceFinanciere, destinataireRelance } from "../src/lib/relances";

/** Fixtures de TEST — cas financiers A à Q du lot L. */
const base = (p: Partial<Parameters<typeof decisionRelanceFinanciere>[0]> = {}) =>
  decisionRelanceFinanciere({
    montantCentimes: 18000, statut: "en_attente", modePaiement: "cheque",
    litigeLe: null, reglements: [], ...p,
  });

describe("relances — la décision financière (cas A à Q)", () => {
  it("A. cotisation au club intégralement impayée → relance, montant plein", () => {
    const d = base();
    expect(d).toMatchObject({ relancer: true, motif: "impaye", montantCentimes: 18000 });
  });

  it("B. paiement partiel → relance avec LE solde exact", () => {
    const d = base({ reglements: [{ montantCentimes: 5000, mode: "cheque" }] });
    expect(d).toMatchObject({ relancer: true, montantCentimes: 13000 });
  });

  it("C. échéancier Stripe en cours, prochaine échéance FUTURE → jamais relancé", () => {
    const d = base({ modePaiement: "en_ligne", reglements: [{ montantCentimes: 6000, mode: "en_ligne" }] });
    expect(d).toMatchObject({ relancer: false, exclusion: "echeancier_en_cours" });
  });

  it("D. échéance réellement rejetée (en_retard) → relance, motif dédié, solde seul", () => {
    const d = base({ modePaiement: "en_ligne", statut: "en_retard", reglements: [{ montantCentimes: 6000, mode: "en_ligne" }] });
    expect(d).toMatchObject({ relancer: true, motif: "echeance_rejetee", montantCentimes: 12000 });
  });

  it("E. intégralement réglé (tolérance 5 c comprise) → rien", () => {
    expect(base({ reglements: [{ montantCentimes: 17997, mode: "cheque" }] }).relancer).toBe(false);
    expect(base({ reglements: [{ montantCentimes: 17997, mode: "cheque" }] }).exclusion).toBe("regle");
  });

  it("F/G. chèque ou espèces reçus partiellement : le reste se relance — c'est la règle produit (dû à l'inscription)", () => {
    expect(base({ modePaiement: "especes", reglements: [{ montantCentimes: 9000, mode: "especes" }] }).montantCentimes).toBe(9000);
  });

  it("H. remboursement total → aucun solde fantôme", () => {
    const d = base({ statut: "rembourse", reglements: [{ montantCentimes: 18000, mode: "en_ligne" }, { montantCentimes: -18000, mode: "remboursement" }] });
    expect(d).toMatchObject({ relancer: false, exclusion: "rembourse" });
  });

  it("I. remboursement partiel → le nouveau reste exact redevient dû", () => {
    const d = base({ reglements: [{ montantCentimes: 18000, mode: "en_ligne" }, { montantCentimes: -6000, mode: "remboursement" }] });
    expect(d).toMatchObject({ relancer: true, montantCentimes: 6000 });
  });

  it("J. litige ouvert → jamais traité comme un simple impayé", () => {
    const d = base({ litigeLe: "2026-08-01", statut: "en_retard" });
    expect(d).toMatchObject({ relancer: false, exclusion: "litige" });
  });

  it("M. tarif nul → aucun faux impayé", () => {
    expect(base({ montantCentimes: 0 }).exclusion).toBe("gratuit");
  });

  it("O. annulé / P. remboursé / liste d'attente → exclus avec leur raison", () => {
    expect(base({ statut: "annule" }).exclusion).toBe("annule");
    expect(base({ statut: "liste_attente" }).exclusion).toBe("liste_attente");
  });

  it("L. changement de cours : le montant relancé est CELUI de l'adhésion (fiche/cockpit)", () => {
    // après changer_cours avec règlement conservé : montant 22000, réglé 5000 → 17000
    const d = base({ montantCentimes: 22000, reglements: [{ montantCentimes: 5000, mode: "especes" }] });
    expect(d.montantCentimes).toBe(17000);
  });
});

describe("relances — le destinataire suit la règle du lot K", () => {
  it("majeur → sa propre adresse, normalisée", () => {
    expect(destinataireRelance({ email: "  Alice@Test.EXAMPLE ", date_naissance: "1990-01-01", infos: {} }))
      .toBe("alice@test.example");
  });
  it("mineur → le représentant légal, repli sur le compte", () => {
    expect(destinataireRelance({ email: "enfant@test.example", date_naissance: "2014-01-01", infos: { "Responsable légal — email": "parent@test.example" } }))
      .toBe("parent@test.example");
    expect(destinataireRelance({ email: "enfant@test.example", date_naissance: "2014-01-01", infos: {} }))
      .toBe("enfant@test.example");
  });
  it("aucune adresse → null, jamais un envoi fantôme", () => {
    expect(destinataireRelance({ email: null, date_naissance: "2014-01-01", infos: {} })).toBeNull();
  });
});
