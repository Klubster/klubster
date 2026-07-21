"use server";
// « Votre domaine » : le club branche son propre nom de domaine sur sa vitrine.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { attacherDomaine, detacherDomaine, vercelConfigured } from "@/lib/vercel";

const DOMAINE_VALIDE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

async function garde(slug: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/domaine`);
  }
  return org;
}

export async function connecterDomaine(slug: string, formData: FormData) {
  const org = await garde(slug);
  const brut = String(formData.get("domaine") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

  if (!DOMAINE_VALIDE.test(brut) || brut.endsWith("klubster.fr") || brut.endsWith("vercel.app")) {
    redirect(`/${slug}/cockpit/domaine?erreur=format`);
  }
  if (!vercelConfigured()) redirect(`/${slug}/cockpit/domaine?erreur=config`);

  const res = await attacherDomaine(brut);
  if (!res.ok) {
    console.error("attacherDomaine", res.erreur);
    redirect(`/${slug}/cockpit/domaine?erreur=vercel`);
  }
  // On rattache aussi www.<domaine> pour couvrir les deux écritures.
  await attacherDomaine(`www.${brut}`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ domaine_custom: brut }).eq("id", org.id);
  if (error) redirect(`/${slug}/cockpit/domaine?erreur=deja_pris`);

  revalidatePath(`/${slug}/cockpit/domaine`);
  redirect(`/${slug}/cockpit/domaine?ok=1`);
}

export async function deconnecterDomaine(slug: string) {
  const org = await garde(slug);
  if (org.domaine_custom) {
    await detacherDomaine(org.domaine_custom);
    await detacherDomaine(`www.${org.domaine_custom}`);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from("organisations").update({ domaine_custom: null }).eq("id", org.id);
  revalidatePath(`/${slug}/cockpit/domaine`);
  redirect(`/${slug}/cockpit/domaine?retire=1`);
}
