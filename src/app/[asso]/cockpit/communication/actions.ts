"use server";
// Envoi direct de la messagerie du club via Resend (clubs@klubster.fr, reply-to club).
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envoyerAuxAdherents, resendConfigured, type EnvoiResultat } from "@/lib/resend";

export async function envoyerMessage(
  slug: string,
  groupe: string, // "tous" ou un id de cours
  objet: string,
  message: string
): Promise<EnvoiResultat> {
  const org = await getOrganisationBySlug(slug);
  const profile = await getProfile();
  if (!org || !profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    return { ok: false, envoyes: 0, erreur: "Non autorisé." };
  }
  if (!resendConfigured()) return { ok: false, envoyes: 0, erreur: "Envoi non configuré." };

  const objetNet = objet.trim().slice(0, 150);
  const texteNet = message.trim().slice(0, 10000);
  if (!objetNet || !texteNet) return { ok: false, envoyes: 0, erreur: "Objet et message sont requis." };

  const supabase = createSupabaseServerClient();
  const { data: adherents } = await supabase
    .from("adherents")
    .select("id, email")
    .eq("organisation_id", org.id)
    .not("email", "is", null);

  let cibles = (adherents ?? []) as { id: string; email: string }[];
  if (groupe !== "tous") {
    const { data: adhesions } = await supabase
      .from("adhesions")
      .select("adherent_id")
      .eq("organisation_id", org.id)
      .eq("cours_id", groupe);
    const ids = new Set((adhesions ?? []).map((a) => (a as { adherent_id: string }).adherent_id));
    cibles = cibles.filter((a) => ids.has(a.id));
  }

  const emails = Array.from(new Set(cibles.map((a) => a.email.trim().toLowerCase()).filter(Boolean)));
  if (emails.length === 0) return { ok: false, envoyes: 0, erreur: "Aucun destinataire avec un email." };

  return envoyerAuxAdherents({
    nomClub: org.nom,
    replyTo: org.email_contact,
    destinataires: emails,
    objet: objetNet,
    texte: texteNet,
  });
}
