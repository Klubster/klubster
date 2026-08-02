#!/usr/bin/env node
/**
 * Génère `docs/finalisation-klubster/dependances-migrations-manquantes.md`.
 *
 * POURQUOI UN GÉNÉRATEUR PLUTÔT QU'UN TABLEAU ÉCRIT À LA MAIN.
 *
 * Un inventaire recopié fige les premiers nombres trouvés. Trois migrations plus tard il
 * dit encore « 9 fonctions » alors qu'il y en a onze, et personne ne s'en aperçoit parce
 * qu'un document ne casse pas la CI. Celui-ci se relit : `tests/migrations-deployables.
 * test.ts` échoue si un objet déclaré par le bootstrap n'a pas sa ligne ici.
 *
 * TOUT EST STATIQUE. Le générateur ne se connecte à aucune base : il lit les fichiers du
 * bootstrap et ceux de `supabase/migrations/`. Il tourne donc en CI sans PostgreSQL, et
 * il ne peut pas, même par accident, toucher à la production.
 *
 * Usage : node scripts/db/inventaire.mjs [--verifier]
 *   sans option  : réécrit le document
 *   --verifier   : n'écrit rien, sort en 1 si le document est périmé
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const BOOTSTRAP = path.join(RACINE, "scripts/db/bootstrap");
const MIGRATIONS = path.join(RACINE, "supabase/migrations");
const DOC = path.join(RACINE, "docs/finalisation-klubster/dependances-migrations-manquantes.md");

const lire = (p) => readFileSync(p, "utf8");
const sqlDe = (dossier) =>
  readdirSync(dossier).filter((f) => f.endsWith(".sql")).sort();

/** Le SQL sans ses commentaires `--`. Les en-têtes de ce dépôt sont longs et parlent
 *  abondamment des objets qu'ils déclarent ; les lire comme du code ferait dire au
 *  générateur que `0006` définit `current_org_id` parce qu'il la mentionne. */
const code = (texte) => texte.replace(/^\s*--.*$/gm, "");

// ——— Ce que le bootstrap déclare ——————————————————————————————————————————————
const objets = [];
for (const f of sqlDe(BOOTSTRAP)) {
  const src = code(lire(path.join(BOOTSTRAP, f)));
  const categorie = /manquantes/.test(f) ? "absent" : "repris";
  for (const m of src.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)\s*\(/gi))
    objets.push({ nom: m[1], genre: "fonction", fichier: f, categorie });
  for (const m of src.matchAll(/create\s+table\s+if\s+not\s+exists\s+public\.(\w+)/gi))
    objets.push({ nom: m[1], genre: "table", fichier: f, categorie });
  for (const m of src.matchAll(/alter\s+table\s+public\.(\w+)\s+add\s+column\s+if\s+not\s+exists\s+(\w+)/gi))
    objets.push({ nom: `${m[1]}.${m[2]}`, genre: "colonne", fichier: f, categorie });
}

// ——— Où le dépôt s'en sert, et où il les définit ——————————————————————————————
const migrations = sqlDe(MIGRATIONS).map((f) => ({ nom: f, src: code(lire(path.join(MIGRATIONS, f))) }));

/** Le nom nu, pour chercher un usage : `adherents.user_id` s'utilise souvent `user_id`. */
const motCle = (o) => (o.genre === "colonne" ? o.nom.split(".")[1] : o.nom);

const premierUsage = (o) => {
  const motif = new RegExp(`\\b${motCle(o)}\\b`);
  return migrations.find((m) => motif.test(m.src))?.nom ?? "—";
};

const definitionTardive = (o) => {
  const motifs = {
    fonction: new RegExp(`create\\s+(or\\s+replace\\s+)?function\\s+public\\.${o.nom}\\s*\\(`, "i"),
    table: new RegExp(`create\\s+table\\s+(if\\s+not\\s+exists\\s+)?public\\.${o.nom}\\b`, "i"),
    colonne: new RegExp(`add\\s+column\\s+(if\\s+not\\s+exists\\s+)?${motCle(o)}\\b`, "i"),
  };
  return migrations.find((m) => motifs[o.genre].test(m.src))?.nom ?? null;
};

const lignes = objets
  .map((o) => {
    const tardive = definitionTardive(o);
    return {
      ...o,
      usage: premierUsage(o),
      tardive: tardive ?? "**aucune**",
      remplace: tardive ? "oui" : "**non**",
      verifie: tardive ? "assertion 00/01" : "assertion 02",
    };
  })
  .sort((a, b) => a.genre.localeCompare(b.genre) || a.nom.localeCompare(b.nom));

