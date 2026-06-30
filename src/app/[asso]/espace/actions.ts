"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";

export async function updateInfos(slug: string, adherentId: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${slug}/espace`);
  const tel = String(formData.get("tel") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const supabase = createSupabaseServerClient();
  await supabase.from("adherents").update({ telephone: tel || null, email: email || null }).eq("id", adherentId).eq("user_id", user.id);
  redirect(`/${slug}/espace`);
}

export async function marquerPieceEmail(slug: string, pieceId: string) {
  const supabase = createSupabaseServerClient();
  await supabase.from("pieces_adherent").update({ statut: "par_email", updated_at: new Date().toISOString() }).eq("id", pieceId);
  redirect(`/${slug}/espace`);
}

export async function uploadPiece(slug: string, formData: FormData) {
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${slug}/espace`);
  const pieceId = String(formData.get("pieceId") ?? "");
  const file = formData.get("file") as File | null;
  const supabase = createSupabaseServerClient();
  const { data: piece } = await supabase.from("pieces_adherent").select("organisation_id, adherent_id, cle").eq("id", pieceId).maybeSingle();
  if (file && file.size > 0 && piece) {
    const safe = (piece as { cle: string }).cle.replace(/[^a-z0-9]+/gi, "-");
    const path = `${(piece as { organisation_id: string }).organisation_id}/${(piece as { adherent_id: string }).adherent_id}/${safe}-${Date.now()}`;
    const { error } = await supabase.storage.from("pieces").upload(path, file, { upsert: true });
    if (!error) {
      await supabase.from("pieces_adherent").update({ statut: "fournie", chemin: path, updated_at: new Date().toISOString() }).eq("id", pieceId);
    }
  }
  redirect(`/${slug}/espace`);
}
