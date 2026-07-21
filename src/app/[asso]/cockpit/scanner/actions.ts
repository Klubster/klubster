"use server";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface VerifResult {
  ok: boolean;
  prenom?: string; nom?: string; cours?: string | null;
  regle?: boolean; piecesManquantes?: number; present?: boolean;
  error?: string;
}

// Contrôle au bord du tapis : permission « controle ». C'est le seul droit d'un
// encadrant, et un accès en lecture seule ne doit pas pouvoir marquer les présences.
async function guard(slug: string) {
  const ctx = await verifierPermission(slug, "controle");
  return ctx?.org ?? null;
}

export async function verifierAdherent(slug: string, adherentId: string): Promise<VerifResult> {
  if (!(await guard(slug))) return { ok: false, error: "Non autorisé." };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verifier_adherent", { p_adherent_id: adherentId });
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (error || !row) return { ok: false, error: "Adhérent introuvable." };
  return {
    ok: true,
    prenom: row.prenom as string, nom: row.nom as string, cours: (row.cours as string) ?? null,
    regle: row.regle as boolean, piecesManquantes: row.pieces_manquantes as number, present: row.present_aujourdhui as boolean,
  };
}

export async function marquerPresent(slug: string, adherentId: string): Promise<{ ok: boolean }> {
  if (!(await guard(slug))) return { ok: false };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("marquer_present", { p_adherent_id: adherentId });
  return { ok: !error };
}

export async function rechercher(slug: string, q: string): Promise<{ id: string; prenom: string; nom: string }[]> {
  const org = await guard(slug);
  if (!org) return [];
  const clean = q.replace(/[^a-zà-ÿ0-9 -]/gi, "").trim();
  if (clean.length < 2) return [];
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adherents").select("id, prenom, nom").eq("organisation_id", org.id)
    .or(`nom.ilike.%${clean}%,prenom.ilike.%${clean}%`).order("nom").limit(12);
  return (data as { id: string; prenom: string; nom: string }[]) ?? [];
}
