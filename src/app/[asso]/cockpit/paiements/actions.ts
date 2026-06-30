"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function marquerEncaisse(slug: string, adhesionId: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/paiements`);
  }
  const supabase = createSupabaseServerClient();
  await supabase.rpc("marquer_encaisse", { p_adhesion_id: adhesionId });
  redirect(`/${slug}/cockpit/paiements`);
}
