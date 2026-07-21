import { describe, it, expect } from "vitest";
import { validerImage, validerDocument } from "@/lib/upload";

/**
 * Validation des fichiers déposés. C'est le point où un adhérent, depuis l'extérieur,
 * pousse un octet arbitraire dans le stockage du club : la vérification porte sur le
 * contenu réel, jamais sur l'extension ni sur le type annoncé par le navigateur — l'un
 * comme l'autre se falsifient en une ligne.
 */

function fichier(nom: string, octets: number[], type = "application/octet-stream"): File {
  return new File([new Uint8Array(octets)], nom, { type });
}

// En-têtes réels des formats acceptés.
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0];
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0, 0, 0, 0, 0, 0, 0, 0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0, 0, 0, 0];

describe("validerImage", () => {
  it("accepte un PNG, un JPEG et un WebP", async () => {
    expect((await validerImage(fichier("a.png", PNG))).ok).toBe(true);
    expect((await validerImage(fichier("a.jpg", JPEG))).ok).toBe(true);
    expect((await validerImage(fichier("a.webp", WEBP))).ok).toBe(true);
  });

  it("déduit l'extension du contenu, pas du nom du fichier", async () => {
    // Un PNG nommé « photo.jpg » reste un PNG : c'est le contenu qui décide.
    const r = await validerImage(fichier("photo.jpg", PNG, "image/jpeg"));
    expect(r.ok && r.ext).toBe("png");
  });

  it("refuse un SVG, même déclaré comme image", async () => {
    // Un SVG peut porter du script : il n'a rien à faire dans un dossier public.
    const svg = [...Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>")];
    expect((await validerImage(fichier("logo.svg", svg, "image/svg+xml"))).ok).toBe(false);
  });

  it("refuse un exécutable renommé en .png", async () => {
    const macho = [0xcf, 0xfa, 0xed, 0xfe, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect((await validerImage(fichier("logo.png", macho, "image/png"))).ok).toBe(false);
  });

  it("refuse un fichier vide", async () => {
    expect((await validerImage(fichier("vide.png", []))).ok).toBe(false);
  });

  it("refuse au-delà du plafond demandé", async () => {
    const gros = new File([new Uint8Array(3 * 1024 * 1024)], "gros.png", { type: "image/png" });
    expect((await validerImage(gros, 2)).ok).toBe(false);
  });
});

describe("validerDocument", () => {
  it("accepte un PDF, un JPEG et un PNG", async () => {
    expect((await validerDocument(fichier("c.pdf", PDF))).ok).toBe(true);
    expect((await validerDocument(fichier("c.jpg", JPEG))).ok).toBe(true);
    expect((await validerDocument(fichier("c.png", PNG))).ok).toBe(true);
  });

  it("refuse un WebP — les pièces de dossier restent lisibles partout", async () => {
    expect((await validerDocument(fichier("c.webp", WEBP))).ok).toBe(false);
  });

  it("refuse un exécutable nommé « certificat.pdf »", async () => {
    // Le cas concret : une pièce de dossier déposée depuis l'espace adhérent.
    const elf = [0x7f, 0x45, 0x4c, 0x46, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    expect((await validerDocument(fichier("certificat.pdf", elf, "application/pdf"))).ok).toBe(false);
  });

  it("refuse un document de plus de 5 Mo", async () => {
    const gros = new File([new Uint8Array(6 * 1024 * 1024)], "scan.pdf", { type: "application/pdf" });
    expect((await validerDocument(gros, 5)).ok).toBe(false);
  });

  it("annonce le bon type MIME, indépendamment de celui déclaré", async () => {
    const r = await validerDocument(fichier("x.pdf", PDF, "text/plain"));
    expect(r.ok && r.contentType).toBe("application/pdf");
  });
});
