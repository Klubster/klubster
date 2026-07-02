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

/* ——— « Aujourd'hui_ » : le club en un coup d'œil (données réelles uniquement) ——— */

export interface EvenementClub {
  ts: string; // ISO
  type: "inscription" | "presence" | "piece";
  texte: string;
}

export interface Aujourdhui {
  nouvelles7j: number;
  piecesAttendues: number;
  evenements: EvenementClub[];
}

// prenom/nom depuis une jointure Supabase (objet ou tableau selon la relation).
function nomDe(rel: unknown): string {
  const a = Array.isArray(rel) ? rel[0] : rel;
  if (a && typeof a === "object" && "prenom" in a) {
    const p = a as { prenom: string | null; nom: string | null };
    return [p.prenom, p.nom].filter(Boolean).join(" ") || "Un adhérent";
  }
  return "Un adhérent";
}

export async function getAujourdhui(organisationId: string): Promise<Aujourdhui> {
  const supabase = createSupabaseServerClient();
  const depuis7j = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [adh, pres, pieces, nouvelles, attendues] = await Promise.all([
    supabase
      .from("adhesions")
      .select("created_at, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("presences")
      .select("created_at, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("pieces_adherent")
      .select("updated_at, label, statut, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .neq("statut", "attendue")
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("adhesions")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("created_at", depuis7j),
    supabase
      .from("pieces_adherent")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("statut", "attendue"),
  ]);

  const evenements: EvenementClub[] = [
    ...(adh.data ?? []).map((r) => ({
      ts: r.created_at as string,
      type: "inscription" as const,
      texte: `Inscription — ${nomDe(r.adherents)}`,
    })),
    ...(pres.data ?? []).map((r) => ({
      ts: r.created_at as string,
      type: "presence" as const,
      texte: `Présence pointée — ${nomDe(r.adherents)}`,
    })),
    ...(pieces.data ?? []).map((r) => ({
      ts: (r.updated_at ?? "") as string,
      type: "piece" as const,
      texte: `${r.statut === "par_email" ? "Pièce annoncée par email" : "Pièce déposée"} — ${r.label ?? "document"} (${nomDe(r.adherents)})`,
    })),
  ]
    .filter((e) => e.ts)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 9);

  return {
    nouvelles7j: nouvelles.count ?? 0,
    piecesAttendues: attendues.count ?? 0,
    evenements,
  };
}
