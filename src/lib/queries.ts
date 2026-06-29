import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organisation, Cours } from "@/types/db";

// Charge une association publiée par son slug (ex. "usmboxe").
// La lecture publique est autorisée par la politique RLS "publie = true".
export async function getOrganisationBySlug(slug: string): Promise<Organisation | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("slug", slug)
    .eq("publie", true)
    .maybeSingle();
  if (error) {
    console.error("getOrganisationBySlug", error.message);
    return null;
  }
  return data as Organisation | null;
}

export async function getCoursByOrganisation(organisationId: string): Promise<Cours[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cours")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("ordre", { ascending: true });
  if (error) {
    console.error("getCoursByOrganisation", error.message);
    return [];
  }
  return (data ?? []) as Cours[];
}

export interface CockpitStats {
  equipage: number;
  enAttente: number;
  enRetard: number;
  paye: number;
  tresorerieCentimes: number;
}

// Agrégats du Cockpit via une fonction SECURITY DEFINER (aucune donnée personnelle exposée).
export async function getCockpitStats(slug: string): Promise<CockpitStats> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cockpit_stats", { p_slug: slug });
  const row = (data as Array<Record<string, number>> | null)?.[0];
  if (error || !row) {
    if (error) console.error("getCockpitStats", error.message);
    return { equipage: 0, enAttente: 0, enRetard: 0, paye: 0, tresorerieCentimes: 0 };
  }
  return {
    equipage: row.equipage,
    enAttente: row.en_attente,
    enRetard: row.en_retard,
    paye: row.paye,
    tresorerieCentimes: Number(row.tresorerie_centimes),
  };
}
