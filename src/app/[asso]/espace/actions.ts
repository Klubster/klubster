"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, createSupabaseStorageClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getUser } from "@/lib/auth";
import { validerDocument } from "@/lib/upload";
import { envoyerEmail } from "@/lib/resend";
import { gabaritEmail } from "@/lib/email-gabarit";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

/**
 * Espace adhérent : mise à jour de ses coordonnées et dépôt de ses pièces.
 *
 * Toutes les actions de ce fichier repartent de l'utilisateur connecté pour retrouver
 * SES pièces. Auparavant, une pièce était chargée par son seul identifiant : quiconque
 * connaissait ou devinait un `pieceId` pouvait déposer un fichier dessus, et
 * `marquerPieceEmail` ne vérifiait même pas qu'un utilisateur était connecté. La
 * protection reposait entièrement sur des politiques RLS non vérifiables depuis le
 * code (relevé à l'audit du 21/07/2026). Elle est désormais explicite ici aussi.
 */

/** Retrouve une pièce SI elle appartient bien à un adhérent de l'utilisateur connecté. */
async function piecePossedee(pieceId: string, userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("pieces_adherent")
    .select("id, organisation_id, adherent_id, cle, adherents!inner(user_id)")
    .eq("id", pieceId)
    .eq("adherents.user_id", userId)
    .maybeSingle();
  return (data as { id: string; organisation_id: string; adherent_id: string; cle: string } | null) ?? null;
}

export async function updateInfos(slug: string, adherentId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${slug}/espace`);
  const tel = String(formData.get("tel") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("adherents")
    .update({ telephone: tel || null, email: email || null })
    .eq("id", adherentId)
    .eq("user_id", user.id);
  redirect(`/${slug}/espace`);
}

export async function marquerPieceEmail(slug: string, pieceId: string) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${slug}/espace`);
  const piece = await piecePossedee(pieceId, user.id);
  if (!piece) redirect(`/${slug}/espace?erreur=piece`);

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("pieces_adherent")
    .update({ statut: "par_email", updated_at: new Date().toISOString() })
    .eq("id", piece.id);

  // Prévenir le club. Sans cela, l'adhérent déclarait un envoi que personne ne voyait
  // passer : la pièce restait à surveiller à la main dans le cockpit.
  await previenirClubEnvoiEmail(piece, slug);

  redirect(`/${slug}/espace?ok=piece`);
}

/** Alerte le club qu'un adhérent annonce l'envoi d'une pièce par email. Non bloquant. */
async function previenirClubEnvoiEmail(
  piece: { id: string; organisation_id: string; adherent_id: string },
  slug: string
) {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const [{ data: org }, { data: adherent }, { data: detail }] = await Promise.all([
      admin.from("organisations").select("nom, email_contact, couleur_primaire").eq("id", piece.organisation_id).maybeSingle(),
      admin.from("adherents").select("prenom, nom").eq("id", piece.adherent_id).maybeSingle(),
      admin.from("pieces_adherent").select("label").eq("id", piece.id).maybeSingle(),
    ]);
    const destinataire = (org as { email_contact: string | null } | null)?.email_contact;
    if (!destinataire) return;
    const nomClub = (org as { nom: string }).nom;
    const qui = adherent ? `${(adherent as { prenom: string }).prenom} ${(adherent as { nom: string }).nom}` : "Un adhérent";
    const quoi = (detail as { label: string } | null)?.label ?? "une pièce";
    const para = [
      `${qui} annonce l'envoi de « ${quoi} » par email.`,
      `Le document ne transite pas par Klubster : il arrive directement dans votre boîte. Une fois reçu, marquez la pièce comme fournie depuis la fiche de l'adhérent.`,
    ];
    await envoyerEmail({
      to: destinataire,
      fromNom: `${nomClub} via Klubster`,
      objet: `Pièce annoncée par email — ${qui}`,
      texte: para.join("\n\n"),
      html: gabaritEmail({
        club: nomClub,
        couleur: (org as { couleur_primaire: string | null }).couleur_primaire,
        titre: `Pièce annoncée par email`,
        paragraphes: para,
        bouton: { libelle: "OUVRIR LE COCKPIT", url: `${BASE}/${slug}/cockpit/adherents` },
      }),
    });
  } catch {
    /* notification non bloquante : la pièce est déjà marquée */
  }
}

export async function uploadPiece(slug: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${slug}/espace`);

  const pieceId = String(formData.get("pieceId") ?? "");
  const file = formData.get("file");
  if (!file || typeof file !== "object" || !("size" in file) || (file as File).size === 0) {
    redirect(`/${slug}/espace?erreur=vide`);
  }

  const piece = await piecePossedee(pieceId, user.id);
  if (!piece) redirect(`/${slug}/espace?erreur=piece`);

  // PDF, JPEG ou PNG, 5 Mo, contrôlés sur les octets réels.
  const v = await validerDocument(file as File, 5);
  if (!v.ok) redirect(`/${slug}/espace?erreur=format`);

  // Chemin non devinable : le nom de la pièce et l'horodatage se déduisaient trop
  // facilement. Un identifiant aléatoire évite qu'une URL de stockage se devine.
  const alea = crypto.randomUUID();
  const path = `${piece.organisation_id}/${piece.adherent_id}/${alea}.${v.ext}`;

  // Client au jeton explicite : sans lui, l'envoi part en anonyme et les politiques
  // RLS le refusent (voir createSupabaseStorageClient).
  const stockage = await createSupabaseStorageClient();
  if (!stockage) redirect(`/connexion?next=/${slug}/espace`);
  // upsert désactivé : deux dépôts créent deux objets distincts, on n'écrase jamais
  // un fichier existant depuis une requête entrante.
  const { error } = await stockage.storage
    .from("pieces")
    .upload(path, file as File, { upsert: false, contentType: v.contentType });
  if (error) {
    console.error("uploadPiece", error.message);
    redirect(`/${slug}/espace?erreur=envoi`);
  }

  const supabase = await createSupabaseServerClient();
  await supabase
    .from("pieces_adherent")
    .update({ statut: "fournie", chemin: path, updated_at: new Date().toISOString() })
    .eq("id", piece.id);

  redirect(`/${slug}/espace?ok=piece`);
}
