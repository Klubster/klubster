"use server";
// « Votre domaine » : le club branche son propre nom de domaine sur sa vitrine.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigerPresident } from "@/lib/garde";
import { attacherDomaine, detacherDomaine, vercelConfigured } from "@/lib/vercel";

const DOMAINE_VALIDE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/;

// Brancher ou couper le domaine du club touche à la fois la fiche organisation et la
// configuration Vercel. Réservé au président : la garde ne vérifiait auparavant que
// l'appartenance au club, si bien qu'un simple membre pouvait rediriger le domaine.
export async function connecterDomaine(slug: string, formData: FormData) {
  const { org } = await exigerPresident(slug);
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

  const supabase = await createSupabaseServerClient();
  // Disponibilité vérifiée en base AVANT de toucher à Vercel : dans l'ordre inverse, un
  // domaine déjà pris par un autre club laissait des domaines orphelins (domaine et son
  // www.) rattachés au projet Vercel.
  const { data: dejaPris } = await supabase
    .from("organisations")
    .select("id")
    .eq("domaine_custom", brut)
    .neq("id", org.id)
    .limit(1);
  if ((dejaPris ?? []).length > 0) redirect(`/${slug}/cockpit/domaine?erreur=deja_pris`);

  const res = await attacherDomaine(brut);
  if (!res.ok) {
    console.error("attacherDomaine", res.erreur);
    redirect(`/${slug}/cockpit/domaine?erreur=vercel`);
  }
  // On rattache aussi www.<domaine> pour couvrir les deux écritures.
  await attacherDomaine(`www.${brut}`);

  const { error } = await supabase.from("organisations").update({ domaine_custom: brut }).eq("id", org.id);
  if (error) {
    // Course perdue entre la vérification et l'écriture : on détache ce qu'on vient
    // d'attacher chez Vercel pour ne pas laisser de domaine orphelin.
    await detacherDomaine(`www.${brut}`);
    await detacherDomaine(brut);
    redirect(`/${slug}/cockpit/domaine?erreur=deja_pris`);
  }

  revalidatePath(`/${slug}/cockpit/domaine`);
  redirect(`/${slug}/cockpit/domaine?ok=1`);
}

export async function deconnecterDomaine(slug: string) {
  const { org } = await exigerPresident(slug);
  if (org.domaine_custom) {
    await detacherDomaine(org.domaine_custom);
    await detacherDomaine(`www.${org.domaine_custom}`);
  }
  const supabase = await createSupabaseServerClient();
  await supabase.from("organisations").update({ domaine_custom: null }).eq("id", org.id);
  revalidatePath(`/${slug}/cockpit/domaine`);
  redirect(`/${slug}/cockpit/domaine?retire=1`);
}
