"use server";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormConfig } from "@/types/form";

export async function saveFormConfig(slug: string, config: FormConfig): Promise<{ ok?: boolean; error?: string }> {
  // Le formulaire d'inscription décide des pièces demandées et des réductions : il
  // engage le club. Réservé aux rôles qui gèrent le site, pas à toute l'équipe.
  const ctx = await verifierPermission(slug, "site");
  if (!ctx) return { error: "Non autorisé." };
  const { org } = ctx;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ form_config: config }).eq("id", org.id);
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Modèle de pièce à télécharger (ex. certificat médical vierge) : le président
 * joint un fichier, l'adhérent le télécharge depuis le formulaire d'inscription.
 * PDF ou image, 3 Mo max, validé par les premiers octets (pas seulement l'extension).
 */
export async function uploaderModelePiece(
  slug: string,
  fd: FormData
): Promise<{ url?: string; nom?: string; error?: string }> {
  const ctx = await verifierPermission(slug, "site");
  if (!ctx) return { error: "Non autorisé." };
  const { org } = ctx;
  const file = fd.get("modele");
  if (!file || typeof file !== "object" || !("size" in file)) return { error: "Aucun fichier reçu." };
  const f = file as File;
  if (f.size === 0) return { error: "Fichier vide." };
  if (f.size > 3 * 1024 * 1024) return { error: "Fichier trop lourd (3 Mo maximum)." };

  const octets = new Uint8Array(await f.slice(0, 8).arrayBuffer());
  const estPdf = octets[0] === 0x25 && octets[1] === 0x50 && octets[2] === 0x44 && octets[3] === 0x46; // %PDF
  const estPng = octets[0] === 0x89 && octets[1] === 0x50 && octets[2] === 0x4e && octets[3] === 0x47;
  const estJpg = octets[0] === 0xff && octets[1] === 0xd8;
  if (!estPdf && !estPng && !estJpg) return { error: "Format non reconnu : PDF, PNG ou JPG uniquement." };
  const ext = estPdf ? "pdf" : estPng ? "png" : "jpg";
  const contentType = estPdf ? "application/pdf" : estPng ? "image/png" : "image/jpeg";

  const supabase = createSupabaseServerClient();
  const path = `${org.id}/modele-piece-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("sections")
    .upload(path, f, { upsert: true, contentType });
  if (upErr) {
    console.error("uploaderModelePiece", upErr.message);
    return { error: "L'envoi a échoué. Réessayez." };
  }
  const url = supabase.storage.from("sections").getPublicUrl(path).data.publicUrl;
  return { url, nom: f.name || `modele.${ext}` };
}
