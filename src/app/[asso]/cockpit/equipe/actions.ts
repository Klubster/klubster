"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/resend";
import { gabaritEmail } from "@/lib/email-gabarit";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

/**
 * Traduit une erreur Postgres en motif affichable.
 *
 * POURQUOI CE N'EST PAS COSMÉTIQUE. Pendant trois semaines, nommer un trésorier ou un
 * secrétaire a échoué sur une violation de `profiles_role_check` — la contrainte
 * n'autorisait que quatre rôles alors que le cockpit en proposait cinq. Le président ne
 * voyait qu'un « L'ajout a échoué. » sans cause, et rien ne distinguait ce défaut de
 * base d'une faute de frappe dans une adresse. Un échec sans motif, c'est un défaut qui
 * ne remonte jamais.
 *
 * `20260802120000_roles_attribuables.sql` a corrigé la contrainte. Ce moteur de messages
 * reste : la prochaine divergence entre ce que l'interface propose et ce que la base
 * accepte se lira à l'écran, pas dans les journaux de Vercel.
 */
function motifErreur(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("profiles_role_check")) return "role_refuse";
  if (m.includes("réservé au président") || m.includes("reserve au president")) return "pas_president";
  if (m.includes("propre rôle") || m.includes("propre role")) return "soi_meme";
  if (m.includes("rôle invalide") || m.includes("role invalide")) return "role_inconnu";
  return "inconnue";
}

async function gardePresident(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const p = await getProfile();
  // Seul le président (ou le super_admin) gère l'équipe.
  if (!p || (p.role !== "admin_asso" && p.role !== "super_admin") || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    // `?acces=refuse` et non `?equipe=refuse` : le cockpit n'affiche un message que pour
    // `acces` — l'ancien paramètre renvoyait au tableau de bord sans un mot. Vu en test
    // le 02/08 : un trésorier qui ouvre /equipe doit lire pourquoi il est revenu.
    redirect(`/${slug}/cockpit?acces=refuse`);
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
  redirect(`/${slug}/cockpit/equipe${error ? `?erreur=${motifErreur(error.message)}` : "?ok=role"}`);
}

export async function ajouterMembre(slug: string, formData: FormData) {
  const org = await gardePresident(slug);
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("equipe_ajouter", { p_email: email });
  const res = error ? `erreur-${motifErreur(error.message)}` : (data as string);
  if (error) console.error("ajouterMembre", error.message);

  // Prévenir le bénévole qu'il a désormais accès au cockpit du club, avec le lien et
  // l'invitation à installer l'app. Non bloquant : un échec d'email n'annule pas l'ajout.
  if (res === "ok" && email) {
    const para = [
      `Bonjour,`,
      `Vous venez d'être ajouté(e) à l'équipe de ${org.nom} sur Klubster. Vous avez maintenant accès au cockpit du club.`,
      `Connectez-vous avec cette adresse email pour retrouver les inscriptions, les présences et le suivi du club.`,
      `Pour l'ouvrir en un clic depuis votre téléphone, installez l'app : ${BASE}/${slug}/installer`,
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
  redirect(`/${slug}/cockpit/equipe${error ? `?erreur=${motifErreur(error.message)}` : "?ok=retire"}`);
}
