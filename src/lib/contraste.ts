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

/** Mélange une couleur avec du noir (part entre 0 et 1). */
function assombrir(hex: string, part: number): string {
  const rgb = hexVersRgb(hex);
  if (!rgb) return hex;
  const [r, g, b] = rgb.map((v) => Math.round(v * (1 - part)));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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
