import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLES, peut } from "@/lib/roles";
import { calculerPriorites, filtrerParRole } from "@/lib/priorites";

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
 *
 * ⚠️ PORTÉE DE CES TESTS — À LIRE AVANT DE S'EN CONTENTER
 * Ce sont des tests STATIQUES : ils lisent le texte des migrations et des pages, et
 * vérifient que ce qui y est écrit dit la même chose que la matrice de rôles. Ils ne
 * jouent AUCUNE requête contre une base Supabase, avec une session par rôle. Ils
 * prouvent donc que la politique est correctement ÉCRITE, pas qu'un vrai encadrant se
 * fait refuser par un vrai PostgREST.
 *
 * Ce qui manque : une base de test dans la CI, sept sessions, et un jeu de requêtes
 * directes. C'est un chantier en soi ; il est ouvert, pas oublié.
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

describe("cockpit — aucune porte fermée, aucun chiffre de trésorerie", () => {
  const HUB = lire("src/app/[asso]/cockpit/page.tsx");

  it("deux permissions distinctes : la trésorerie du club, l’abonnement Klubster", () => {
    // Leur confusion est ce qui laissait un encadrant lire « 48 190 € encaissés ».
    expect(HUB).toMatch(/const peutPaiements = peut\(profile\?\.role, "paiements"\)/);
    expect(HUB).toMatch(/const estPresident = profile\?\.role === "admin_asso" \|\| profile\?\.role === "super_admin"/);
  });

  it("les liens vers la trésorerie dépendent du rôle", () => {
    expect(HUB).toMatch(/\{peutPaiements \? \([\s\S]*?MES VIREMENTS/);
    expect(HUB).toMatch(/\{peutPaiements \? \([\s\S]*?Encaisser une cotisation/);
  });

  it("le nombre de cotisations en retard est un chiffre de trésorerie", () => {
    // La règle n'est plus portée par la forme du JSX mais par `priorites.ts`, qui attache
    // une permission à chaque entrée. Le test suit le comportement, pas la mise en page :
    // un secrétaire ou un encadrant ne doit jamais voir combien de familles doivent de
    // l'argent au club.
    const p = calculerPriorites({
      slug: "club-a",
      enAttente: 3,
      enRetard: 4,
      dossiersIncomplets: 0,
      nouvelles7j: 0,
      litiges: 2,
      coursComplets: [],
      coursPresqueComplets: [],
      adherents: 20,
      coursOuverts: 2,
    });
    for (const cle of ["retards", "en-attente", "litiges"]) {
      expect(p.find((x) => x.cle === cle)!.permission).toBe("paiements");
    }
    for (const role of ["secretaire", "encadrant", "lecture"]) {
      const vues = filtrerParRole(p, (a) => peut(role, a)).map((x) => x.cle);
      expect(vues).not.toContain("retards");
      expect(vues).not.toContain("en-attente");
      expect(vues).not.toContain("litiges");
    }
  });

  it("le total encaissé et l’abonnement Klubster sont réservés au président", () => {
    // `tresorerieCentimes` ne doit apparaître qu'à l'intérieur du bloc `estPresident`.
    const ouverture = HUB.indexOf("{estPresident ? (");
    const fermeture = HUB.indexOf(") : null}\n\n          {/* ACTIONS RAPIDES");
    const total = HUB.indexOf("s.tresorerieCentimes");
    expect(ouverture).toBeGreaterThan(0);
    expect(fermeture).toBeGreaterThan(ouverture);
    expect(total).toBeGreaterThan(ouverture);
    expect(total).toBeLessThan(fermeture);
  });

  it.each(["souscrireAvecSlug", "gererAvecSlug", "definirEcheancesAvecSlug", "connecterAvecSlug"])(
    "le formulaire %s n’est pas proposé hors présidence",
    (action) => {
      const ouverture = HUB.indexOf("{estPresident ? (");
      const fermeture = HUB.indexOf(") : null}\n\n          {/* ACTIONS RAPIDES");
      const usage = HUB.indexOf(`action={${action}}`);
      expect(usage).toBeGreaterThan(ouverture);
      expect(usage).toBeLessThan(fermeture);
    }
  );

  it("le refus d’accès est enfin affiché, et nomme le rôle", () => {
    // Huit redirections posaient `?acces=refuse` sans que personne ne le lise :
    // le bénévole revenait au cockpit sans un mot.
    expect(HUB).toMatch(/searchParams\?\.acces === "refuse"/);
    expect(HUB).toMatch(/libelleRole\(profile\?\.role\)/);
  });
});

describe("colonnes financières d’adhesions — grants par colonne et RPC", () => {
  const SQL27 = lire("supabase/migrations/0027_adhesions_colonnes_financieres.sql");

  it("le droit de lecture est retiré de la table, puis rendu colonne par colonne", () => {
    // Un GRANT au niveau table couvre toute colonne, y compris future : on ne peut pas
    // en révoquer une seule. Le motif est donc revoke-puis-grant, comme pieces_adherent.
    expect(SQL27).toMatch(/revoke select on public\.adhesions from authenticated/);
    expect(SQL27).toMatch(/grant select \([\s\S]*?\) on public\.adhesions to authenticated/);
  });

  it.each(["litige_le", "stripe_payment_intent", "derniere_relance"])(
    "%s n’est PAS rendue à authenticated",
    (colonne) => {
      const grant = SQL27.match(/grant select \(([\s\S]*?)\) on public\.adhesions/)?.[1] ?? "";
      expect(grant).not.toContain(colonne);
    }
  );

  it.each(["cours_id", "saison", "montant_centimes", "statut", "mode_paiement"])(
    "%s reste lisible : dossier, tarif public, ou espace adhérent",
    (colonne) => {
      const grant = SQL27.match(/grant select \(([\s\S]*?)\) on public\.adhesions/)?.[1] ?? "";
      expect(grant).toContain(colonne);
    }
  );

  it("la RPC financière exige le rôle ET le cloisonnement par organisation", () => {
    const fn = SQL27.match(/create or replace function public\.adhesions_finance[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/a_role_asso\(array\['admin_asso','tresorier'\]\)/);
    expect(fn).toMatch(/security definer/);
  });

  it("le parenthésage isole le super-admin dans sa PROPRE branche", () => {
    // POURQUOI CE TEST EST PRÉCIS À CE POINT
    // La première écriture était :
    //   and (organisation_id = current_org_id() or is_super_admin())
    //   and a_role_asso(array[...])
    // Elle fonctionnait — par ricochet, parce que `a_role_asso` commence elle-même
    // par `is_super_admin()`. Le test d'origine ne voyait rien : les deux fonctions
    // étaient bien présentes. Vérifier une PRÉSENCE ne vérifie pas une STRUCTURE.
    const fn = SQL27.match(/create or replace function public\.adhesions_finance[\s\S]*?\$\$;/)?.[0] ?? "";
    const conditions = fn.replace(/--[^\n]*/g, "").replace(/\s+/g, " ");

    // Le rôle doit être conjoint à l'organisation, dans la même parenthèse…
    expect(conditions).toMatch(
      /\(\s*a\.organisation_id = current_org_id\(\)\s+and\s+a_role_asso\(array\['admin_asso','tresorier'\]\)\s*\)/
    );
    // …et le super-admin doit être une alternative à ce bloc entier.
    expect(conditions).toMatch(/\)\s+or\s+is_super_admin\(\)/);
    // Le motif fautif ne doit plus exister nulle part.
    expect(conditions).not.toMatch(/current_org_id\(\)\s+or\s+is_super_admin\(\)/);
  });

  it("les colonnes rendues sont nommées une par une, jamais `a.*`", () => {
    // Avec `setof adhesions` + `select a.*`, toute colonne ajoutée un jour à la table
    // serait servie au trésorier sans que personne ne l'ait décidé.
    const fn = SQL27.match(/create or replace function public\.adhesions_finance[\s\S]*?\$\$;/)?.[0] ?? "";
    expect(fn).toMatch(/returns table \(/);
    expect(fn).not.toMatch(/returns setof/);
    expect(fn).not.toMatch(/select a\.\*/);
  });

  it("la RPC ne rend QUE les colonnes dont les appelants ont besoin", () => {
    // On retire d'abord les commentaires : le mien mentionne `returns table (...)`, et
    // la première version de ce test l'attrapait à la place de la vraie déclaration.
    // Une recherche dans du SQL doit toujours ignorer les commentaires — sinon elle
    // finit par mesurer la prose plutôt que le code.
    const sansCommentaires = SQL27.replace(/--[^\n]*/g, "");
    const decl = sansCommentaires.match(/returns table \(([\s\S]*?)\)\s*language sql/)?.[1] ?? "";
    const attendues = [
      "id", "organisation_id", "adherent_id",
      "montant_centimes", "litige_le", "stripe_payment_intent", "derniere_relance",
    ];
    const rendues = decl
      .split(",")
      .map((l) => l.trim().split(/\s+/)[0])
      .filter(Boolean);
    expect(rendues.sort()).toEqual([...attendues].sort());
    // Rien qui relève du dossier : ces colonnes-là se lisent directement sur la table.
    for (const hors of ["saison", "statut", "cours_id", "mode_paiement"]) {
      expect(rendues).not.toContain(hors);
    }
  });

  it("la RPC nomme exactement les rôles de la matrice", () => {
    const fn = SQL27.match(/create or replace function public\.adhesions_finance[\s\S]*?\$\$;/)?.[0] ?? "";
    for (const role of AUTORISES) expect(fn).toContain(`'${role}'`);
    for (const role of REFUSES) expect(fn).not.toContain(`'${role}'`);
  });

  it("anon ne peut pas l’appeler", () => {
    expect(SQL27).toMatch(/revoke execute on function public\.adhesions_finance\(uuid\) from anon, public/);
  });
});

describe("les colonnes financières ne sont plus lues en direct", () => {
  it.each([
    ["src/app/[asso]/cockpit/adherents/[id]/page.tsx", "litige_le"],
    ["src/app/[asso]/cockpit/paiements/page.tsx", "litige_le"],
    ["src/app/[asso]/cockpit/paiements/relances/page.tsx", "derniere_relance"],
    ["src/app/[asso]/cockpit/adherents/actions.ts", "stripe_payment_intent"],
  ])("%s passe par adhesions_finance", (chemin) => {
    const src = lire(chemin);
    expect(src).toMatch(/rpc\("adhesions_finance"/);
    // Et ne redemande plus la colonne dans un `select()` sur la table.
    const selects = src.match(/\.from\("adhesions"\)[\s\S]{0,220}?\.select\([^)]*\)/g) ?? [];
    for (const s of selects) {
      expect(s).not.toMatch(/litige_le|stripe_payment_intent|derniere_relance/);
    }
  });

  it("l’espace adhérent lit encore son propre mode de paiement", () => {
    // C'est la raison pour laquelle `mode_paiement` reste dans les grants : le
    // révoquer aurait cassé l'espace adhérent, qui partage le rôle `authenticated`.
    const espace = lire("src/app/[asso]/espace/page.tsx");
    expect(espace).toMatch(/mode_paiement/);
    expect(espace).not.toMatch(/rpc\("adhesions_finance"/);
  });
});