const nRepris = lignes.filter((l) => l.categorie === "repris").length;
const nAbsent = lignes.filter((l) => l.categorie === "absent").length;

// ——— Le document ——————————————————————————————————————————————————————————————
const doc = `# Dépendances de migrations manquantes

> **Document généré.** Ne pas l'éditer à la main : \`node scripts/db/inventaire.mjs\`.
> \`tests/migrations-deployables.test.ts\` échoue s'il est périmé.

Chaque ligne est un objet que les migrations de \`supabase/migrations/\` **utilisent avant
de le créer**, ou ne créent jamais. Sans eux, rejouée sur une base vide, la chaîne
s'arrête à \`0003\`.

Deux statuts, et ils n'ont pas la même gravité :

- **repris** (${nRepris}) — l'objet existe bien dans le dépôt, mais trop tard. Le prérequis
  du harnais n'avance que sa date de naissance ; une migration réelle le remplace ensuite,
  et \`scripts/db/assertions/00\` échoue si ce n'est pas le cas.
- **absent** (${nAbsent}) — l'objet n'est défini **nulle part** dans le dépôt. Sa forme n'existe
  que dans la base de production, d'où elle a été extraite. Rien ne le remplacera tant que
  l'historique canonique n'aura pas été repris.

| Objet | Type | Premier usage | Définition tardive | Prérequis | Remplacé | Vérifié |
| --- | --- | --- | --- | --- | --- | --- |
${lignes
  .map(
    (l) =>
      `| \`${l.nom}\` | ${l.genre} | ${l.usage} | ${l.tardive} | ${l.categorie} | ${l.remplace} | ${l.verifie} |`
  )
  .join("\n")}

## La cause, vérifiée

La base de production porte **73 migrations appliquées** ; le dépôt en contient **${migrations.length}**.
Les 47 migrations appliquées entre le 29/06 et le 11/07/2026 — de \`vitrine_contenu\` à
\`jauge_liste_attente\` — n'ont aucun fichier correspondant : le dépôt saute de
\`init_multitenant\` (29/06) à \`create_club_ne_detache_plus_le_compte\` (21/07).

C'est là que se trouvent \`form_builder_and_member_foundation\`, \`theme_template_mode\`,
\`abonnement_klubster\`, \`saison_dates_organisation\`, \`storage_pieces_bucket\`,
\`questionnaire_sante\`, \`presences_and_scanner_functions\` — c'est-à-dire exactement les
objets du tableau ci-dessus.

Dans l'autre sens : \`0011_reference_fonctions_auth.sql\` existe dans le dépôt mais ne
figure **pas** dans l'historique appliqué en production. Les fonctions qu'il déclare y sont
bien, créées par des migrations antérieures absentes du dépôt.

*[Vérifié le 02/08/2026 par lecture de \`supabase_migrations.schema_migrations\` sur le
projet \`basnfuvdjobanejahayt\` — métadonnées de catalogue uniquement, aucune ligne de
donnée, aucune écriture.]*

## Ce que cela coûte

1. **Aucune reprise après sinistre.** Le projet Supabase perdu, le dépôt ne le reconstruit
   pas. Pour un produit qui héberge des données de santé et des mineurs, ce n'est pas un
   détail d'hygiène.
2. **Aucune migration testable avant la production**, puisque aucune autre base ne peut
   être amenée dans le même état.
3. **Aucune préproduction reproductible.**

## Ce qui n'est pas fait ici

Cette PR **ne corrige pas** l'historique canonique. Elle permet de le parcourir, de le
mesurer, et de faire tourner des tests dessus.

Le corps SQL des 47 migrations manquantes est intégralement conservé dans
\`supabase_migrations.schema_migrations.statements\`. La reconstruction est donc possible
**par extraction**, sans rien réinventer. Reste un choix qui appartient à Mathieu :
restituer les 47 fichiers tels quels, ou repartir d'une baseline unique et archiver
l'ancien historique. C'est l'objectif B, dans une PR distincte.
`;

if (process.argv.includes("--verifier")) {
  const actuel = (() => { try { return lire(DOC); } catch { return null; } })();
  if (actuel !== doc) {
    console.error("Inventaire périmé — relancer : node scripts/db/inventaire.mjs");
    process.exit(1);
  }
  console.log(`Inventaire à jour (${lignes.length} objets).`);
} else {
  writeFileSync(DOC, doc);
  console.log(`Écrit : ${path.relative(RACINE, DOC)} — ${lignes.length} objets (${nRepris} repris, ${nAbsent} absents).`);
}
