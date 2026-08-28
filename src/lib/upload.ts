// Validation d'image côté serveur par les octets d'en-tête (nombres magiques),
// pas par l'extension ni le type MIME annoncé par le navigateur — tous deux falsifiables.
// Refuse notamment les SVG (script actif) et tout ce qui n'est pas une vraie image bitmap.

export type ImageValide = { ok: true; ext: "jpg" | "png" | "webp"; contentType: string };
export type ImageInvalide = { ok: false; erreur: string };

export async function validerImage(file: File, maxMo = 8): Promise<ImageValide | ImageInvalide> {
  if (!file || file.size === 0) return { ok: false, erreur: "Fichier vide." };
  if (file.size > maxMo * 1024 * 1024) return { ok: false, erreur: `Fichier trop lourd (${String(maxMo).replace(".", ",")} Mo maximum).` };

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

export type DocValide = { ok: true; ext: "pdf" | "jpg" | "png"; contentType: string };
export type DocInvalide = { ok: false; erreur: string };

/**
 * Pièce de dossier déposée par un adhérent (certificat médical, photo, attestation).
 *
 * Même principe que `validerImage`, avec le PDF en plus — c'est le format dans lequel
 * arrivent la plupart des certificats. Le contrôle porte sur les octets d'en-tête :
 * un exécutable renommé « certificat.pdf » est refusé, et le SVG reste exclu (il peut
 * porter du script). Jusqu'au 21/07/2026, ce dépôt n'était pas validé du tout, alors
 * que les logos l'étaient déjà : l'endroit le plus sensible était le moins protégé.
 */
export async function validerDocument(file: File, maxMo = 5): Promise<DocValide | DocInvalide> {
  if (!file || file.size === 0) return { ok: false, erreur: "Fichier vide." };
  if (file.size > maxMo * 1024 * 1024) {
    return { ok: false, erreur: `Fichier trop lourd (${maxMo} Mo maximum).` };
  }

  const tete = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const est = (sig: number[], decalage = 0) => sig.every((b, i) => tete[decalage + i] === b);

  // %PDF
  if (est([0x25, 0x50, 0x44, 0x46])) return { ok: true, ext: "pdf", contentType: "application/pdf" };
  if (est([0xff, 0xd8, 0xff])) return { ok: true, ext: "jpg", contentType: "image/jpeg" };
  if (est([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { ok: true, ext: "png", contentType: "image/png" };

  return { ok: false, erreur: "Format non pris en charge. Déposez un PDF, un JPEG ou un PNG." };
}

/**
 * Dimensions d'une image JPEG, PNG ou WebP lues dans ses octets — sans bibliothèque.
 * Sert aux règles de taille des images de bloc descriptif : le navigateur pourrait
 * les vérifier, mais un appel direct à la Server Action ne passe pas par lui.
 * Retourne null si l'en-tête est illisible (fichier tronqué ou format inattendu).
 */
export function dimensionsImage(octets: Uint8Array): { largeur: number; hauteur: number } | null {
  const b = octets;
  const u16 = (i: number) => (b[i] << 8) | b[i + 1]; // grand-boutiste (JPEG, PNG)
  const u32 = (i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16); // petit-boutiste (WebP)

  // PNG : le bloc IHDR suit immédiatement la signature ; largeur et hauteur aux octets 16-23.
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { largeur: u32(16), hauteur: u32(20) };
  }

  // JPEG : on parcourt les segments jusqu'au premier « Start Of Frame » (SOFn),
  // qui porte hauteur puis largeur. Les marqueurs C4/C8/CC ne sont pas des SOF.
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marqueur = b[i + 1];
      if (marqueur === 0xff) { i += 1; continue; } // bourrage
      const estSof = marqueur >= 0xc0 && marqueur <= 0xcf && marqueur !== 0xc4 && marqueur !== 0xc8 && marqueur !== 0xcc;
      if (estSof) return { hauteur: u16(i + 5), largeur: u16(i + 7) };
      if (marqueur === 0xd9 || marqueur === 0xda) return null; // fin ou données avant tout SOF
      i += 2 + u16(i + 2);
    }
    return null;
  }

  // WebP : « RIFF....WEBP » puis un bloc VP8X (canevas étendu), VP8L (sans perte) ou VP8 (avec perte).
  if (b.length >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const bloc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (bloc === "VP8X") return { largeur: le24(24) + 1, hauteur: le24(27) + 1 };
    if (bloc === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { largeur: (bits & 0x3fff) + 1, hauteur: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (bloc === "VP8 ") return { largeur: (b[26] | (b[27] << 8)) & 0x3fff, hauteur: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  return null;
}

/** Règles d'une image de bloc descriptif (formulaire d'inscription, ~640 px de large). */
export const IMAGE_BLOC = { maxMo: 1.5, maxPx: 2000, minLargeur: 200 } as const;

/**
 * Image d'un bloc descriptif : format bitmap vérifié par les octets, poids ≤ 1,5 Mo,
 * dimensions ≤ 2000 px et ≥ 200 px de large. Une image sans dimensions lisibles
 * est refusée — mieux vaut un refus clair qu'un fichier douteux réaffiché à tous.
 */
export async function validerImageBloc(file: File): Promise<(ImageValide & { largeur: number; hauteur: number }) | ImageInvalide> {
  const base = await validerImage(file, IMAGE_BLOC.maxMo);
  if (!base.ok) return base;
  // 64 Ko suffisent à atteindre le SOF d'un JPEG même chargé de métadonnées (EXIF, ICC).
  const dims = dimensionsImage(new Uint8Array(await file.slice(0, 65536).arrayBuffer()));
  if (!dims || dims.largeur === 0 || dims.hauteur === 0) return { ok: false, erreur: "Image illisible : ré-enregistrez-la en JPEG ou PNG, puis réessayez." };
  if (dims.largeur > IMAGE_BLOC.maxPx || dims.hauteur > IMAGE_BLOC.maxPx) {
    return { ok: false, erreur: `Image trop grande (${dims.largeur} × ${dims.hauteur} px) : ${IMAGE_BLOC.maxPx} px maximum de côté.` };
  }
  if (dims.largeur < IMAGE_BLOC.minLargeur) {
    return { ok: false, erreur: `Image trop petite (${dims.largeur} px de large) : ${IMAGE_BLOC.minLargeur} px minimum.` };
  }
  return { ...base, ...dims };
}
