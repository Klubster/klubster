import { describe, it, expect } from "vitest";
import { dimensionsImage, validerImageBloc, IMAGE_BLOC } from "@/lib/upload";

/**
 * Images des blocs descriptifs : les dimensions sont lues dans les octets, côté serveur.
 * Chaque en-tête est fabriqué à la main d'après la spécification du format, pour que le
 * test décrive exactement ce que le lecteur doit comprendre.
 */
const be32 = (n: number) => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255];
const be16 = (n: number) => [(n >> 8) & 255, n & 255];
const le24 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255];

function png(l: number, h: number): number[] {
  return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...be32(13), 0x49, 0x48, 0x44, 0x52, ...be32(l), ...be32(h), 8, 2, 0, 0, 0];
}
// SOI, un segment APP0 (JFIF) de 16 octets, puis SOF0 : longueur, précision, hauteur, largeur.
function jpeg(l: number, h: number): number[] {
  const app0 = [0xff, 0xe0, ...be16(16), 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0];
  const sof0 = [0xff, 0xc0, ...be16(17), 8, ...be16(h), ...be16(l), 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1];
  return [0xff, 0xd8, ...app0, ...sof0, 0xff, 0xda, 0, 0];
}
function webpX(l: number, h: number): number[] {
  return [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58, 10, 0, 0, 0, 0, 0, 0, 0, ...le24(l - 1), ...le24(h - 1), 0, 0];
}
function webpL(l: number, h: number): number[] {
  const bits = (l - 1) | ((h - 1) << 14);
  return [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c, 0, 0, 0, 0, 0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >>> 24) & 255, 0, 0, 0, 0, 0];
}
function webp(l: number, h: number): number[] {
  return [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0, 0, 0, 0, 0, 0, 0, 0x9d, 0x01, 0x2a, l & 255, l >> 8, h & 255, h >> 8];
}
const fichier = (octets: number[], nom = "img", remplissage = 0) => new File([new Uint8Array([...octets, ...new Array(remplissage).fill(0)])], nom);

describe("dimensionsImage — lecture des en-têtes", () => {
  it("PNG (IHDR)", () => expect(dimensionsImage(new Uint8Array(png(1280, 720)))).toEqual({ largeur: 1280, hauteur: 720 }));
  it("JPEG (premier SOF, après les segments APPn)", () => expect(dimensionsImage(new Uint8Array(jpeg(1920, 1080)))).toEqual({ largeur: 1920, hauteur: 1080 }));
  it("WebP étendu (VP8X), sans perte (VP8L), avec perte (VP8)", () => {
    expect(dimensionsImage(new Uint8Array(webpX(800, 600)))).toEqual({ largeur: 800, hauteur: 600 });
    expect(dimensionsImage(new Uint8Array(webpL(640, 480)))).toEqual({ largeur: 640, hauteur: 480 });
    expect(dimensionsImage(new Uint8Array(webp(320, 240)))).toEqual({ largeur: 320, hauteur: 240 });
  });
  it("fichier tronqué ou inconnu : null, jamais une valeur inventée", () => {
    expect(dimensionsImage(new Uint8Array(png(10, 10).slice(0, 20)))).toBeNull();
    expect(dimensionsImage(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))).toBeNull();
    expect(dimensionsImage(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});

describe("validerImageBloc — les règles annoncées au club", () => {
  it("accepte une image ordinaire et renvoie ses dimensions", async () => {
    const r = await validerImageBloc(fichier(jpeg(1200, 800), "planning.jpg"));
    expect(r).toMatchObject({ ok: true, ext: "jpg", largeur: 1200, hauteur: 800 });
  });
  it("refuse au-delà de 2000 px de côté, en le disant", async () => {
    const r = await validerImageBloc(fichier(png(2400, 100 + IMAGE_BLOC.minLargeur)));
    expect(r).toMatchObject({ ok: false });
    expect((r as { erreur: string }).erreur).toMatch(/2400 × 300 px.*2000 px maximum/);
  });
  it("refuse une image trop étroite pour être lisible", async () => {
    const r = await validerImageBloc(fichier(png(120, 120)));
    expect((r as { erreur: string }).erreur).toMatch(/trop petite.*200 px minimum/);
  });
  it("refuse au-delà de 1,5 Mo", async () => {
    const r = await validerImageBloc(fichier(png(500, 500), "lourd.png", 1.5 * 1024 * 1024 + 1));
    expect((r as { erreur: string }).erreur).toMatch(/1,5 Mo maximum/);
  });
  it("refuse un SVG ou un PDF même renommés", async () => {
    const r = await validerImageBloc(fichier([0x3c, 0x73, 0x76, 0x67, ...new Array(30).fill(0)], "image.png"));
    expect(r.ok).toBe(false);
  });
  it("refuse une image dont les dimensions ne se lisent pas", async () => {
    const r = await validerImageBloc(fichier([0xff, 0xd8, 0xff, 0xd9, ...new Array(30).fill(0)]));
    expect((r as { erreur: string }).erreur).toMatch(/illisible/);
  });
});
