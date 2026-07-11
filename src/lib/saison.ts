import type { Organisation } from "@/types/db";

/**
 * Libellé de la saison courante. Déduit des dates configurées par le club si elles
 * existent (« 2025-2026 » à cheval sur deux ans, « 2025 » pour une année civile),
 * sinon d'une rentrée de septembre par défaut. Ne jamais coder la saison en dur : à la
 * rentrée suivante, les adhésions seraient étiquetées sur l'ancienne saison.
 */
export function saisonCourante(org?: Pick<Organisation, "saison_debut" | "saison_fin"> | null): string {
  const d = org?.saison_debut ? new Date(org.saison_debut) : null;
  const f = org?.saison_fin ? new Date(org.saison_fin) : null;
  if (d && f && !Number.isNaN(d.getTime()) && !Number.isNaN(f.getTime())) {
    const yd = d.getFullYear();
    const yf = f.getFullYear();
    return yd === yf ? String(yd) : `${yd}-${yf}`;
  }
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
