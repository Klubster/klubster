import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { joursEssai, estFondateur, PLACES_FONDATEURS, JOURS_ESSAI, JOURS_ESSAI_FONDATEUR, palierPourEffectif, PALIERS } from "../src/lib/stripe";

describe("clubs fondateurs — trois mois offerts, réellement", () => {
  it("les quinze premiers rangs sont fondateurs, le seizième ne l'est pas", () => {
    expect(estFondateur(1)).toBe(true);
    expect(estFondateur(15)).toBe(true);
    expect(estFondateur(16)).toBe(false);
    expect(PLACES_FONDATEURS).toBe(15);
  });

  it("un rang absent (club créé avant l'offre) n'est pas fondateur", () => {
    expect(estFondateur(null)).toBe(false);
    expect(estFondateur(undefined)).toBe(false);
    expect(estFondateur(0)).toBe(false);
    expect(estFondateur(-1)).toBe(false);
  });

  it("la durée offerte suit le rang — 90 jours pour un fondateur, 30 sinon", () => {
    // Le site promettait trois mois et le code posait 30 jours : une facture
    // arrivait pendant la période annoncée gratuite.
    expect(joursEssai(1)).toBe(90);
    expect(joursEssai(15)).toBe(90);
    expect(joursEssai(16)).toBe(30);
    expect(joursEssai(null)).toBe(30);
    expect(JOURS_ESSAI_FONDATEUR).toBe(90);
    expect(JOURS_ESSAI).toBe(30);
  });

  it("le checkout Stripe utilise cette durée, pas une constante figée", () => {
    const src = readFileSync(join(process.cwd(), "src/lib/stripe.ts"), "utf8");
    expect(src).toMatch(/const jours = joursEssai\(opts\.fondateurRang\)/);
    expect(src).toMatch(/trial_period_days: jours/);
    expect(src).not.toMatch(/trial_period_days: JOURS_ESSAI\b/);
  });

  it("le rang transmis au checkout vient de la base, jamais du navigateur", () => {
    const actions = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/stripe-actions.ts"), "utf8");
    expect(actions).toMatch(/fondateurRang: \(org as/);
  });

  it("le cockpit annonce la même durée que celle appliquée", () => {
    const page = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/page.tsx"), "utf8");
    expect(page).toMatch(/joursEssai\(org\.fondateur_rang\)/);
    expect(page).toMatch(/TROIS MOIS OFFERTS/);
  });

  it("le rang est attribué atomiquement à la création (séquence, pas un count)", () => {
    const mig = readFileSync(join(process.cwd(), "supabase/migrations/20260804190000_clubs_fondateurs.sql"), "utf8");
    expect(mig).toMatch(/create sequence if not exists fondateur_rang_seq/);
    expect(mig).toMatch(/nextval\('fondateur_rang_seq'\)/);
    // un index unique interdit deux clubs au même rang, même en cas d'incident
    expect(mig).toMatch(/create unique index if not exists organisations_fondateur_rang_unique/);
  });
});

describe("paliers tarifaires — les bornes annoncées", () => {
  it("9 € jusqu'à 300, 19 € jusqu'à 500, 29 € au-delà", () => {
    expect(PALIERS.starter.prixCentimes).toBe(900);
    expect(PALIERS.club.prixCentimes).toBe(1900);
    expect(PALIERS.club_plus.prixCentimes).toBe(2900);
  });

  it("les bornes exactes 300 et 500 tombent du bon côté", () => {
    expect(palierPourEffectif(0)).toBe("starter");
    expect(palierPourEffectif(1)).toBe("starter");
    expect(palierPourEffectif(299)).toBe("starter");
    expect(palierPourEffectif(300)).toBe("starter");   // « jusqu'à 300 » inclus
    expect(palierPourEffectif(301)).toBe("club");
    expect(palierPourEffectif(499)).toBe("club");
    expect(palierPourEffectif(500)).toBe("club");      // « de 301 à 500 » inclus
    expect(palierPourEffectif(501)).toBe("club_plus");
  });

  it("la règle du code et celle de la base disent la même chose", () => {
    const mig = readFileSync(join(process.cwd(), "supabase/migrations/0013_reference_rpc_et_storage.sql"), "utf8").toLowerCase();
    expect(mig).toContain("<= 300");
    expect(mig).toContain("<= 500");
  });
});
