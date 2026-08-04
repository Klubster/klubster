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
  { cle: "naissance", label: "Date de naissance", requis: false },
  { cle: "responsable", label: "Email du responsable légal", requis: false },
  { cle: "cours", label: "Cours", requis: false },
  { cle: "montant", label: "Montant déjà réglé", requis: false },
] as const;

export type CleChamp = (typeof CHAMPS_IMPORT)[number]["cle"];

/**
 * Les libellés que portent réellement les fichiers des clubs. Deux règles :
 *  — la reconnaissance est EXACTE après normalisation (accents et casse retirés) :
 *    une correspondance approximative associerait « Mail parent » à « Email », ce qui
 *    ferait écrire à l'enfant l'adresse du père, ou l'inverse ;
 *  — « responsable » est cherché AVANT « email » et « telephone » sur la même colonne
 *    (voir `deviner`), sinon « Téléphone responsable » finirait dans « Téléphone ».
 */
const SYNONYMES: Record<CleChamp, string[]> = {
  prenom: ["prenom", "prénom", "firstname", "first name", "given name", "prenom adherent", "prénom adhérent", "prenom enfant", "prénom enfant"],
  nom: ["nom", "lastname", "last name", "surname", "nom de famille", "family name", "nom adherent", "nom adhérent", "nom enfant"],
  email: ["email", "e-mail", "mail", "courriel", "adresse email", "adresse mail", "email adherent", "mail adherent"],
  telephone: ["telephone", "téléphone", "tel", "tél", "portable", "mobile", "phone", "numero", "numéro"],
  naissance: ["date de naissance", "date naissance", "naissance", "ne le", "né le", "nee le", "née le", "birthdate", "date of birth", "ddn"],
  responsable: ["email responsable", "mail responsable", "email parent", "mail parent", "email du responsable", "responsable legal", "responsable légal", "email representant legal", "mail representant legal", "contact parent", "email tuteur"],
  cours: ["cours", "activite", "activité", "groupe", "section", "discipline", "categorie", "catégorie"],
  montant: ["montant regle", "montant réglé", "montant paye", "montant payé", "paye", "payé", "regle", "réglé", "cotisation reglee", "cotisation réglée", "montant encaisse", "montant encaissé"],
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
  const pris = new Set<number>();
  // Ordre volontaire : les champs « responsable » et « naissance » passent AVANT
  // « email » et « telephone ». Sinon « Mail parent » ou « Téléphone responsable »
  // seraient happés par le champ générique, et le club écrirait au mauvais
  // destinataire — exactement le défaut corrigé côté ciblage au lot K.
  const ordre: CleChamp[] = ["prenom", "nom", "naissance", "responsable", "cours", "montant", "email", "telephone"];
  for (const cle of ordre) {
    const cibles = SYNONYMES[cle].map(normalise);
    const index = entetes.findIndex((e, i) => !pris.has(i) && cibles.includes(normalise(e)));
    resultat[cle] = index;
    if (index >= 0) pris.add(index);
  }

  // « Nom » seul, sans colonne prénom : c'est souvent « Nom Prénom » ensemble.
  return resultat;
}

export function emailValide(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
}

/**
 * Une date de fichier de club vers une date ISO — ou rien.
 *
 * Accepte `jj/mm/aaaa`, `jj-mm-aaaa`, `aaaa-mm-jj`. **Refuse** une date qui n'existe
 * pas (`30/02/2001`) : `new Date("2001-02-30")` glisserait silencieusement au 2 mars
 * et le club se retrouverait avec une date d'anniversaire fausse — donc un mineur
 * classé majeur au mauvais moment. On revalide les composants après construction.
 *
 * Le format américain `mm/jj/aaaa` n'est PAS deviné : `03/04/1995` est ambigu, et
 * choisir au hasard est pire que ne rien importer. Les fichiers visés sont français.
 */
export function dateIso(v: string): string | null {
  const s = (v ?? "").trim();
  if (!s) return null;
  let a: number, m: number, j: number;
  const fr = s.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (fr) { j = +fr[1]; m = +fr[2]; a = +fr[3]; }
  else if (iso) { a = +iso[1]; m = +iso[2]; j = +iso[3]; }
  else return null;
  if (m < 1 || m > 12 || j < 1 || j > 31) return null;
  const d = new Date(Date.UTC(a, m - 1, j));
  // Le test qui compte : la date reconstruite doit être celle demandée.
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== j) return null;
  if (a < 1900 || d.getTime() > Date.now()) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(j).padStart(2, "0")}`;
}

/**
 * « 220,00 », « 220.00 », « 220 € », « 1 200,50 » → centimes. Rien d'autre.
 * Un montant illisible vaut zéro : mieux vaut relancer quelqu'un à jour (il le dira)
 * que d'inscrire un paiement qui n'a jamais eu lieu.
 */
export function montantCentimes(v: string): number {
  const s = (v ?? "").replace(/[\s €]/g, "").replace(",", ".");
  if (!s || !/^\d+(\.\d{1,2})?$/.test(s)) return 0;
  return Math.round(parseFloat(s) * 100);
}
