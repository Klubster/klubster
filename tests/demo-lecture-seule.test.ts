import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Le mode démonstration est verrouillé par ARCHITECTURE, pas par vigilance.
 *
 * `/demo` est public et sans authentification. Sa sécurité ne repose pas sur des gardes
 * qu'il faudrait penser à écrire dans chaque action — elle repose sur le fait qu'il
 * n'existe aucune action du tout. S'il n'y a rien à appeler, il n'y a rien à contourner.
 *
 * Ce test transforme cette promesse en contrainte : le jour où quelqu'un importera un
 * client Supabase ou déclarera une Server Action sous `/demo`, la CI refusera la fusion.
 * Sans lui, la garantie ne vaudrait que jusqu'au prochain développeur pressé — moi
 * compris.
 */

const RACINES = ["src/app/demo", "src/lib/demo", "src/components/demo"];

function fichiers(dir: string): string[] {
  let out: string[] = [];
  let entrees: string[];
  try {
    entrees = readdirSync(dir);
  } catch {
    return []; // dossier absent : rien à vérifier
  }
  for (const e of entrees) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) out = out.concat(fichiers(p));
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

// On ignore les commentaires : ces fichiers PARLENT de la règle, et doivent pouvoir le
// faire sans se déclencher eux-mêmes.
function codeSeul(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
    .join("\n");
}

describe("mode démonstration — verrouillé en lecture seule", () => {
  const tous = RACINES.flatMap(fichiers);

  it("trouve bien les fichiers du mode démonstration", () => {
    expect(tous.length).toBeGreaterThan(0);
  });

  it.each(tous)("%s n'importe aucun client Supabase", (f) => {
    const code = codeSeul(readFileSync(f, "utf8"));
    expect(code).not.toMatch(/from\s+["']@\/lib\/supabase/);
    expect(code).not.toMatch(/@supabase\/(supabase-js|ssr)/);
    expect(code).not.toMatch(/createSupabase\w*\s*\(/);
  });

  it.each(tous)("%s ne déclare aucune Server Action", (f) => {
    const code = codeSeul(readFileSync(f, "utf8"));
    expect(code).not.toMatch(/^\s*["']use server["']/m);
  });

  it.each(tous)("%s ne câble aucun formulaire sur une action", (f) => {
    const code = codeSeul(readFileSync(f, "utf8"));
    // `action={...}` sur un <form> est la seule façon d'atteindre une Server Action
    // depuis le balisage. `action="/chemin"` (chaîne) resterait une navigation, mais on
    // refuse les deux : aucune soumission n'a de raison d'exister ici.
    expect(code).not.toMatch(/<form[^>]*\saction=/);
    expect(code).not.toMatch(/formAction=/);
  });

  it.each(tous)("%s n'écrit pas via fetch en POST, PUT, PATCH ou DELETE", (f) => {
    const code = codeSeul(readFileSync(f, "utf8"));
    expect(code).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/i);
  });
});
