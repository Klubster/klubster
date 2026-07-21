"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { validerDocument } from "@/lib/upload";

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
  const supabase = createSupabaseServerClient();
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
  const supabase = createSupabaseServerClient();
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

  const supabase = createSupabaseServerClient();
  await supabase
    .from("pieces_adherent")
    .update({ statut: "par_email", updated_at: new Date().toISOString() })
    .eq("id", piece.id);
  redirect(`/${slug}/espace?ok=piece`);
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

  const supabase = createSupabaseServerClient();
  // upsert désactivé : deux dépôts créent deux objets distincts, on n'écrase jamais
  // un fichier existant depuis une requête entrante.
  const { error } = await supabase.storage
    .from("pieces")
    .upload(path, file as File, { upsert: false, contentType: v.contentType });
  if (error) {
    console.error("uploadPiece", error.message);
    redirect(`/${slug}/espace?erreur=envoi`);
  }

  await supabase
    .from("pieces_adherent")
    .update({ statut: "fournie", chemin: path, updated_at: new Date().toISOString() })
    .eq("id", piece.id);

  redirect(`/${slug}/espace?ok=piece`);
}
