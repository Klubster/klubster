import { describe, it, expect } from "vitest";
import { formatMontant, formatPrix, planningParJour } from "@/lib/format";
import type { Cours } from "@/types/db";

/**
 * Affichage des montants et du planning. Ce qu'un trésorier lit sur son écran doit
 * correspondre au centime, et un créneau mal ordonné envoie des adhérents au mauvais
 * cours.
 */

// Les formats français insèrent une espace insécable avant le €. On compare donc sur
// une version normalisée plutôt que sur des octets invisibles.
const net = (s: string) => s.replace(/ | /g, " ");

describe("formatMontant — une trésorerie", () => {
  it("affiche zéro comme un montant, jamais comme « Gratuit »", () => {
    // « Réglé : Gratuit » n'a aucun sens sur une fiche de paiement.
    expect(net(formatMontant(0))).toBe("0 €");
  });
  it("n'affiche pas de décimales inutiles", () => {
    expect(net(formatMontant(21000))).toBe("210 €");
  });
  it("garde les centimes quand il y en a", () => {
    expect(net(formatMontant(21050))).toBe("210,50 €");
  });
});

describe("formatPrix — un tarif de cours", () => {
  it("dit « Gratuit » pour zéro", () => {
    expect(formatPrix(0)).toBe("Gratuit");
  });
  it("affiche un tarif normal", () => {
    expect(net(formatPrix(16000))).toBe("160 €");
  });
});

describe("planningParJour", () => {
  const cours = [
    { id: "1", nom: "Amateurs", creneaux: [
      { jour: "vendredi", debut: "20:00", fin: "21:30" },
      { jour: "lundi", debut: "20:00", fin: "21:30" },
    ] },
    { id: "2", nom: "Baby Boxe", creneaux: [{ jour: "lundi", debut: "17:00", fin: "17:45" }] },
  ] as unknown as Cours[];

  it("classe les jours dans l'ordre de la semaine, pas dans celui de la saisie", () => {
    expect(planningParJour(cours).map((j) => j.jour)).toEqual(["lundi", "vendredi"]);
  });

  it("classe les créneaux d'un jour par heure de début", () => {
    const lundi = planningParJour(cours).find((j) => j.jour === "lundi");
    expect(lundi?.creneaux.map((c) => c.debut)).toEqual(["17:00", "20:00"]);
  });

  it("rattache chaque créneau au nom de son cours", () => {
    const lundi = planningParJour(cours).find((j) => j.jour === "lundi");
    expect(lundi?.creneaux[0].coursNom).toBe("Baby Boxe");
  });

  it("n'affiche aucun jour quand aucun créneau n'est saisi", () => {
    const sansCreneaux = [{ id: "1", nom: "Loisirs", creneaux: [] }] as unknown as Cours[];
    expect(planningParJour(sansCreneaux)).toEqual([]);
  });
});
