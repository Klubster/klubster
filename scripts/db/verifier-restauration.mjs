#!/usr/bin/env node
/**
 * Vérifie que les migrations restituées sont exactement celles de l'historique distant —
 * à l'exception des dérogations explicitement déclarées.
 *
 * POURQUOI UN ORACLE, ET PAS UNE RELECTURE.
 *
 * La consigne est de restituer sans réécriture ni reformatage. Une relecture humaine ne
 * peut pas le garantir : un espace en fin de ligne, un retour chariot converti, un accent
 * réencodé passent inaperçus et changent le fichier. Ce script compare des empreintes MD5
 * relevées sur la BASE, avant toute écriture, à celles des fichiers écrits.
 *
 * TROIS ÉTATS, ET ILS NE SE CONFONDENT PAS :
 *
 *   conforme                    le fichier est identique à l'historique distant ;
 *   dérogation contrôlée        il en diffère, la dérogation est déclarée au manifeste,
 *                               et le fichier correspond au MD5 public annoncé — donc
 *                               AUCUN autre octet n'a bougé depuis la substitution ;
 *   divergence non expliquée    tout le reste. Échec.
 *
 * Une dérogation non déclarée est donc indistinguable d'une corruption, et c'est voulu :
 * c'est la seule façon d'empêcher qu'une seconde exception se glisse en silence derrière
 * la première.
 *
 * Usage : node scripts/db/verifier-restauration.mjs
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MANIFESTE = path.join(RACINE, "docs/finalisation-klubster/manifeste-migrations.tsv");
const MIGRATIONS = path.join(RACINE, "supabase/migrations");

const brut = readFileSync(MANIFESTE, "utf8").split("\n");

const lignes = brut
  .filter((l) => /^\d{14}\t/.test(l))
  .map((l) => {
    const [version, name, md5, taille] = l.split("\t");
    return { version, name, md5, taille: Number(taille) };
  });

/** Les dérogations, indexées par version. */
const derogations = new Map(
  brut
    .filter((l) => l.startsWith("DEROGATION\t"))
    .map((l) => {
      const [, version, md5Origine, tailleOrigine, md5Public, taillePublic, date, raison] = l.split("\t");
      return [version, { version, md5Origine, tailleOrigine: Number(tailleOrigine), md5Public, taillePublic: Number(taillePublic), date, raison }];
    })
);

if (lignes.length === 0) {
  console.error("Manifeste vide — le contrôle ne prouverait rien.");
  process.exit(1);
}

const md5De = (buf) => createHash("md5").update(buf).digest("hex");

let conformes = 0, derogees = 0, divergentes = 0, manquantes = 0;
const restants = [];

for (const m of lignes) {
  const fichier = path.join(MIGRATIONS, `${m.version}_${m.name}.sql`);
  if (!existsSync(fichier)) {
    manquantes++;
    restants.push(`${m.version}_${m.name}`);
    continue;
  }
  // Lecture binaire : passer par une chaîne laisserait Node normaliser l'encodage, et le
  // MD5 porterait sur autre chose que le fichier réellement écrit.
  const contenu = readFileSync(fichier);
  const empreinte = md5De(contenu);

  if (empreinte === m.md5) {
    conformes++;
    // Une dérogation déclarée sur un fichier finalement identique à l'original signifie
    // que la substitution n'a pas été faite — donc que la valeur sensible est publiée.
    if (derogations.has(m.version)) {
      console.error(
        `DÉROGATION NON APPLIQUÉE  ${m.version}_${m.name}\n` +
        `  le fichier est identique à l'original : la valeur sensible n'a pas été substituée.`
      );
      divergentes++;
      conformes--;
    }
    continue;
  }

  const d = derogations.get(m.version);
  if (d && empreinte === d.md5Public) {
    derogees++;
    continue;
  }

  divergentes++;
  if (d) {
    console.error(
      `DÉROGATION ALTÉRÉE  ${m.version}_${m.name}\n` +
      `  attendu ${d.md5Public} (${d.taillePublic} octets, version publique déclarée)\n` +
      `  trouvé  ${empreinte} (${contenu.length} octets)\n` +
      `  Un autre passage du fichier a été modifié. Une seule substitution est autorisée.`
    );
  } else {
    console.error(
      `DIVERGENCE NON EXPLIQUÉE  ${m.version}_${m.name}\n` +
      `  attendu ${m.md5} (${m.taille} octets)\n` +
      `  trouvé  ${empreinte} (${contenu.length} octets)\n` +
      `  Si l'écart est volontaire, il doit être déclaré au manifeste (ligne DEROGATION).`
    );
  }
}

// Un fichier restitué absent du manifeste échapperait entièrement au contrôle.
const connus = new Set(lignes.map((m) => `${m.version}_${m.name}.sql`));
const orphelins = existsSync(MIGRATIONS)
  ? readdirSync(MIGRATIONS).filter((f) => /^\d{14}_/.test(f) && !connus.has(f))
  : [];

// Une dérogation déclarée pour une version qui n'existe pas au manifeste laisserait croire
// qu'un écart est couvert alors qu'il ne porte sur rien.
const versionsConnues = new Set(lignes.map((m) => m.version));
const derogationsOrphelines = [...derogations.keys()].filter((v) => !versionsConnues.has(v));

console.log(
  `Restitution : ${conformes} byte-exactes, ${derogees} dérogation(s) contrôlée(s), ` +
  `${divergentes} divergence(s) non expliquée(s), ${manquantes} manquante(s) — sur ${lignes.length}.`
);
if (orphelins.length) console.error(`ORPHELINS (hors manifeste) : ${orphelins.join(", ")}`);
if (derogationsOrphelines.length) console.error(`DÉROGATIONS SANS MIGRATION : ${derogationsOrphelines.join(", ")}`);
if (restants.length) {
  console.log(`Restent à extraire (${restants.length}) : ${restants.slice(0, 6).join(", ")}${restants.length > 6 ? " …" : ""}`);
}

process.exit(divergentes > 0 || orphelins.length > 0 || derogationsOrphelines.length > 0 ? 1 : 0);
