import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

/**
 * LE GARDE-FOU QUI AURAIT ÉVITÉ UNE ERREUR P0.
 *
 * CE QUI S'EST PASSÉ, EXACTEMENT.
 *
 * Le harnais Postgres a besoin de neuf fonctions et six tables que les migrations
 * utilisent avant de les créer. La première version les a déclarées avec un corps
 * minimal — `current_org_id()` rendant `null`, `a_role_asso()` rendant `false` — dans un
 * fichier posé DANS `supabase/migrations/`, sous le nom `0000_prerequis…`, avec ce
 * commentaire rassurant :
 *
 *     « Sur une base déjà migrée, ce fichier est sans effet : 0011 et 0013 réécriront
 *       les vrais corps lors du rejeu. »
 *
 * IL N'Y A PAS DE REJEU. Supabase tient la liste des migrations appliquées dans
 * `supabase_migrations.schema_migrations` ; ce qui y figure n'est pas réexécuté. `0011`
 * et `0013` y figurent depuis le 22/07. `0000`, lui, en aurait été absent : il aurait
 * donc été traité comme une migration MANQUANTE, exécuté seul, et ses `create or replace`
 * auraient écrasé les corps réels par les corps minimaux. Sur la base de production :
 * toutes les RLS aveugles, la console d'administration morte, les webhooks Stripe
 * encaissant sans rien enregistrer.
 *
 * Le risque a été vu en relecture, avant fusion. Rien n'a été déployé.
 *
 * CE QUE CE FICHIER PROTÈGE MAINTENANT. Les prérequis vivent dans
 * `scripts/db/bootstrap/`, hors du chemin de déploiement. Ce test échoue si l'un d'eux
 * revient dans `supabase/migrations/`, sous quelque forme que ce soit — par son marqueur,
 * par son nom, ou par un corps minimal reconnaissable. Il coûte quelques millisecondes ;
 * l'erreur qu'il attrape coûte une base de production.
 */

const RACINE = path.resolve(__dirname, "..");
const MIGRATIONS = path.join(RACINE, "supabase/migrations");
const BOOTSTRAP = path.join(RACINE, "scripts/db/bootstrap");

/** Le marqueur que porte chaque fichier de bootstrap, en première ligne. */
const MARQUEUR = "KLUBSTER-BOOTSTRAP-HARNAIS";

const sql = (dossier: string) =>
  existsSync(dossier) ? readdirSync(dossier).filter((f) => f.endsWith(".sql")).sort() : [];

/** Le SQL sans ses commentaires `--`. Les en-têtes de ce dépôt décrivent longuement ce
 *  qu'ils s'interdisent ; les lire comme du code ferait échouer les fichiers les plus
 *  scrupuleux — la même leçon que `tests/demo-isolation.test.ts` a déjà coûté deux fois. */
const code = (texte: string) => texte.replace(/^\s*--.*$/gm, "");

const FICHIERS_MIGRATION = sql(MIGRATIONS);
const FICHIERS_BOOTSTRAP = sql(BOOTSTRAP);
const lireMigration = (f: string) => readFileSync(path.join(MIGRATIONS, f), "utf8");

/** Les fonctions que le bootstrap déclare avec un corps minimal. Extraites des fichiers,
 *  jamais recopiées : ajouter un prérequis étend automatiquement la surveillance. */
const FONCTIONS_BOOTSTRAP = FICHIERS_BOOTSTRAP.flatMap((f) =>
  [...code(readFileSync(path.join(BOOTSTRAP, f), "utf8"))
    .matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(/gi)].map((m) => m[1])
);

/**
 * Les corps minimaux, tels qu'ils apparaissent dans le bootstrap.
 *
 * La liste est volontairement étroite. `select false` est du SQL parfaitement légitime
 * dans une vraie fonction ; l'interdire partout rendrait le test insupportable et il
 * finirait désactivé. Il n'est refusé QUE pour l'une des fonctions du bootstrap.
 */
const CORPS_MINIMAUX = [/select\s+null::\w+/i, /select\s+false/i, /select\s+0\b/i, /^\s*select\s*$/im];

