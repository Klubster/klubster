import { describe, it, expect } from "vitest";
import { calculerPriorites, filtrerParRole, resumeAttention, type EntreesPriorites } from "@/lib/priorites";
import { peut } from "@/lib/roles";

const vide: EntreesPriorites = {
  slug: "club-a",
  enAttente: 0,
  enRetard: 0,
  dossiersIncomplets: 0,
  nouvelles7j: 0,
  litiges: 0,
  coursComplets: [],
  coursPresqueComplets: [],
  adherents: 0,
  coursOuverts: 0,
};

describe("priorités du cockpit", () => {
  it("un club calme n'affiche aucune ligne à traiter", () => {
    const p = calculerPriorites({ ...vide, adherents: 12, coursOuverts: 2 });
    expect(p.filter((x) => x.niveau === "traiter")).toHaveLength(0);
    expect(resumeAttention(p).titre).toBe("Le club est à jour.");
  });

  it("ne produit jamais de ligne à zéro", () => {
    const p = calculerPriorites(vide);
    expect(p.every((x) => x.nombre === null || x.nombre > 0 || x.cle === "effectif")).toBe(true);
    expect(p.map((x) => x.cle)).not.toContain("retards");
    expect(p.map((x) => x.cle)).not.toContain("dossiers-incomplets");
  });

  it("compte l'attention sur le seul niveau « à traiter »", () => {
    // 12 adhérents et 3 cours ne sont pas des choses « à traiter ».
    const p = calculerPriorites({ ...vide, adherents: 12, coursOuverts: 3, enRetard: 2 });
    const r = resumeAttention(p);
    expect(r.urgent).toBe(1);
    expect(r.titre).toBe("1 chose à traiter.");
  });

  it("place le litige bancaire avant tout le reste", () => {
    const p = calculerPriorites({ ...vide, litiges: 1, enRetard: 5, dossiersIncomplets: 9 });
    expect(p[0].cle).toBe("litiges");
  });

  it("ordonne les niveaux : traiter, puis surveiller, puis info", () => {
    const p = calculerPriorites({
      ...vide,
      enRetard: 1,
      enAttente: 2,
      adherents: 30,
      coursComplets: ["Boxe adultes"],
    });
    const niveaux = p.map((x) => x.niveau);
    expect(niveaux.indexOf("traiter")).toBeLessThan(niveaux.indexOf("surveiller"));
    expect(niveaux.indexOf("surveiller")).toBeLessThan(niveaux.indexOf("info"));
  });

  it("chaque ligne à traiter mène à un écran filtré", () => {
    const p = calculerPriorites({ ...vide, enRetard: 2, dossiersIncomplets: 3, nouvelles7j: 4 });
    const aTraiter = p.filter((x) => x.niveau === "traiter");
    expect(aTraiter).toHaveLength(3);
    for (const x of aTraiter) {
      expect(x.href).toContain("?");
      expect(x.action).not.toBe("");
    }
    expect(p.find((x) => x.cle === "retards")!.href).toContain("statut=en_retard");
    expect(p.find((x) => x.cle === "dossiers-incomplets")!.href).toContain("dossier=incomplet");
  });

  it("le secrétaire voit les dossiers, pas la trésorerie", () => {
    const p = calculerPriorites({ ...vide, enRetard: 2, dossiersIncomplets: 3, litiges: 1 });
    const vues = filtrerParRole(p, (a) => peut("secretaire", a)).map((x) => x.cle);
    expect(vues).toContain("dossiers-incomplets");
    expect(vues).not.toContain("retards");
    expect(vues).not.toContain("litiges");
  });

  it("le trésorier voit la trésorerie, pas les dossiers", () => {
    const p = calculerPriorites({ ...vide, enRetard: 2, dossiersIncomplets: 3 });
    const vues = filtrerParRole(p, (a) => peut("tresorier", a)).map((x) => x.cle);
    expect(vues).toContain("retards");
    expect(vues).not.toContain("dossiers-incomplets");
  });

  it("l'encadrant et la lecture seule n'ont aucune ligne à traiter, mais gardent l'effectif", () => {
    const p = calculerPriorites({ ...vide, enRetard: 2, dossiersIncomplets: 3, adherents: 30 });
    for (const role of ["encadrant", "lecture"]) {
      const vues = filtrerParRole(p, (a) => peut(role, a));
      expect(vues.filter((x) => x.niveau === "traiter")).toHaveLength(0);
      expect(vues.map((x) => x.cle)).toContain("effectif");
    }
  });

  it("le président voit tout", () => {
    const p = calculerPriorites({ ...vide, enRetard: 2, dossiersIncomplets: 3, litiges: 1, adherents: 30 });
    expect(filtrerParRole(p, (a) => peut("admin_asso", a))).toHaveLength(p.length);
  });

  it("accorde le singulier et le pluriel", () => {
    const un = calculerPriorites({ ...vide, enRetard: 1 }).find((x) => x.cle === "retards")!;
    const deux = calculerPriorites({ ...vide, enRetard: 2 }).find((x) => x.cle === "retards")!;
    expect(un.texte).toBe("cotisation en retard");
    expect(deux.texte).toBe("cotisations en retard");
  });

  it("laisse « cours » invariable", () => {
    const p = calculerPriorites({ ...vide, coursOuverts: 2 });
    const c = p.find((x) => x.cle === "cours-ouverts")!;
    expect(c.texte).toBe("cours ouverts");
    expect(c.texte).not.toContain("courss");
  });

  it("nomme les cours complets plutôt que de les compter seulement", () => {
    const p = calculerPriorites({ ...vide, coursComplets: ["Boxe ados", "Boxe loisir"] });
    const c = p.find((x) => x.cle === "cours-complets")!;
    expect(c.texte).toContain("Boxe ados");
    expect(c.texte).toContain("Boxe loisir");
    expect(c.niveau).toBe("surveiller");
  });
});
