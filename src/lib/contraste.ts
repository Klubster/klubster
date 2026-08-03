/**
 * Garde-fou de contraste pour la couleur libre des clubs (`couleur_primaire`).
 *
 * Un club peut saisir n'importe quel hex dans le wizard : jaune, bleu ciel…
 * Sans garde-fou, les CTA « S'INSCRIRE » / « VALIDER » deviennent du blanc
 * sur fond clair (illisible), et l'accent utilisé comme couleur de texte
 * passe sous 3:1 sur papier. Audit 2026-07-23, constat signalé par 2 grilles
 * (design-taste 4.5 BUTTON CONTRAST CHECK — mandatory).
 *
 * Zéro dépendance, calcul WCAG 2.x standard (luminance relative + ratio).
 */

/**
 * Couleur de secours quand le club n'a pas de couleur exploitable : l'encre.
 * C'était déjà le fallback des vitrines et du cockpit — mais chaque page le
 * réécrivait à la main, et trois valeurs différentes circulaient (#111111,
 * #279B65, #189460). Une seule désormais, ici.
 */
export const COULEUR_SECOURS = "#111111";

/**
 * Normalise une couleur saisie ou stockée : espaces tolérés, « # » optionnel,
 * hex court (#1AB) accepté, casse unifiée. Toute valeur inexploitable — vide,
 * null, « bleu », #12 — retombe sur la couleur de secours : un ancien club dont
 * la colonne est vide garde un site lisible, une faute de frappe ne casse rien.
 */
export function normaliserCouleur(
  entree: string | null | undefined,
  secours: string = COULEUR_SECOURS
): string {
  if (!entree) return secours;
  const h = entree.trim().replace(/^#/, "");
  const long = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (!/^[0-9a-fA-F]{6}$/.test(long)) return secours;
  return `#${long.toUpperCase()}`;
}

/** Vraie couleur hex exploitable ? (mêmes règles que `normaliserCouleur`) */
export function estCouleurValide(entree: string | null | undefined): boolean {
  if (!entree) return false;
  const h = entree.trim().replace(/^#/, "");
  return /^[0-9a-fA-F]{3}$/.test(h) || /^[0-9a-fA-F]{6}$/.test(h);
}

/** Parse un hex 3 ou 6 chiffres → [r, g, b] 0-255. Null si invalide. */
function hexVersRgb(hex: string): [number, number, number] | null {
  const h = hex.trim().replace(/^#/, "");
  const long =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  if (!/^[0-9a-fA-F]{6}$/.test(long)) return null;
  const n = parseInt(long, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Luminance relative WCAG (0 = noir, 1 = blanc). */
function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Ratio de contraste WCAG entre deux couleurs hex (1 à 21). */
export function ratioContraste(hexA: string, hexB: string): number {
  const a = hexVersRgb(hexA);
  const b = hexVersRgb(hexB);
  if (!a || !b) return 21; // hex invalide : on ne bloque rien, le CSS ignorera
  const la = luminance(a);
  const lb = luminance(b);
  const [clair, sombre] = la > lb ? [la, lb] : [lb, la];
  return (clair + 0.05) / (sombre + 0.05);
}

/**
 * Couleur de texte lisible sur un fond donné : blanc si le blanc passe
 * 4,5:1, sinon encre. À utiliser pour tout bouton dont le fond est la
 * couleur du club.
 */
export function texteSur(fondHex: string): "#FFFFFF" | "#111111" {
  return ratioContraste(fondHex, "#FFFFFF") >= 4.5 ? "#FFFFFF" : "#111111";
}

/** Luminance relative WCAG d'une couleur hex (0 = noir, 1 = blanc). */
export function luminanceDe(hex: string): number {
  const rgb = hexVersRgb(normaliserCouleur(hex));
  return rgb ? luminance(rgb) : 0;
}

/** Mélange une couleur avec du noir (part entre 0 et 1). */
function assombrir(hex: string, part: number): string {
  const rgb = hexVersRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((v) => Math.round(v * (1 - part)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Mélange une couleur avec du blanc (part entre 0 et 1). */
function eclaircir(hex: string, part: number): string {
  const rgb = hexVersRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((v) => Math.round(v + (255 - v) * part));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/**
 * Bordure visible sur un fond donné : la couleur elle-même, poussée vers le
 * noir ou le blanc jusqu'à se détacher du fond (≥ 3:1, seuil WCAG des
 * composants d'interface). Sert aux cadres et aux champs posés sur la couleur
 * du club — un liseré ton sur ton n'aide personne.
 */
export function bordureSur(fondHex: string): string {
  const fond = normaliserCouleur(fondHex);
  const versLeNoir = luminanceDe(fond) > 0.18;
  let courant = fond;
  for (let i = 0; i < 16 && ratioContraste(courant, fond) < 3; i++) {
    courant = versLeNoir ? assombrir(courant, 0.16) : eclaircir(courant, 0.16);
  }
  return courant;
}

/**
 * État survol d'un fond coloré : assez différent du repos pour se voir
 * (Δ luminance), sans jamais sacrifier la lisibilité — le texte choisi par
 * `texteSur` pour le repos doit rester ≥ 4,5:1 sur le survol. Remplace les
 * `hover:opacity-90`, qui éclaircissaient un fond clair déjà limite.
 */
export function survolDe(fondHex: string): string {
  const fond = normaliserCouleur(fondHex);
  const texte = texteSur(fond);
  // Deux directions possibles ; on prend la première qui garde le texte du
  // repos lisible. Assombrir d'abord (le geste le plus naturel), éclaircir
  // sinon — un vert médian sous l'encre, ou un quasi-noir, n'ont que cette
  // direction-là.
  const plusSombre = assombrir(fond, 0.12);
  if (plusSombre !== fond && ratioContraste(plusSombre, texte) >= 4.5) return plusSombre;
  const plusClair = eclaircir(fond, 0.14);
  if (plusClair !== fond && ratioContraste(plusClair, texte) >= 4.5) return plusClair;
  return fond;
}

/**
 * Tout ce qu'une surface a besoin de savoir pour employer la couleur du club.
 * Une seule entrée (`couleur_primaire`, telle quelle en base, nullable), zéro
 * décision locale : accent normalisé, texte lisible dessus, survol, bordure.
 */
export function themeClub(couleurPrimaire: string | null | undefined): {
  accent: string;
  texteSurAccent: "#FFFFFF" | "#111111";
  survol: string;
  bordure: string;
} {
  const accent = normaliserCouleur(couleurPrimaire);
  return {
    accent,
    texteSurAccent: texteSur(accent),
    survol: survolDe(accent),
    bordure: bordureSur(accent),
  };
}

/**
 * Variante de l'accent utilisable comme COULEUR DE TEXTE sur un fond papier :
 * assombrit progressivement jusqu'à atteindre 4,5:1 (même logique que le
 * couple brand/brand-dark de la marque). Renvoie la couleur inchangée si
 * elle passe déjà.
 */
export function accentLisibleSur(accentHex: string, fondHex: string): string {
  let courant = accentHex;
  for (let i = 0; i < 12 && ratioContraste(courant, fondHex) < 4.5; i++) {
    courant = assombrir(courant, 0.12);
  }
  return courant;
}
