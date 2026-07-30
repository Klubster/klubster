import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLES, peut } from "@/lib/roles";

/**
 * Trésorerie — le rôle décide, en base ET dans les pages.
 *
 * POURQUOI CE FICHIER EXISTE
 * `/cockpit/paiements/remise` et `/cockpit/virements` n'exigeaient que l'appartenance au
 * club. Les deux autres écrans de trésorerie appelaient bien `peut(role, "paiements")` :
 * l'incohérence était invisible à la lecture d'un seul fichier, et c'est exactement ce
 * qu'un test transverse attrape.
 *
 * Plus grave, la RLS `reglements_read_org` autorisait la lecture à toute l'organisation.
 * Un garde de page ne protège que la page — une requête PostgREST directe rendait le
 * carnet de chèques complet à un encadrant. Même famille que la faille des campagnes
 * (migration 0025), sur une autre table.
 */

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const SQL = lire("supabase/migrations/0026_reglements_rls_par_role.sql");

/** Les rôles qui portent réellement la permission « paiements », d'après le code. */
const AUTORISES = ROLES.filter((r) => peut(r.cle, "paiements")).map((r) => r.cle);
const REFUSES = ROLES.filter((r) => !peut(r.cle, "paiements")).map((r) => r.cle);

describe("matrice de rôles — trésorerie", () => {
  it("seuls le président et le trésorier encaissent", () => {
    expect(AUTORISES.sort()).toEqual(["admin_asso", "tresorier"]);
  });

  it("le secrétaire, l’encadrant et la lecture seule sont exclus de l’argent", () => {
    for (const r of ["secretaire", "encadrant", "lecture"]) expect(REFUSES).toContain(r);
  });

  it("le super-admin passe partout", () => {
    expect(peut("super_admin", "paiements")).toBe(true);
  });

  it("un adhérent n’est pas un rôle d’équipe et n’a aucune permission", () => {
    expect(peut("adherent", "paiements")).toBe(false);
    expect(peut(null, "paiements")).toBe(false);
    expect(peut(undefined, "paiements")).toBe(false);
  });
});

