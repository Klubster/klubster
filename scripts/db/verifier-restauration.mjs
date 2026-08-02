#!/usr/bin/env node
/**
 * Vérifie que les migrations restituées sont EXACTEMENT celles de l'historique distant.
 *
 * POURQUOI UN ORACLE, ET PAS UNE RELECTURE.
 *
 * La consigne est de restituer sans réécriture, sans reformatage, sans renommage. Une
 * relecture humaine ne peut pas garantir cela : un espace en fin de ligne, un retour
 * chariot converti, un accent réencodé passent inaperçus et changent le fichier. Ce
 * script compare des empreintes MD5 relevées sur la BASE, avant toute écriture, à celles
 * des fichiers écrits. Une divergence d'un seul octet échoue.
 *
 * Les empreintes vivent dans `docs/finalisation-klubster/manifeste-migrations.tsv`, et
 * elles ne sont PAS recalculées depuis les fichiers — sans quoi le contrôle se
 * comparerait à lui-même et passerait toujours.
 *
 * Usage : node scripts/db/verifier-restauration.mjs
 * Sortie 1 si un fichier manque, diverge, ou si le manifeste est incohérent.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFESTE = path.join(RACINE, "docs/finalisation-klubster/manifeste-migrations.tsv");
const MIGRATIONS = path.join(RACINE, "supabase/migrations");

const lignes = readFileSync(MANIFESTE, "utf8")
  .split("\n")
  .filter((l) => /^\d{14}\t/.test(l))
  .map((l) => {
    const [version, name, md5, taille] = l.split("\t");
    return { version, name, md5, taille: Number(taille) };
  });

if (lignes.length === 0) {
  console.error("Manifeste vide — le contrôle ne prouverait rien.");
  process.exit(1);
}

const md5De = (buf) => createHash("md5").update(buf).digest("hex");

let manquants = 0, divergents = 0, ok = 0;
const restants = [];

for (const m of lignes) {
  const fichier = path.join(MIGRATIONS, `${m.version}_${m.name}.sql`);
  if (!existsSync(fichier)) {
    manquants++;
    restants.push(`${m.version}_${m.name}`);
    continue;
  }
  // Lecture en binaire : passer par une chaîne laisserait Node normaliser l'encodage,
  // et le MD5 porterait sur autre chose que le fichier réellement écrit.
  const contenu = readFileSync(fichier);
  const empreinte = md5De(contenu);
  if (empreinte !== m.md5) {
    divergents++;
    console.error(
      `DIVERGENT  ${m.version}_${m.name}\n` +
      `  attendu ${m.md5} (${m.taille} octets)\n` +
      `  trouvé  ${empreinte} (${contenu.length} octets)`
    );
  } else {
    ok++;
  }
}

// Un fichier restitué qui ne serait dans aucun manifeste serait invisible du contrôle.
const connus = new Set(lignes.map((m) => `${m.version}_${m.name}.sql`));
const orphelins = existsSync(MIGRATIONS)
  ? readdirSync(MIGRATIONS).filter((f) => /^\d{14}_/.test(f) && !connus.has(f))
  : [];

console.log(`Restitution : ${ok}/${lignes.length} conformes, ${divergents} divergentes, ${manquants} manquantes.`);
if (orphelins.length) console.error(`ORPHELINS (hors manifeste) : ${orphelins.join(", ")}`);
if (restants.length) {
  console.log(`Restent à extraire (${restants.length}) : ${restants.slice(0, 6).join(", ")}${restants.length > 6 ? " …" : ""}`);
}

process.exit(divergents > 0 || orphelins.length > 0 ? 1 : 0);
