import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * AUCUNE ADRESSE PERSONNELLE DANS LE DÉPÔT.
 *
 * POURQUOI CE TEST EXISTE.
 *
 * Le dépôt `Klubster/klubster` est **public**. Une adresse personnelle qui y entre est
 * publiée pour de bon : elle reste dans l'historique Git même si un commit ultérieur
 * l'efface, et elle sera moissonnée. C'est irréversible, contrairement à presque tout le
 * reste de ce que fait ce projet.
 *
 * La restitution de l'historique des migrations a failli en publier une : la migration
 * `20260709083407` attribuait le rôle `super_admin` en nommant l'adresse de
 * l'administrateur initial. Elle fait aujourd'hui l'objet d'une dérogation déclarée au
 * manifeste, la valeur étant remplacée par un marqueur.
 *
 * CE TEST NE CONTIENT PAS L'ADRESSE QU'IL PROTÈGE, et c'est le point : une liste noire
 * d'adresses interdites publierait précisément ce qu'elle prétend cacher. Il fonctionne à
 * l'envers — il refuse TOUTE adresse qui n'est pas explicitement autorisée. Une adresse
 * inconnue est donc refusée par défaut, y compris une qui n'existe pas encore.
 */

const RACINE = path.resolve(__dirname, "..");

/** Les répertoires versionnés où une adresse pourrait se glisser. */
const PERIMETRE = ["supabase/migrations", "docs", "scripts", "tests"];

const EXTENSIONS = /\.(sql|ts|tsx|js|mjs|json|md|txt|tsv|ya?ml|sh|awk)$/;

/**
 * Les seules adresses autorisées, et pourquoi chacune.
 *
 * - `@example.com` : RFC 2606, domaine réservé qui n'appartiendra jamais à personne.
 *   C'est le seul domaine utilisable en fixture ou en documentation.
 * - Les boîtes fonctionnelles de Klubster : ce sont des adresses d'entreprise, publiées
 *   sur le site, pas des adresses personnelles.
 *
 * Ajouter une entrée ici est une décision, pas une correction de test. Une adresse
 * personnelle n'y a jamais sa place.
 */
const AUTORISEES = [
  /@example\.com$/i,
  /^(clubs|contact|support|bonjour|no-?reply)@klubster\.fr$/i,
];

/** Le marqueur de substitution. Il ne contient pas d'`@` : il ne peut pas être une adresse. */
const MARQUEUR = "__KLUBSTER_SUPER_ADMIN_EMAIL__";

function fichiers(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    if (!existsSync(dossier)) return;
    for (const entree of readdirSync(dossier)) {
      if (entree === "node_modules" || entree === ".next" || entree.startsWith(".git")) continue;
      const complet = path.join(dossier, entree);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (EXTENSIONS.test(entree)) trouves.push(path.relative(RACINE, complet));
    }
  };
  for (const d of PERIMETRE) parcourir(path.join(RACINE, d));
  return trouves.sort();
}

const LISTE = fichiers();

/** Repère une adresse au sens large — plus large que la RFC, volontairement. */
const ADRESSE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;

describe("aucune adresse personnelle dans les fichiers versionnés", () => {
  it("inspecte bien un périmètre non vide", () => {
    // Un test qui ne lirait rien passerait pour toujours.
    expect(LISTE.length).toBeGreaterThan(20);
    expect(LISTE.some((f) => f.startsWith(path.join("supabase", "migrations")))).toBe(true);
  });

  it("ne contient que des adresses explicitement autorisées", () => {
    const suspectes: string[] = [];
    for (const f of LISTE) {
      const contenu = readFileSync(path.join(RACINE, f), "utf8");
      for (const m of contenu.matchAll(ADRESSE)) {
        const adresse = m[0];
        if (AUTORISEES.some((a) => a.test(adresse))) continue;
        // On ne réimprime PAS l'adresse trouvée dans le message d'échec : le rapport de
        // test finit souvent dans un journal de CI public, et le remède recréerait le mal.
        suspectes.push(`${f} → adresse non autorisée (domaine « ${adresse.split("@")[1]} »)`);
      }
    }
    expect(suspectes, `adresse(s) à retirer :\n${suspectes.join("\n")}`).toEqual([]);
  });
});

