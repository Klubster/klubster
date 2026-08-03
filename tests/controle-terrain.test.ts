import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOGUE_CONTROLE, COULEURS_CONTROLE, ligneControle } from "../src/lib/controle";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260803180000_controle_terrain.sql"),
  "utf8"
);

const STATUTS = [
  "a_jour", "paiement_attendu", "en_retard", "dossier_incomplet",
  "questionnaire_manquant", "liste_attente", "annule", "rembourse",
  "saison_precedente", "aucune_adhesion",
] as const;

describe("contrôle terrain — le catalogue parle clair", () => {
  it("chaque statut de la RPC a sa ligne, plus « introuvable »", () => {
    for (const s of [...STATUTS, "introuvable"]) {
      expect(CATALOGUE_CONTROLE[s], s).toBeDefined();
    }
  });

  it("chaque ligne a un texte explicite, un symbole ET une action suivante", () => {
    // La couleur complète, elle ne porte jamais l'information seule.
    for (const [statut, l] of Object.entries(CATALOGUE_CONTROLE)) {
      expect(l.symbole.length, statut).toBeGreaterThan(0);
      expect(l.titre.length, statut).toBeGreaterThan(3);
      expect(l.action.length, statut).toBeGreaterThan(3);
    }
  });

  it("un refus ne propose jamais le pointage", () => {
    for (const s of ["liste_attente", "annule", "rembourse", "saison_precedente", "aucune_adhesion", "introuvable"]) {
      expect(CATALOGUE_CONTROLE[s].ton, s).toBe("refus");
      expect(CATALOGUE_CONTROLE[s].pointable, s).toBe(false);
    }
  });

  it("les situations d'attention laissent entrer mais nomment le geste", () => {
    for (const s of ["paiement_attendu", "en_retard", "dossier_incomplet", "questionnaire_manquant"]) {
      expect(CATALOGUE_CONTROLE[s].ton, s).toBe("attention");
      expect(CATALOGUE_CONTROLE[s].pointable, s).toBe(true);
    }
  });

  it("les formulations clés du bord de tapis sont celles convenues", () => {
    expect(CATALOGUE_CONTROLE.a_jour.titre).toMatch(/Accès autorisé/);
    expect(CATALOGUE_CONTROLE.en_retard.action).toMatch(/prévenir le responsable/i);
    expect(CATALOGUE_CONTROLE.liste_attente.action).toMatch(/place non confirmée/i);
    expect(CATALOGUE_CONTROLE.introuvable.titre).toMatch(/introuvable/i);
  });

  it("un statut inconnu retombe sur « introuvable », jamais sur un écran vide", () => {
    expect(ligneControle(undefined).titre).toMatch(/introuvable/i);
    expect(ligneControle("statut_fantome").titre).toMatch(/introuvable/i);
  });

  it("trois tons, trois couleurs distinctes", () => {
    const c = Object.values(COULEURS_CONTROLE);
    expect(new Set(c).size).toBe(3);
  });
});

describe("contrôle terrain — la RPC ne montre que le nécessaire", () => {
  it("aucun montant, aucune donnée Stripe, aucun détail de santé ne sort", () => {
    // La fonction lit `questionnaires_sante` pour un EXISTS, jamais pour les colonnes
    // sensibles : ni réponses, ni résultat, ni signature ne figurent dans la sortie.
    expect(MIGRATION).not.toMatch(/montant_centimes[^)]*\)?\s*(as|,)\s*(?!.*count)/i);
    for (const interdit of ["stripe_payment_intent", "q.reponses", "q.resultat", "q.signature", "signataire"]) {
      expect(MIGRATION, interdit).not.toContain(interdit);
    }
  });

  it("le contrôle d'organisation précède toute lecture métier", () => {
    const org = MIGRATION.indexOf("current_org_id()");
    const lecture = MIGRATION.indexOf("return query");
    expect(org).toBeGreaterThan(0);
    expect(org).toBeLessThan(lecture);
  });

  it("la matrice de rôles est en base : président ou encadrant", () => {
    expect(MIGRATION).toMatch(/a_role_asso\(array\['admin_asso','encadrant'\]\)/);
  });

  it("anon et public sont révoqués", () => {
    expect(MIGRATION).toMatch(/revoke execute on function public\.controler_adherent\(uuid\) from anon, public/);
  });

  it("l'adhésion de référence suit la même règle que la PR #10", () => {
    // saison courante > active > plus récente > id : le même ordre, dans le même ordre.
    const ordre = MIGRATION.slice(MIGRATION.indexOf("order by", MIGRATION.indexOf("left join lateral")));
    const iSaison = ordre.indexOf("is distinct from v_saison");
    const iActive = ordre.indexOf("not in ('en_attente', 'paye', 'en_retard')");
    const iRecent = ordre.indexOf("created_at desc");
    const iId = ordre.indexOf("id desc");
    expect(iSaison).toBeGreaterThanOrEqual(0);
    expect(iSaison).toBeLessThan(iActive);
    expect(iActive).toBeLessThan(iRecent);
    expect(iRecent).toBeLessThan(iId);
  });

  it("chaque statut du catalogue est produit par la migration", () => {
    for (const s of STATUTS) {
      expect(MIGRATION, s).toContain(`'${s}'`);
    }
  });
});