describe("RLS des règlements — alignée sur la matrice", () => {
  it("l’ancienne politique ouverte à toute l’organisation est retirée", () => {
    expect(SQL).toMatch(/drop policy if exists reglements_read_org on public\.reglements/);
  });

  it("la nouvelle politique exige un rôle, pas la seule appartenance au club", () => {
    const politique = SQL.match(/create policy reglements_read_role[\s\S]*?;/)?.[0] ?? "";
    expect(politique).toMatch(/for select to authenticated/);
    expect(politique).toMatch(/organisation_id = current_org_id\(\)/);
    // Le `and a_role_asso(...)` est précisément ce qui manquait.
    expect(politique).toMatch(/and a_role_asso\(/);
    expect(politique).toMatch(/is_super_admin\(\)/);
  });

  it("le SQL nomme exactement les rôles que la matrice TypeScript autorise", () => {
    const politique = SQL.match(/create policy reglements_read_role[\s\S]*?;/)?.[0] ?? "";
    for (const role of AUTORISES) expect(politique).toContain(`'${role}'`);
    // Si quelqu'un ajoute « secretaire » côté SQL sans toucher à la matrice, ce test tombe.
    for (const role of REFUSES) expect(politique).not.toContain(`'${role}'`);
  });

  it("aucune politique d’écriture n’est ajoutée au passage", () => {
    expect(SQL).not.toMatch(/for (insert|update|delete|all)/i);
  });
});

describe("gardes de page — les quatre écrans de trésorerie", () => {
  it.each([
    ["src/app/[asso]/cockpit/paiements/page.tsx", "paiements"],
    ["src/app/[asso]/cockpit/paiements/relances/page.tsx", "relances"],
    ["src/app/[asso]/cockpit/paiements/remise/page.tsx", "remise"],
    ["src/app/[asso]/cockpit/virements/page.tsx", "virements"],
  ])("%s exige la permission paiements", (chemin) => {
    const src = lire(chemin);
    expect(src).toMatch(/peut\(profile\.role, "paiements"\)/);
    expect(src).toMatch(/acces=refuse/);
  });

  it("le refus précède toute lecture de données financières", () => {
    for (const chemin of [
      "src/app/[asso]/cockpit/paiements/remise/page.tsx",
      "src/app/[asso]/cockpit/virements/page.tsx",
    ]) {
      const src = lire(chemin);
      // On ne cherche QUE dans le corps du composant : sinon la ligne `import
      // { getSoldeClub }` du haut de fichier passe pour une lecture, et le test se
      // rassure tout seul. Un test qui mesure la mauvaise chose est pire qu'aucun test.
      const corps = src.slice(src.indexOf("export default"));
      const garde = corps.indexOf('peut(profile.role, "paiements")');
      // La remise lit `reglements` ; les virements interrogent Stripe. Dans les deux cas,
      // le contrôle doit venir AVANT — un refus après lecture reste une lecture.
      const lectures = ['.from("reglements")', "getSoldeClub(", "getCompteBancaireClub("]
        .map((m) => corps.indexOf(m))
        .filter((i) => i > 0);
      expect(garde).toBeGreaterThan(0);
      expect(lectures.length).toBeGreaterThan(0);
      for (const l of lectures) expect(garde).toBeLessThan(l);
    }
  });

  it("l’appartenance à une autre organisation est refusée avant le rôle", () => {
    for (const chemin of [
      "src/app/[asso]/cockpit/paiements/remise/page.tsx",
      "src/app/[asso]/cockpit/virements/page.tsx",
    ]) {
      const src = lire(chemin);
      expect(src).toMatch(/profile\.organisation_id !== org\.id && profile\.role !== "super_admin"/);
      expect(src.indexOf("organisation_id !== org.id")).toBeLessThan(src.indexOf('peut(profile.role, "paiements")'));
    }
  });
});

describe("fiche adhérent — pas de faux zéro", () => {
  const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");

  it("les règlements ne sont même pas demandés sans la permission", () => {
    expect(FICHE).toMatch(/const peutVoirArgent = peut\(profile\.role, "paiements"\)/);
    expect(FICHE).toMatch(/peutVoirArgent && idsAdhesions\.length/);
  });

  it("le total réglé et le reste dû sont masqués, pas affichés à zéro", () => {
    // Le point de tout ce lot : une RLS qui rend un tableau vide ne doit JAMAIS se lire
    // « cette personne n'a rien payé ». C'est la différence entre « je ne sais pas » et
    // « je sais que non », et elle se paie en appels téléphoniques inutiles.
    expect(FICHE).toMatch(/\{peutVoirArgent \? \([\s\S]*?Réglé :/);
    expect(FICHE).toMatch(/réservé au président et au trésorier/);
  });
});

describe("export RGPD — complet ou refusé", () => {
  const ROUTE = lire("src/app/[asso]/cockpit/adherents/[id]/rgpd/route.ts");
  const RGPD = lire("src/app/[asso]/cockpit/adherents/[id]/Rgpd.tsx");

  it("réservé au président, seul rôle qui lise à la fois l’argent et la santé", () => {
    expect(ROUTE).toMatch(/const estPresident = profile\.role === "admin_asso" \|\| profile\.role === "super_admin"/);
    expect(ROUTE).toMatch(/if \(!estPresident \|\| !peut\(profile\.role, "adherents_ecriture"\)\)/);
  });

  it("le bouton n’est pas proposé à qui produirait un export amputé", () => {
    expect(RGPD).toMatch(/\{estPresident \? \([\s\S]*?EXPORTER SES DONNÉES/);
    expect(RGPD).toMatch(/réservé au président/);
  });
});

describe("cockpit — aucune porte fermée affichée", () => {
  const HUB = lire("src/app/[asso]/cockpit/page.tsx");

  it("les liens vers la trésorerie dépendent du rôle", () => {
    expect(HUB).toMatch(/const peutPaiements = peut\(profile\?\.role, "paiements"\)/);
    expect(HUB).toMatch(/\{peutPaiements \? \([\s\S]*?MES VIREMENTS/);
    expect(HUB).toMatch(/\{peutPaiements \? \([\s\S]*?Encaisser une cotisation/);
  });

  it("le refus d’accès est enfin affiché, et nomme le rôle", () => {
    // Huit redirections posaient `?acces=refuse` sans que personne ne le lise :
    // le bénévole revenait au cockpit sans un mot.
    expect(HUB).toMatch(/searchParams\?\.acces === "refuse"/);
    expect(HUB).toMatch(/libelleRole\(profile\?\.role\)/);
  });
});
