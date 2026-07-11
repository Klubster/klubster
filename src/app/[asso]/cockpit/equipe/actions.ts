"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function gardePresident(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const p = await getProfile();
  // Seul le président (ou le super_admin) gère l'équipe.
  if (!p || (p.role !== "admin_asso" && p.role !== "super_admin") || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/${slug}/cockpit?equipe=refuse`);
  }
  return org;
}

export async function definirRole(slug: string, formData: FormData) {
  await gardePresident(slug);
  const target = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("equipe_definir_role", { p_target: target, p_role: role });
  if (error) console.error("definirRole", error.message);
  revalidatePath(`/${slug}/cockpit/equipe`);
  redirect(`/${slug}/cockpit/equipe${error ? "?erreur=1" : "?ok=role"}`);
}

export async function ajouterMembre(slug: string, formData: FormData) {
  await gardePresident(slug);
  const email = String(formData.get("email") ?? "").trim();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("equipe_ajouter", { p_email: email });
  revalidatePath(`/${slug}/cockpit/equipe`);
  const res = error ? "erreur" : (data as string);
  redirect(`/${slug}/cockpit/equipe?ajout=${res}`);
}

export async function retirerMembre(slug: string, formData: FormData) {
  await gardePresident(slug);
  const target = String(formData.get("user_id") ?? "");
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("equipe_retirer", { p_target: target });
  if (error) console.error("retirerMembre", error.message);
  revalidatePath(`/${slug}/cockpit/equipe`);
  redirect(`/${slug}/cockpit/equipe${error ? "?erreur=1" : "?ok=retire"}`);
}
