import type { Cours, Creneau } from "@/types/db";

const JOURS_ORDRE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/**
 * Somme d'argent, toujours affichée comme un montant.
 * `formatPrix` dit « Gratuit » pour zéro, ce qui convient au tarif d'un cours mais
 * jamais à une trésorerie : « Réglé : Gratuit » n'a aucun sens pour un trésorier.
 */
export function formatMontant(centimes: number): string {
  const euros = (centimes ?? 0) / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
  }).format(euros);
}

export function formatPrix(centimes: number): string {
  if (!centimes) return "Gratuit";
  const euros = centimes / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
  }).format(euros);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Construit une grille planning : pour chaque jour, la liste des créneaux (cours + horaire).
export interface CreneauAffiche extends Creneau {
  coursNom: string;
}
export function planningParJour(cours: Cours[]): { jour: string; creneaux: CreneauAffiche[] }[] {
  const map = new Map<string, CreneauAffiche[]>();
  for (const c of cours) {
    for (const cr of c.creneaux ?? []) {
      const arr = map.get(cr.jour) ?? [];
      arr.push({ ...cr, coursNom: c.nom });
      map.set(cr.jour, arr);
    }
  }
  return JOURS_ORDRE.filter((j) => map.has(j)).map((jour) => ({
    jour,
    creneaux: (map.get(jour) ?? []).sort((a, b) => a.debut.localeCompare(b.debut)),
  }));
}

// Lien Google Maps (carte "où nous trouver") à partir d'une adresse.
export function lienCarte(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}
export function embedCarte(adresse: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(adresse)}&output=embed`;
}