describe("la dérogation de la migration 20260709083407", () => {
  const FICHIER = path.join(
    RACINE,
    "supabase/migrations/20260709083407_super_admin_et_cockpit_stats_appartenance.sql"
  );

  it("porte le marqueur, et pas une adresse", () => {
    if (!existsSync(FICHIER)) return; // pas encore restituée : rien à contrôler
    const contenu = readFileSync(FICHIER, "utf8");
    expect(contenu).toContain(MARQUEUR);
    // Aucun `@` du tout dans ce fichier : le contrôle le plus simple est aussi le plus sûr.
    expect(contenu.includes("@"), "ce fichier ne doit contenir aucune adresse").toBe(false);
  });

  it("attribue le rôle à une valeur qui ne peut correspondre à personne", () => {
    if (!existsSync(FICHIER)) return;
    const contenu = readFileSync(FICHIER, "utf8");
    /**
     * Le marqueur ne contient pas d'`@`. `profiles.email` est alimentée par le trigger
     * `handle_new_user` depuis `auth.users.email`, que GoTrue valide comme une adresse.
     * Aucune ligne ne peut donc porter cette valeur, et l'`update` ne promeut personne.
     *
     * C'est ce qui rend la reconstruction SAINE : une base neuve n'a aucun
     * super-administrateur, et personne ne reçoit ce rôle implicitement. L'attribution
     * est une opération d'environnement, décrite dans
     * `docs/finalisation-klubster/super-admin.md`, jamais versionnée avec une identité.
     */
    const promotion = contenu.match(/set role = 'super_admin' where email = '([^']*)'/);
    expect(promotion, "la promotion super_admin doit rester présente").not.toBeNull();
    expect(promotion![1]).toBe(MARQUEUR);
    expect(promotion![1]).not.toContain("@");
  });
});

describe("les dérogations sont déclarées, et elles sont uniques", () => {
  const MANIFESTE = path.join(RACINE, "docs/finalisation-klubster/manifeste-migrations.tsv");

  it("le manifeste déclare exactement les dérogations attendues", () => {
    const lignes = readFileSync(MANIFESTE, "utf8")
      .split("\n")
      .filter((l) => l.startsWith("DEROGATION\t"));
    // Une dérogation supplémentaire est une décision de confidentialité : elle ne se
    // glisse pas dans un lot de restitution. Si ce test échoue parce qu'une seconde a été
    // ajoutée, c'est le nombre attendu qu'il faut discuter, pas le test qu'il faut ouvrir.
    expect(lignes.length).toBe(1);
    expect(lignes[0]).toContain("20260709083407");
  });

  it("chaque dérogation porte les deux empreintes et sa raison", () => {
    const ligne = readFileSync(MANIFESTE, "utf8")
      .split("\n")
      .find((l) => l.startsWith("DEROGATION\t"))!;
    const [, version, md5Origine, tailleOrigine, md5Public, taillePublic, date, raison] = ligne.split("\t");
    expect(version).toMatch(/^\d{14}$/);
    expect(md5Origine).toMatch(/^[0-9a-f]{32}$/);
    expect(md5Public).toMatch(/^[0-9a-f]{32}$/);
    expect(md5Origine).not.toBe(md5Public);
    expect(Number(tailleOrigine)).toBeGreaterThan(0);
    expect(Number(taillePublic)).toBeGreaterThan(0);
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(raison.length).toBeGreaterThan(40);
    // La raison ne doit pas, elle non plus, contenir l'adresse qu'elle explique.
    expect(raison).not.toMatch(ADRESSE);
  });
});
