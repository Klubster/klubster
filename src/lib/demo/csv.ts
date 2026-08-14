/**
 * Génération et lecture de CSV, entièrement dans le navigateur.
 *
 * Aucun réseau : `Blob` + `URL.createObjectURL` suffisent à produire un fichier, et
 * `File.text()` à en lire un. Rien ne part, rien n'arrive.
 */

import type { AdherentDemo, AdhesionDemo, CoursDemo } from "./types";

/** Guillemets partout, guillemets internes doublés — comme `export/route.ts`. */
function champCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

/**
 * Les DIX colonnes du produit, dans l'ordre, et rien d'autre.
 *
 * Pas de ligne d'avertissement avant l'en-tête : un CSV dont la première ligne n'est pas
 * l'en-tête ne s'ouvre pas correctement dans un tableur, et le visiteur jugerait l'export
 * de Klubster sur un défaut que Klubster n'a pas. Le caractère fictif se lit au nom du
 * fichier, aux identités inventées et aux adresses en `@example.com`.
 */
export const COLONNES_EXPORT = [
  "Prénom",
  "Nom",
  "Email",
  "Téléphone",
  "Inscrit le",
  "Cours",
  "Saison",
  "Statut",
  "Montant (€)",
  "Mode de paiement",
] as const;

export function construireCsvAdherents(
  adherents: AdherentDemo[],
  adhesions: AdhesionDemo[],
  cours: CoursDemo[]
): string {
  const nomCours = new Map(cours.map((c) => [c.id, c.nom]));
  const lignes = [COLONNES_EXPORT.map(champCsv).join(";")];

  // Tri par nom, comme la liste et l'export réels.
  const tries = [...adherents].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  for (const a of tries) {
    // Une ligne PAR ADHÉSION ; un adhérent sans adhésion produit une ligne aux cinq
    // dernières colonnes vides. C'est exactement ce que fait `export/route.ts`.
    const siennes = adhesions.filter((ad) => ad.adherent_id === a.id);
    const lot: (AdhesionDemo | null)[] = siennes.length ? siennes : [null];
    for (const ad of lot) {
      lignes.push(
        [
          a.prenom,
          a.nom,
          a.email,
          a.telephone,
          a.created_at.slice(0, 10),
          ad?.cours_id ? nomCours.get(ad.cours_id) ?? "" : "",
          ad?.saison ?? "",
          // Valeur brute, non traduite : `paye`, `en_attente`… comme le produit.
          ad?.statut ?? "",
          ad?.montant_centimes != null ? (ad.montant_centimes / 100).toFixed(2).replace(".", ",") : "",
          ad?.mode_paiement ?? "",
        ]
          .map(champCsv)
          .join(";")
      );
    }
  }

  // BOM UTF-8 : sans lui, Excel massacre les accents.
  return "﻿" + lignes.join("\n");
}

export const NOM_FICHIER_EXPORT = "demonstration-klubster-adherents.csv";

/** Déclenche le téléchargement d'un texte, sans quitter la page ni rien émettre. */
export function telecharger(contenu: string, nomFichier: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nomFichier;
  a.click();
  // Libérer l'objet : sans cela, le contenu reste en mémoire jusqu'au rechargement.
  URL.revokeObjectURL(url);
}

// ——— Lecture ——————————————————————————————————————————————————————————————————

/** Devine le séparateur parmi `;`, `,` et la tabulation, comme le parseur réel. */
function separateur(ligne: string): string {
  const candidats = [";", ",", "\t"];
  return candidats.reduce((meilleur, c) =>
    ligne.split(c).length > ligne.split(meilleur).length ? c : meilleur
  );
}

/** Lecteur CSV minimal : guillemets, guillemets échappés, BOM. */
export function lireCsv(texte: string): { entetes: string[]; lignes: string[][] } {
  const net = texte.replace(/^﻿/, "").replace(/\r\n/g, "\n").trim();
  if (!net) return { entetes: [], lignes: [] };
  const sep = separateur(net.split("\n")[0]);

  const toutes: string[][] = [];
  let cellule = "";
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < net.length; i++) {
    const c = net[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (net[i + 1] === '"') {
          cellule += '"';
          i++;
        } else {
          dansGuillemets = false;
        }
      } else {
        cellule += c;
      }
    } else if (c === '"') {
      dansGuillemets = true;
    } else if (c === sep) {
      ligne.push(cellule.trim());
      cellule = "";
    } else if (c === "\n") {
      ligne.push(cellule.trim());
      toutes.push(ligne);
      ligne = [];
      cellule = "";
    } else {
      cellule += c;
    }
  }
  ligne.push(cellule.trim());
  toutes.push(ligne);

  const [entetes, ...reste] = toutes;
  return { entetes: entetes ?? [], lignes: reste.filter((l) => l.some((c) => c !== "")) };
}

/** Les cinq champs de l'import réel (`CHAMPS_IMPORT` dans src/lib/csv.ts). */
export const CHAMPS_IMPORT = [
  { cle: "prenom", label: "Prénom", requis: true },
  { cle: "nom", label: "Nom", requis: true },
  { cle: "email", label: "Email", requis: false },
  { cle: "telephone", label: "Téléphone", requis: false },
  { cle: "cours", label: "Cours", requis: false },
] as const;

/** Synonymes reconnus par la détection automatique, repris du produit. */
const SYNONYMES: Record<string, string[]> = {
  prenom: ["prenom", "prénom", "firstname", "first name", "given name"],
  nom: ["nom", "lastname", "last name", "surname", "nom de famille", "family name"],
  email: ["email", "e-mail", "mail", "courriel", "adresse email"],
  telephone: ["telephone", "téléphone", "tel", "tél", "portable", "mobile", "phone"],
  cours: ["cours", "activite", "activité", "groupe", "section", "discipline", "categorie", "catégorie"],
};

/** Devine la colonne du fichier correspondant à chaque champ. -1 = non associée. */
export function deviner(entetes: string[]): Record<string, number> {
  const net = entetes.map((e) => e.toLowerCase().trim());
  const trouve: Record<string, number> = {};
  for (const champ of CHAMPS_IMPORT) {
    const noms = SYNONYMES[champ.cle] ?? [];
    trouve[champ.cle] = net.findIndex((e) => noms.includes(e));
  }
  return trouve;
}

export const emailPlausible = (v: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);

/**
 * Le fichier d'exemple, volontairement imparfait.
 *
 * Il porte les défauts d'un vrai fichier de club exporté d'un tableur : une colonne
 * nommée « Activité » que la détection reconnaît, une autre nommée « Portable » aussi,
 * une ligne sans email, un doublon exact, un cours qui n'existe pas au club, et une
 * ligne sans nom qui sera ignorée. Un fichier propre n'aurait rien montré des
 * avertissements — c'est-à-dire de ce qui rassure vraiment un président.
 */
export const CSV_EXEMPLE = `Prénom;Nom;Adresse email;Portable;Activité
Camille;Aubert;camille.aubert@example.com;06 11 11 11 11;Judo poussins
Nicolas;Perrot;nicolas.perrot@example.com;06 22 22 22 22;Éveil judo
Farida;Belkacem;;06 33 33 33 33;Judo benjamins
Camille;Aubert;camille.aubert@example.com;06 11 11 11 11;Judo poussins
Élodie;Charpentier;elodie.charpentier@example;06 44 44 44 44;Aquagym
;Sanchez;p.sanchez@example.com;06 55 55 55 55;Judo minimes et cadets
Gaël;Morvan;gael.morvan@example.com;;Taïso
`;