describe("les migrations déployables ne contiennent aucun prérequis de harnais", () => {
  it("lit bien les deux répertoires", () => {
    // Un test qui ne lirait rien passerait pour toujours.
    expect(FICHIERS_MIGRATION.length).toBeGreaterThan(20);
    expect(FICHIERS_BOOTSTRAP.length).toBeGreaterThan(0);
    expect(FONCTIONS_BOOTSTRAP.length).toBeGreaterThan(5);
  });

  it("chaque fichier de bootstrap porte son marqueur", () => {
    // Sans marqueur, le contrôle suivant ne peut rien reconnaître.
    const sansMarqueur = FICHIERS_BOOTSTRAP.filter(
      (f) => !readFileSync(path.join(BOOTSTRAP, f), "utf8").includes(MARQUEUR)
    );
    expect(sansMarqueur).toEqual([]);
  });

  it("aucun fichier de migration ne porte le marqueur du bootstrap", () => {
    const coupables = FICHIERS_MIGRATION.filter((f) => lireMigration(f).includes(MARQUEUR));
    expect(coupables, `bootstrap déployable : ${coupables.join(", ")}`).toEqual([]);
  });

  it("aucun fichier de migration ne reprend le nom d’un fichier de bootstrap", () => {
    const noms = new Set(FICHIERS_BOOTSTRAP.map((f) => f.replace(/^avant-\d+_/, "")));
    const coupables = FICHIERS_MIGRATION.filter(
      (f) => f.startsWith("avant-") || noms.has(f.replace(/^\d+[a-z]?_/, ""))
    );
    expect(coupables).toEqual([]);
  });

  it("aucune migration ne définit une fonction du bootstrap avec un corps minimal", () => {
    const coupables: string[] = [];
    for (const f of FICHIERS_MIGRATION) {
      const src = code(lireMigration(f));
      for (const fonction of FONCTIONS_BOOTSTRAP) {
        // La définition de CETTE fonction, jusqu'au `$$` fermant : on ne juge que son
        // corps à elle, pas le reste du fichier.
        const motif = new RegExp(
          `create\\s+or\\s+replace\\s+function\\s+public\\.${fonction}\\s*\\([^;]*?as\\s*\\$\\$([\\s\\S]*?)\\$\\$`,
          "i"
        );
        const trouve = src.match(motif);
        if (!trouve) continue;
        const corps = trouve[1];
        // Un corps minimal tient en une instruction. Une vraie fonction de Klubster fait
        // au moins quelques lignes : la longueur seule ne suffirait pas à conclure, mais
        // combinée au motif elle évite de refuser un `select false` niché dans un `case`.
        if (corps.trim().length < 60 && CORPS_MINIMAUX.some((m) => m.test(corps))) {
          coupables.push(`${f} → ${fonction}() = « ${corps.trim()} »`);
        }
      }
    }
    expect(coupables, `corps minimal déployable :\n${coupables.join("\n")}`).toEqual([]);
  });
});

describe("la numérotation des migrations n’autorise pas d’insertion rétroactive", () => {
  /**
   * POURQUOI CE CONTRÔLE.
   *
   * Les migrations s'appliquent dans l'ordre alphabétique du nom de fichier. La première
   * version du harnais s'en est servie pour glisser `0001a_tables…` ENTRE `0001` et
   * `0002` — deux fichiers déjà appliqués en production. Un fichier inséré à cet endroit
   * est, pour Supabase, une migration manquante : il s'exécuterait seul, dans une base
   * dont l'état n'a plus rien à voir avec celui qu'il suppose.
   *
   * La règle est donc : `NNNN_nom.sql`, quatre chiffres, pas de suffixe littéral, aucun
   * doublon. Ce qui interdit exactement le tour utilisé.
   *
   * Les dérogations sont possibles, mais elles s'écrivent ici, avec leur date et leur
   * raison — pas dans un commentaire au fil de l'eau.
   */
  const DEROGATIONS: string[] = [];

  it("chaque migration est numérotée NNNN_, sans suffixe littéral", () => {
    const mauvaises = FICHIERS_MIGRATION.filter(
      (f) => !DEROGATIONS.includes(f) && !/^\d{4}_[a-z0-9_]+\.sql$/.test(f)
    );
    expect(mauvaises, `numérotation non conforme : ${mauvaises.join(", ")}`).toEqual([]);
  });

  it("aucun numéro n’est utilisé deux fois", () => {
    const numeros = FICHIERS_MIGRATION.map((f) => f.slice(0, 4));
    const doublons = numeros.filter((n, i) => numeros.indexOf(n) !== i);
    expect([...new Set(doublons)]).toEqual([]);
  });

  it("les numéros se suivent sans trou", () => {
    // Un trou n'est pas dangereux en soi, mais il signale presque toujours un fichier
    // supprimé ou renommé — donc un historique qui ne dit plus ce qui a été appliqué.
    const numeros = FICHIERS_MIGRATION.filter((f) => !DEROGATIONS.includes(f))
      .map((f) => Number(f.slice(0, 4)))
      .sort((a, b) => a - b);
    const attendus = numeros.map((_, i) => numeros[0] + i);
    expect(numeros).toEqual(attendus);
  });
});

describe("l’inventaire des dépendances manquantes est à jour", () => {
  const DOC = path.join(RACINE, "docs/finalisation-klubster/dependances-migrations-manquantes.md");

  it("existe", () => {
    expect(existsSync(DOC)).toBe(true);
  });

  it("décrit chaque objet déclaré par le bootstrap", () => {
    // Le document est généré (`node scripts/db/inventaire.mjs`). Ce contrôle-ci vérifie
    // qu'il n'a pas vieilli : un prérequis ajouté sans régénérer l'inventaire ferait dire
    // au document qu'il y a moins d'écarts qu'en réalité — exactement le genre de chiffre
    // périmé qui rassure à tort.
    const contenu = readFileSync(DOC, "utf8");
    const objets: string[] = [];
    for (const f of FICHIERS_BOOTSTRAP) {
      const src = code(readFileSync(path.join(BOOTSTRAP, f), "utf8"));
      for (const m of src.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(/gi))
        objets.push(m[1]);
      for (const m of src.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi))
        objets.push(m[1]);
      for (const m of src.matchAll(
        /alter\s+table\s+public\.(\w+)\s+add\s+column\s+if\s+not\s+exists\s+(\w+)/gi
      ))
        objets.push(`${m[1]}.${m[2]}`);
    }
    const absents = [...new Set(objets)].filter((o) => !contenu.includes(`\`${o}\``));
    expect(absents, `absents de l’inventaire : ${absents.join(", ")}`).toEqual([]);
  });
});
