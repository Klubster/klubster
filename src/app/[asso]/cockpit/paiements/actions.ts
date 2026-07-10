"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function garde(slug: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/paiements`);
  }
  return org;
}

// Marque le solde complet comme encaissé.
export async function marquerEncaisse(slug: string, adhesionId: string) {
  await garde(slug);
  const supabase = createSupabaseServerClient();
  await supabase.rpc("marquer_encaisse", { p_adhesion_id: adhesionId });
  redirect(`/${slug}/cockpit/paiements`);
}

// Enregistre un règlement partiel ou total (chèque/espèces). Renvoie le solde restant.
export async function enregistrerReglement(
  slug: string,
  adhesionId: string,
  montantCentimes: number,
  mode: "cheque" | "especes"
): Promise<{ ok: boolean; soldeCentimes?: number; error?: string }> {
  await garde(slug);
  if (!Number.isFinite(montantCentimes) || montantCentimes <= 0) {
    return { ok: false, error: "Montant invalide." };
  }
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("enregistrer_reglement", {
    p_adhesion_id: adhesionId,
    p_montant_centimes: Math.round(montantCentimes),
    p_mode: mode,
    p_note: null,
  });
  if (error) {
    console.error("enregistrer_reglement", error.message);
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, soldeCentimes: Number(data ?? 0) };
}

// Marque les chèques sélectionnés comme remis en banque (bordereau imprimé).
// La sélection est revalidée côté base : la RPC ne touche que les chèques de l'organisation.
export async function marquerChequesRemis(
  slug: string,
  ids: string[]
): Promise<{ ok: boolean; nombre?: number; error?: string }> {
  await garde(slug);
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Aucun chèque sélectionné." };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("marquer_cheques_remis", { p_ids: ids });
  if (error) {
    console.error("marquer_cheques_remis", error.message);
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, nombre: Number(data ?? 0) };
}
