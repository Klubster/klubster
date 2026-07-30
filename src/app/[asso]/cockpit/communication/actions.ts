"use server";
// Envoi direct de la messagerie du club via Resend (clubs@klubster.fr, reply-to club).
import { revalidatePath } from "next/cache";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { resendConfigured, type EnvoiResultat } from "@/lib/resend";
import { envoyerCampagne } from "@/lib/campagnes";

/** Un adhérent est mineur s'il est né il y a moins de 18 ans. */
function estMineur(dateNaissance: string | null): boolean {
  if (!dateNaissance) return false;
  const n = new Date(dateNaissance);
  if (Number.isNaN(n.getTime())) return false;
  const seuil = new Date();
  seuil.setFullYear(seuil.getFullYear() - 18);
  return n > seuil;
}

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
  const { data: adherents } = await supabase
    .from("adherents")
    .select("id, email, date_naissance")
    .eq("organisation_id", org.id)
    .not("email", "is", null);

  let cibles = (adherents ?? []) as { id: string; email: string; date_naissance: string | null }[];

  if (groupe === "parents") {
    cibles = cibles.filter((a) => estMineur(a.date_naissance));
  } else if (groupe === "incomplet") {
    // Un dossier est incomplet dès qu'une pièce n'est pas « reçue ».
    const { data: pieces } = await supabase
      .from("pieces_adherent")
      .select("adherent_id, statut")
      .eq("organisation_id", org.id)
      .neq("statut", "recue");
    const ids = new Set((pieces ?? []).map((p) => (p as { adherent_id: string }).adherent_id));
    cibles = cibles.filter((a) => ids.has(a.id));
  } else if (groupe !== "tous") {
    const { data: adhesions } = await supabase
      .from("adhesions")
      .select("adherent_id")
      .eq("organisation_id", org.id)
      .eq("cours_id", groupe);
    const ids = new Set((adhesions ?? []).map((a) => (a as { adherent_id: string }).adherent_id));
    cibles = cibles.filter((a) => ids.has(a.id));
  }

  // Déduplication par adresse : deux adhérents d'une même famille peuvent partager une
  // boîte, et personne ne doit recevoir le message deux fois. On garde le premier
  // adhérent rencontré pour l'adresse, afin que la ligne reste rattachable.
  const parEmail = new Map<string, { adherentId: string | null; email: string }>();
  for (const a of cibles) {
    const email = a.email.trim().toLowerCase();
    if (!email || parEmail.has(email)) continue;
    parEmail.set(email, { adherentId: a.id, email });
  }
  const destinataires = Array.from(parEmail.values());
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
