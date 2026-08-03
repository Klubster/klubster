import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const MIGRATION = lire("supabase/migrations/0028_liste_attente.sql");
const REGLE = lire("docs/regle-liste-attente.md");
const PAGE_COURS = lire("src/app/[asso]/cockpit/cours/page.tsx");
const ACTIONS_COURS = lire("src/app/[asso]/cockpit/cours/actions.ts");

describe("liste d'attente — la base accepte le statut", () => {
  it("`liste_attente` fait partie des statuts d'adhésion", () => {
    // Le défaut d'origine : l'interface, la RPC d'inscription et la RPC de promotion
    // utilisaient toutes `liste_attente`, que la contrainte refusait. Toute inscription
    // sur un cours complet échouait.
    expect(MIGRATION).toMatch(/adhesions_statut_check[\s\S]*liste_attente/);
  });

  it("les cinq statuts d'origine restent acceptés", () => {
    for (const s of ["en_attente", "paye", "en_retard", "rembourse", "annule"]) {
      expect(MIGRATION).toContain(`'${s}'`);
    }
  });
});

describe("liste d'attente — ce qui occupe une place", () => {
  it("une seule définition, en base", () => {
    expect(MIGRATION).toMatch(/create or replace function public\.statuts_occupant_place/);
    expect(MIGRATION).toMatch(/array\['en_attente', 'paye', 'en_retard'\]/);
  });

  it("annulé, remboursé et liste d'attente n'occupent pas de place", () => {
    const bloc = MIGRATION.slice(
      MIGRATION.indexOf("statuts_occupant_place"),
      MIGRATION.indexOf("places_libres")
    );
    for (const s of ["'annule'", "'rembourse'", "'liste_attente'"]) {
      expect(bloc).not.toMatch(new RegExp(`array\\[[^\\]]*${s}`));
    }
  });

  it("l'inscription et la promotion partagent cette définition", () => {
    // Deux comptages divergents, c'est un cours complet d'un côté et pas de l'autre.
    const occurrences = MIGRATION.match(/statuts_occupant_place\(\)/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
  });
});

describe("liste d'attente — capacité non déclarée", () => {
  it("sans places_max, le cours n'est jamais complet", () => {
    expect(MIGRATION).toMatch(/if v_places is null or v_places <= 0 then return null/);
  });
});

describe("liste d'attente — concurrence", () => {
  it("le cours est verrouillé avant le comptage des places", () => {
    expect(MIGRATION).toMatch(/perform verrouiller_cours\(p_cours_id\);/);
    const iVerrou = MIGRATION.indexOf("perform verrouiller_cours");
    const iCompte = MIGRATION.indexOf("select count(*) into v_occ from adhesions", iVerrou);
    expect(iCompte).toBeGreaterThan(iVerrou);
  });

  it("la promotion verrouille aussi le cours avant de compter", () => {
    const promo = MIGRATION.slice(MIGRATION.indexOf("function public.promouvoir_liste_attente"));
    const verrou = promo.indexOf("for update");
    const comptage = promo.indexOf("select count(*) into v_occ");
    expect(verrou).toBeGreaterThan(0);
    expect(verrou).toBeLessThan(comptage);
  });

  it("le verrou n'est pas appelable depuis le navigateur", () => {
    expect(MIGRATION).toMatch(
      /revoke execute on function public\.verrouiller_cours\(uuid\) from anon, authenticated, public/
    );
  });
});

describe("liste d'attente — promotion", () => {
  it("refuse de promouvoir quand aucune place n'est libre", () => {
    const promo = MIGRATION.slice(MIGRATION.indexOf("function public.promouvoir_liste_attente"));
    expect(promo).toMatch(/if v_occ >= v_places then[\s\S]*return false/);
  });

  it("prend la personne qui attend depuis le plus longtemps", () => {
    expect(MIGRATION).toMatch(/order by created_at asc/);
  });

  it("journalise une promotion hors tour", () => {
    expect(MIGRATION).toMatch(/hors_tour/);
  });

  it("reste réservée au président et au secrétaire", () => {
    const promo = MIGRATION.slice(MIGRATION.indexOf("function public.promouvoir_liste_attente"));
    expect(promo).toMatch(/a_role_asso\(array\['admin_asso','secretaire'\]\)/);
  });
});

describe("liste d'attente — l'interface ne ment pas", () => {
  it("un refus de promotion est annoncé au club", () => {
    // `?promo=0` existait déjà mais n'affichait rien : le bouton semblait ne rien faire.
    expect(ACTIONS_COURS).toMatch(/promo=\$\{data === true \? "1" : "0"\}/);
    expect(PAGE_COURS).toMatch(/searchParams\?\.promo === "0"/);
    expect(PAGE_COURS).toMatch(/Aucune place n’est libre/);
  });

  it("un succès de promotion est annoncé au club", () => {
    expect(PAGE_COURS).toMatch(/searchParams\?\.promo === "1"/);
  });
});

describe("liste d'attente — la règle est écrite", () => {
  it("le document dit ce qui occupe une place", () => {
    expect(REGLE).toMatch(/en attente de règlement[\s\S]{0,80}payée[\s\S]{0,80}en retard/);
  });

  it("le document dit que la promotion est manuelle", () => {
    expect(REGLE).toMatch(/promotion est manuelle/i);
  });

  it("le document dit l'ordre de la liste", () => {
    expect(REGLE).toMatch(/premier arrivé, premier servi/i);
  });

  it("le document assume ce qui n'est pas fait", () => {
    expect(REGLE).toMatch(/Aucune notification automatique/);
    expect(REGLE).toMatch(/Aucune expiration/);
  });
});
