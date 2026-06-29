"use server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormConfig } from "@/types/form";

export async function saveFormConfig(slug: string, config: FormConfig): Promise<{ ok?: boolean; error?: string }> {
  const org = await getOrganisationBySlug(slug);
  const profile = await getProfile();
  if (!org || !profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    return { error: "Non autorisé." };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ form_config: config }).eq("id", org.id);
  if (error) return { error: error.message };
  return { ok: true };
}
