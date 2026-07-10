/**
 * Lecture d'un CSV réel — c'est-à-dire imparfait.
 *
 * Les fichiers des clubs viennent d'Excel, de LibreOffice, d'AssoConnect ou d'un vieux
 * tableur : séparateur point-virgule (usage français) ou virgule, guillemets, retours à la
 * ligne dans les cellules, BOM UTF-8 en tête. Un `split(",")` naïf casse sur tout ça.
 */

/** Devine le séparateur en comparant leur fréquence sur la première ligne utile. */
export function devinerSeparateur(texte: string): string {
  const premiere = texte.split(/\r?\n/).find((l) => l.trim().length > 0) ?? "";
  const candidats = [";", ",", "\t"];
  let meilleur = ";";
  let max = -1;
  for (const c of candidats) {
    // On ne compte que hors guillemets, sinon "Dupont, Jean" fausse tout.
    let n = 0;
    let dansGuillemets = false;
    for (const ch of premiere) {
      if (ch === '"') dansGuillemets = !dansGuillemets;
      else if (ch === c && !dansGuillemets) n++;
    }
    if (n > max) {
      max = n;
      meilleur = c;
    }
  }
  return meilleur;
}

export interface CsvLu {
  entetes: string[];
  lignes: string[][];
  separateur: string;
}

export function lireCsv(texte: string, separateurForce?: string): CsvLu {
  // BOM UTF-8 : invisible, mais colle au premier en-tête et casse la correspondance.
  const propre = texte.replace(/^﻿/, "");
  const sep = separateurForce ?? devinerSeparateur(propre);

  const lignes: string[][] = [];
  let champ = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < propre.length; i++) {
    const ch = propre[i];

    if (dansGuillemets) {
      if (ch === '"') {
        if (propre[i + 1] === '"') {
          champ += '"'; // guillemet échappé ("")
          i++;
        } else dansGuillemets = false;
      } else champ += ch;
      continue;
    }

    if (ch === '"') dansGuillemets = true;
    else if (ch === sep) {
      ligne.push(champ);
      champ = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && propre[i + 1] === "\n") i++;
      ligne.push(champ);
      champ = "";
      if (ligne.some((c) => c.trim() !== "")) lignes.push(ligne);
      ligne = [];
    } else champ += ch;
  }
  ligne.push(champ);
  if (ligne.some((c) => c.trim() !== "")) lignes.push(ligne);

  const entetes = (lignes.shift() ?? []).map((e) => e.trim());
  return { entetes, lignes, separateur: sep };
}

/* ——— Champs Klubster et détection automatique ——— */

export const CHAMPS_IMPORT = [
  { cle: "prenom", label: "Prénom", requis: true },
  { cle: "nom", label: "Nom", requis: true },
  { cle: "email", label: "Email", requis: false },
  { cle: "telephone", label: "Téléphone", requis: false },
  { cle: "cours", label: "Cours", requis: false },
] as const;

export type CleChamp = (typeof CHAMPS_IMPORT)[number]["cle"];

const SYNONYMES: Record<CleChamp, string[]> = {
  prenom: ["prenom", "prénom", "firstname", "first name", "given name"],
  nom: ["nom", "lastname", "last name", "surname", "nom de famille", "family name"],
  email: ["email", "e-mail", "mail", "courriel", "adresse email"],
  telephone: ["telephone", "téléphone", "tel", "tél", "portable", "mobile", "phone"],
  cours: ["cours", "activite", "activité", "groupe", "section", "discipline", "categorie", "catégorie"],
};

/** Associe chaque champ Klubster à la colonne du fichier qui lui ressemble le plus. */
export function deviner(entetes: string[]): Record<CleChamp, number> {
  const normalise = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // accents combinants
      .trim();

  const resultat = {} as Record<CleChamp, number>;
  for (const champ of CHAMPS_IMPORT) {
    const cibles = SYNONYMES[champ.cle].map(normalise);
    const index = entetes.findIndex((e) => cibles.includes(normalise(e)));
    resultat[champ.cle] = index;
  }

  // « Nom » seul, sans colonne prénom : c'est souvent « Nom Prénom » ensemble.
  return resultat;
}

export function emailValide(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}
