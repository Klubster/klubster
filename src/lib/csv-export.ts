/**
 * Écriture CSV — LA fonction, pour tous les exports du produit.
 *
 * Deux exports coexistaient avec chacun son échappement maison : la liste des
 * adhérents (serveur) et les règlements en attente (navigateur). Aucun des deux ne
 * neutralisait l'injection de formule ; corriger l'un aurait laissé l'autre ouvert.
 *
 * INJECTION DE FORMULE (CWE-1236), reproduite sur klubster-dev : un adhérent inscrit
 * sous le prénom `=cmd|' /C calc'!A1` ressortait tel quel dans l'export. À l'ouverture
 * du fichier, Excel n'y voyait pas un prénom mais une formule — le club se faisait
 * attaquer par son propre export, via une donnée qu'un visiteur avait saisie.
 * Convention OWASP : préfixer d'une apostrophe les cellules commençant par
 * `= + - @`, tabulation ou retour chariot. Excel affiche alors le texte, sans rien
 * exécuter, et l'apostrophe n'apparaît pas dans la cellule.
 */

const DANGEREUX = /^[=+\-@\t\r]/;

/** Une cellule : neutralisée, puis échappée. */
export function cellule(v: unknown): string {
  let s = v == null ? "" : String(v);
  if (DANGEREUX.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Une ligne complète, séparateur point-virgule (usage français d'Excel). */
export function ligneCsv(valeurs: unknown[]): string {
  return valeurs.map(cellule).join(";");
}

/**
 * Un fichier complet. BOM UTF-8 (sans lui Excel massacre les accents) et CRLF
 * (ce qu'attend Excel sous Windows pour les cellules multi-lignes).
 */
export function fichierCsv(lignes: unknown[][]): string {
  return "﻿" + lignes.map(ligneCsv).join("\r\n");
}
