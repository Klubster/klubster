// Validation d'image côté serveur par les octets d'en-tête (nombres magiques),
// pas par l'extension ni le type MIME annoncé par le navigateur — tous deux falsifiables.
// Refuse notamment les SVG (script actif) et tout ce qui n'est pas une vraie image bitmap.

export type ImageValide = { ok: true; ext: "jpg" | "png" | "webp"; contentType: string };
export type ImageInvalide = { ok: false; erreur: string };

export async function validerImage(file: File, maxMo = 8): Promise<ImageValide | ImageInvalide> {
  if (!file || file.size === 0) return { ok: false, erreur: "Fichier vide." };
  if (file.size > maxMo * 1024 * 1024) return { ok: false, erreur: `Fichier trop lourd (${maxMo} Mo maximum).` };

  const tete = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const est = (sig: number[], decalage = 0) => sig.every((b, i) => tete[decalage + i] === b);

  if (est([0xff, 0xd8, 0xff])) return { ok: true, ext: "jpg", contentType: "image/jpeg" };
  if (est([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ok: true, ext: "png", contentType: "image/png" };
  // WebP : « RIFF » .... « WEBP »
  if (est([0x52, 0x49, 0x46, 0x46]) && est([0x57, 0x45, 0x42, 0x50], 8)) {
    return { ok: true, ext: "webp", contentType: "image/webp" };
  }
  return { ok: false, erreur: "Format non pris en charge. Utilisez une image JPEG, PNG ou WebP." };
}
