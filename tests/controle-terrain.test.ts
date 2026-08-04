import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATALOGUE_CONTROLE, COULEURS_CONTROLE, ligneControle, coursParDefaut } from "../src/lib/controle";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260803180000_controle_terrain.sql"),
  "utf8"
);

const STATUTS = [
  "a_jour", "paiement_attendu", "en_retard", "dossier_incomplet",
  "questionnaire_manquant", "liste_attente", "annule", "rembourse",
  "saison_precedente", "non_inscrit_ce_cours", "aucune_adhesion",
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
    expect(MIGRATION).toMatch(/revoke execute on function public\.controler_adherent\(uuid, uuid\) from anon, public/);
    expect(MIGRATION).toMatch(/revoke execute on function public\.marquer_present\(uuid, uuid\) from anon, public/);
  });

  it("l'adhésion est celle DU cours sélectionné, départagée comme la PR #10", () => {
    // périmètre : cours choisi + saison courante ; départage : active > récente > id.
    const lateral = MIGRATION.slice(MIGRATION.indexOf("left join lateral"));
    expect(lateral).toContain("ad.cours_id = p_cours_id");
    expect(lateral).toContain("ad.saison = v_saison");
    const ordre = lateral.slice(lateral.indexOf("order by"));
    const iActive = ordre.indexOf("not in ('en_attente', 'paye', 'en_retard')");
    const iRecent = ordre.indexOf("created_at desc");
    const iId = ordre.indexOf("id desc");
    expect(iActive).toBeGreaterThanOrEqual(0);
    expect(iActive).toBeLessThan(iRecent);
    expect(iRecent).toBeLessThan(iId);
  });

  it("chaque statut du catalogue est produit par la migration", () => {
    for (const s of STATUTS) {
      expect(MIGRATION, s).toContain(`'${s}'`);
    }
  });
});

describe("contrôle terrain — le pointage est propre à un cours", () => {
  it("la RPC exige le cours : controler_adherent(p_adherent_id, p_cours_id)", () => {
    expect(MIGRATION).toMatch(/function public\.controler_adherent\(p_adherent_id uuid, p_cours_id uuid\)/);
    // l'ancienne forme à un argument est supprimée, pas laissée en doublon
    expect(MIGRATION).toMatch(/drop function if exists public\.controler_adherent\(uuid\)/);
  });

  it("le cours est vérifié comme appartenant à l'organisation, avant toute lecture", () => {
    const org = MIGRATION.indexOf("v_org_cours is distinct from v_org");
    const lecture = MIGRATION.indexOf("return query");
    expect(org).toBeGreaterThan(0);
    expect(org).toBeLessThan(lecture);
  });

  it("le statut vient de l'adhésion DU cours sélectionné, jamais d'une référence silencieuse", () => {
    expect(MIGRATION).toMatch(/ad\.cours_id = p_cours_id\s*\n\s*and ad\.saison = v_saison/);
    expect(MIGRATION).toContain("'non_inscrit_ce_cours'");
  });

  it("la présence du jour est par cours : contrainte adhérent + cours + date", () => {
    expect(MIGRATION).toMatch(/add constraint presences_adherent_cours_date_key\s*\n\s*unique nulls not distinct \(adherent_id, cours_id, date\)/);
    expect(MIGRATION).toMatch(/drop constraint if exists presences_adherent_id_date_key/);
  });

  it("marquer_present exige le cours et reste idempotent", () => {
    expect(MIGRATION).toMatch(/function public\.marquer_present\(p_adherent_id uuid, p_cours_id uuid\)/);
    expect(MIGRATION).toMatch(/drop function if exists public\.marquer_present\(uuid\)/);
    expect(MIGRATION).toMatch(/on conflict on constraint presences_adherent_cours_date_key do nothing/);
  });

  it("le pointage aussi porte la matrice de rôles en base", () => {
    const marquer = MIGRATION.slice(MIGRATION.indexOf("function public.marquer_present"));
    expect(marquer).toMatch(/a_role_asso\(array\['admin_asso','encadrant'\]\)/);
  });

  it("« non inscrit à ce cours » est un refus, sans pointage", () => {
    expect(CATALOGUE_CONTROLE.non_inscrit_ce_cours.ton).toBe("refus");
    expect(CATALOGUE_CONTROLE.non_inscrit_ce_cours.pointable).toBe(false);
    expect(CATALOGUE_CONTROLE.non_inscrit_ce_cours.action).toMatch(/cours sélectionné/i);
  });
});

describe("contrôle terrain — le cours proposé à l'ouverture", () => {
  const C = (id: string, jours: string[]) => ({ id, nom: id, jours });
  it("un club à cours unique n'a rien à choisir", () => {
    expect(coursParDefaut([C("a", [])], "mercredi")).toBe("a");
  });
  it("le seul cours du jour est proposé", () => {
    expect(coursParDefaut([C("a", ["mercredi"]), C("b", ["samedi"])], "mercredi")).toBe("a");
  });
  it("deux cours le même jour : on ne devine pas", () => {
    expect(coursParDefaut([C("a", ["mercredi"]), C("b", ["mercredi"])], "mercredi")).toBeNull();
  });
  it("aucun créneau aujourd'hui : on ne devine pas non plus", () => {
    expect(coursParDefaut([C("a", ["mardi"]), C("b", ["samedi"])], "mercredi")).toBeNull();
  });
});
