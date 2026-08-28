/**
 * Markdown restreint — le contenu d'un « bloc descriptif » du formulaire d'inscription.
 *
 * POURQUOI UN PARSEUR MAISON, ET PAS DU HTML
 * Un club saisit ce texte dans l'Atelier ; il est réaffiché à tous ses futurs adhérents,
 * parfois mineurs. Accepter du HTML libre, c'est laisser n'importe quel membre de
 * l'équipe (ou un compte compromis) injecter un script dans une page publique de
 * Klubster. Un assainisseur HTML ajouterait une dépendance et une surface à suivre.
 * On préfère un vocabulaire volontairement petit, transformé en ARBRE et rendu en
 * React : jamais de `dangerouslySetInnerHTML`, donc rien à assainir.
 *
 * Ce qui est compris — et rien d'autre :
 *   - paragraphes (séparés par une ligne vide) ; un retour à la ligne simple = saut de ligne ;
 *   - listes à puces (`- ` ou `* ` en début de ligne) ;
 *   - **gras**, *italique* ;
 *   - liens `[texte](https://…)` et images `![légende](https://…)` en http(s) UNIQUEMENT :
 *     `javascript:`, `data:` ou une adresse relative sont rendus comme du texte brut.
 *
 * Le rendu est dans `src/components/site/TexteRestreint.tsx`. Ici : fonctions pures,
 * testées dans `tests/markdown-restreint.test.ts`.
 */

/** Plafond de saisie d'un bloc descriptif (un planning commenté tient largement dedans). */
export const CONTENU_INFO_MAX = 4000;

export type Inline =
  | { type: "texte"; texte: string }
  | { type: "saut" }
  | { type: "gras"; enfants: Inline[] }
  | { type: "italique"; enfants: Inline[] }
  | { type: "lien"; url: string; enfants: Inline[] };

export type Bloc =
  | { type: "paragraphe"; enfants: Inline[] }
  | { type: "liste"; items: Inline[][] }
  | { type: "image"; url: string; alt: string };

/** Seules les adresses absolues http(s) sont suivies : tout le reste redevient du texte. */
export function urlSure(url: string): string | null {
  const u = url.trim();
  if (!/^https?:\/\/[^\s<>"']+$/i.test(u)) return null;
  return u;
}

// `[texte](url)` ou `![alt](url)` — l'URL ne contient ni espace ni parenthèse.
const LIEN = /^(!?)\[([^\]]*)\]\(([^\s()]+)\)/;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let texte = "";
  const flush = () => {
    if (texte) out.push({ type: "texte", texte });
    texte = "";
  };
  let i = 0;
  while (i < src.length) {
    const reste = src.slice(i);

    // Gras : **…** (non vide, fermé sur la même ligne)
    if (reste.startsWith("**")) {
      const fin = reste.indexOf("**", 2);
      if (fin > 2) {
        flush();
        out.push({ type: "gras", enfants: parseInline(reste.slice(2, fin)) });
        i += fin + 2;
        continue;
      }
    }
    // Italique : *…* (non vide, pas suivi d'une étoile)
    if (reste[0] === "*" && reste[1] !== "*") {
      const fin = reste.indexOf("*", 1);
      if (fin > 1) {
        flush();
        out.push({ type: "italique", enfants: parseInline(reste.slice(1, fin)) });
        i += fin + 1;
        continue;
      }
    }
    // Lien : [texte](https://…) — une image en ligne est traitée comme un lien vers sa source.
    const m = LIEN.exec(reste);
    if (m) {
      const url = urlSure(m[3]);
      if (url) {
        flush();
        out.push({ type: "lien", url, enfants: parseInline(m[2] || url) });
        i += m[0].length;
        continue;
      }
      // URL refusée : on laisse la syntaxe telle quelle, visible, plutôt qu'un lien muet.
    }
    // Saut de ligne simple
    if (reste[0] === "\n") {
      flush();
      out.push({ type: "saut" });
      i += 1;
      continue;
    }
    texte += reste[0];
    i += 1;
  }
  flush();
  return out;
}

export function parseMarkdownRestreint(src: string): Bloc[] {
  const blocs: Bloc[] = [];
  // Normalisation : fins de ligne Windows, plafond de longueur (la validation serveur
  // refuse au-delà ; ici on tronque par sécurité si un vieux contenu dépassait).
  const texte = src.replace(/\r\n?/g, "\n").slice(0, CONTENU_INFO_MAX);
  const paragraphes = texte.split(/\n[ \t]*\n+/);

  for (const brut of paragraphes) {
    const lignes = brut.split("\n").map((l) => l.trimEnd());
    if (lignes.every((l) => l.trim() === "")) continue;

    // Image seule sur sa ligne = bloc image (affichée en pleine largeur).
    const img = /^!\[([^\]]*)\]\(([^\s()]+)\)$/.exec(brut.trim());
    if (img) {
      const url = urlSure(img[2]);
      if (url) {
        blocs.push({ type: "image", url, alt: img[1].trim() });
        continue;
      }
    }

    // Liste : toutes les lignes commencent par `- ` ou `* `.
    if (lignes.every((l) => /^\s*[-*]\s+/.test(l))) {
      blocs.push({ type: "liste", items: lignes.map((l) => parseInline(l.replace(/^\s*[-*]\s+/, ""))) });
      continue;
    }

    blocs.push({ type: "paragraphe", enfants: parseInline(lignes.join("\n").trim()) });
  }
  return blocs;
}

/** Texte brut d'un contenu (pour un aperçu ou un test), sans mise en forme ni URL. */
export function texteBrut(blocs: Bloc[]): string {
  const inline = (n: Inline[]): string =>
    n
      .map((x) => (x.type === "texte" ? x.texte : x.type === "saut" ? "\n" : inline(x.enfants)))
      .join("");
  return blocs
    .map((b) => (b.type === "paragraphe" ? inline(b.enfants) : b.type === "liste" ? b.items.map(inline).join("\n") : b.alt))
    .join("\n\n");
}
