"use server";
// Envoi direct de la messagerie du club via Resend (clubs@klubster.fr, reply-to club).
import { revalidatePath } from "next/cache";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { resendConfigured, type EnvoiResultat } from "@/lib/resend";
import { envoyerCampagne } from "@/lib/campagnes";
import { resoudreDestinataires, type AdherentCiblage, type AdhesionCiblage } from "@/lib/ciblage";
import { saisonCourante } from "@/lib/saison";


/**
 * Envoi d'un message à un groupe.
 *
 * `groupe` vaut :
 *   "tous"       → tous les adhérents avec un email
 *   "parents"    → les adhérents mineurs (l'email est celui du représentant légal)
 *   "incomplet"  → ceux dont au moins une pièce du dossier n'est pas reçue
 *   <id de cours>→ les inscrits à ce cours
 *
 * Le ciblage est recalculé côté serveur : on ne fait jamais confiance à la liste d'adresses
 * envoyée par le navigateur.
 */
export async function envoyerMessage(
  slug: string,
  groupe: string,
  objet: string,
  message: string
): Promise<EnvoiResultat> {
  // Écrire à tous les adhérents est une permission, pas une simple appartenance au
  // club : un encadrant ou un accès en lecture seule n'a rien à envoyer en masse.
  // Aucune politique de base ne pouvait l'arrêter, l'envoi passant par Resend.
  const ctx = await verifierPermission(slug, "messages");
  if (!ctx) return { ok: false, envoyes: 0, erreur: "Non autorisé." };
  const { org } = ctx;
  if (!resendConfigured()) return { ok: false, envoyes: 0, erreur: "Envoi non configuré." };

  const objetNet = objet.trim().slice(0, 150);
  const texteNet = message.trim().slice(0, 10000);
  if (!objetNet || !texteNet) return { ok: false, envoyes: 0, erreur: "Objet et message sont requis." };

  const supabase = await createSupabaseServerClient();
  // TOUT le ciblage vit dans src/lib/ciblage.ts — la même fonction que le compteur
  // affiché. Ici on ne fait que charger les données et lui passer la main.
  const [{ data: adherents }, { data: adhesions }, { data: pieces }] = await Promise.all([
    supabase.from("adherents").select("id, email, date_naissance, infos").eq("organisation_id", org.id),
    supabase.from("adhesions").select("adherent_id, cours_id, saison, statut").eq("organisation_id", org.id),
    supabase.from("pieces_adherent").select("adherent_id").eq("organisation_id", org.id)
      .eq("statut", "manquante").eq("obligatoire", true),
  ]);
  const destinataires = resoudreDestinataires(
    {
      adherents: (adherents ?? []) as AdherentCiblage[],
      adhesions: (adhesions ?? []) as AdhesionCiblage[],
      incompletIds: new Set(((pieces ?? []) as { adherent_id: string }[]).map((x) => x.adherent_id)),
      saisonCourante: saisonCourante(org),
    },
    groupe
  );

  if (destinataires.length === 0) return { ok: false, envoyes: 0, erreur: "Aucun destinataire avec un email." };

  // Libellé du groupe photographié maintenant : un cours renommé ou supprimé ne doit pas
  // rendre l'historique incompréhensible six mois plus tard.
  let groupeLibelle = "Tous les adhérents";
  if (groupe === "parents") groupeLibelle = "Responsables légaux des mineurs";
  else if (groupe === "incomplet") groupeLibelle = "Dossiers incomplets";
  else if (groupe !== "tous") {
    const { data: c } = await supabase.from("cours").select("nom").eq("id", groupe).maybeSingle();
    groupeLibelle = (c as { nom?: string } | null)?.nom ?? "Cours";
  }

  const profile = await getProfile();

  const res = await envoyerCampagne({
    supabase,
    organisationId: org.id,
    nomClub: org.nom,
    replyTo: org.email_contact,
    auteurProfileId: profile?.id ?? null,
    auteurNom: [profile?.prenom, profile?.nom].filter(Boolean).join(" ") || null,
    groupe,
    groupeLibelle,
    objet: objetNet,
    corps: texteNet,
    cibles: destinataires,
  });

  revalidatePath(`/${slug}/cockpit/communication`);

  // « envoyés » signifie ici ACCEPTÉS par Resend — jamais « arrivés ». La nuance est
  // portée par l'écran d'historique, qui distingue les deux.
  return {
    ok: res.ok,
    envoyes: res.acceptes,
    erreur:
      res.statut === "partiel"
        ? `Envoi partiel : ${res.acceptes} sur ${res.destinataires} acceptés.${res.erreur ? " " + res.erreur : ""}`
        : res.erreur,
  };
}
