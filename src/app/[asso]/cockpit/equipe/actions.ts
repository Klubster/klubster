"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/resend";
import { gabaritEmail } from "@/lib/email-gabarit";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

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
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("equipe_definir_role", { p_target: target, p_role: role });
  if (error) console.error("definirRole", error.message);
  revalidatePath(`/${slug}/cockpit/equipe`);
  redirect(`/${slug}/cockpit/equipe${error ? "?erreur=1" : "?ok=role"}`);
}

export async function ajouterMembre(slug: string, formData: FormData) {
  const org = await gardePresident(slug);
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("equipe_ajouter", { p_email: email });
  const res = error ? "erreur" : (data as string);

  // Prévenir le bénévole qu'il a désormais accès au cockpit du club, avec le lien et
  // l'invitation à installer l'app. Non bloquant : un échec d'email n'annule pas l'ajout.
  if (res === "ok" && email) {
    const para = [
      `Bonjour,`,
      `Vous venez d'être ajouté(e) à l'équipe de ${org.nom} sur Klubster. Vous avez maintenant accès au cockpit du club.`,
      `Connectez-vous avec cette adresse email pour retrouver les inscriptions, les présences et le suivi du club.`,
      `Pour l'ouvrir d'un tap depuis votre téléphone, installez l'app : ${BASE}/${slug}/installer`,
    ];
    try {
      await envoyerEmail({
        to: email,
        fromNom: `${org.nom} via Klubster`,
        replyTo: org.email_contact,
        objet: `Vous avez rejoint l'équipe de ${org.nom}`,
        texte: para.join("\n\n"),
        html: gabaritEmail({
          club: org.nom,
          couleur: org.couleur_primaire,
          titre: `Bienvenue dans l'équipe de ${org.nom}`,
          paragraphes: para,
          bouton: { libelle: "OUVRIR LE COCKPIT", url: `${BASE}/${slug}/cockpit` },
        }),
      });
    } catch (e) {
      console.error("email ajout equipe", e);
    }
  }

  revalidatePath(`/${slug}/cockpit/equipe`);
  redirect(`/${slug}/cockpit/equipe?ajout=${res}`);
}

export async function retirerMembre(slug: string, formData: FormData) {
  await gardePresident(slug);
  const target = String(formData.get("user_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("equipe_retirer", { p_target: target });
  if (error) console.error("retirerMembre", error.message);
  revalidatePath(`/${slug}/cockpit/equipe`);
  redirect(`/${slug}/cockpit/equipe${error ? "?erreur=1" : "?ok=retire"}`);
}
