import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saisonCourante } from "@/lib/saison";
import type { Organisation } from "@/types/db";

/**
 * Cours dont la jauge est atteinte pour la saison courante (→ liste d'attente).
 *
 * Mécanisme unique, partagé par la page d'inscription et la vitrine : mêmes requêtes,
 * même règle de saison, mêmes statuts comptés. Si les deux pages calculaient chacune
 * leur « complet », elles finiraient par se contredire — un cours annoncé ouvert sur la
 * vitrine mais complet au moment de s'inscrire.
 *
 * Règle : `places_max` non renseigné ou 0 = jauge illimitée. Une place est occupée par
 * toute adhésion active de la saison (`en_attente`, `en_retard`, `paye`) — jamais par
 * une adhésion annulée, remboursée ou en liste d'attente.
 */
export async function coursComplets(
  org: Pick<Organisation, "id" | "saison_debut" | "saison_fin">
): Promise<Set<string>> {
  const supabase = await createSupabaseServerClient();
  const saisonAct = saisonCourante(org);
  const [{ data: placesRows }, { data: adhCount }] = await Promise.all([
    supabase.from("cours").select("id, places_max").eq("organisation_id", org.id),
    supabase.from("adhesions").select("cours_id, statut, saison").eq("organisation_id", org.id),
  ]);
  const placesMax = new Map((placesRows ?? []).map((r) => [r.id as string, r.places_max as number | null]));
  const actifs = new Map<string, number>();
  for (const a of (adhCount ?? []) as { cours_id: string | null; statut: string | null; saison: string | null }[]) {
    if (a.cours_id && a.saison === saisonAct && ["en_attente", "en_retard", "paye"].includes(a.statut ?? "")) {
      actifs.set(a.cours_id, (actifs.get(a.cours_id) ?? 0) + 1);
    }
  }
  const complets = new Set<string>();
  for (const [id, pm] of placesMax) {
    if (pm != null && pm > 0 && (actifs.get(id) ?? 0) >= pm) complets.add(id);
  }
  return complets;
}
