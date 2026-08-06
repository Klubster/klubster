"use server";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient, createSupabaseStorageClient } from "@/lib/supabase/server";
import type { FormConfig } from "@/types/form";

export async function saveFormConfig(slug: string, config: FormConfig): Promise<{ ok?: boolean; error?: string }> {
  // Le formulaire d'inscription décide des pièces demandées et des réductions : il
  // engage le club. Réservé aux rôles qui gèrent le site, pas à toute l'équipe.
  const ctx = await verifierPermission(slug, "site");
  if (!ctx) return { error: "Non autorisé." };
  const { org } = ctx;

  // VALIDATION SERVEUR — le JSON partait en base tel quel. Un champ sans libellé
  // rendait une étiquette vide sur le formulaire public ; un libellé seulement fait
  // d'espaces, pareil. On nettoie ce qui se nettoie (trim), on refuse ce qui rendrait
  // le formulaire public illisible, avec un message que le président comprend.
  const propre: FormConfig = {
    ...config,
    pages: (config.pages ?? []).map((pg) => ({
      ...pg,
      titre: (pg.titre ?? "").trim(),
      champs: (pg.champs ?? []).map((ch) => ({ ...ch, label: (ch.label ?? "").trim() })),
    })),
    pieces: (config.pieces ?? []).map((p) => ({ ...p, label: (p.label ?? "").trim() })),
  };
  for (const pg of propre.pages) {
    for (const ch of pg.champs) {
      if (!ch.label) return { error: "Un champ n’a pas de libellé : donnez-lui un nom, ou supprimez-le." };
      if (ch.type === "choix" && !(ch.options ?? []).filter((o) => o.trim()).length) {
        return { error: `La liste de choix « ${ch.label} » n’a aucune option : ajoutez-en, ou changez son type.` };
      }
    }
  }
  for (const p of propre.pieces) {
    if (!p.label) return { error: "Une pièce n’a pas de nom : donnez-lui un nom, ou supprimez-la." };
  }
  // Deux champs portant le même libellé écrivent sous LA MÊME clé dans le dossier :
  // la seconde réponse écrase la première, en silence. Refusé en nommant le doublon.
  const vus = new Set<string>();
  for (const pg of propre.pages) {
    for (const ch of pg.champs) {
      const cle = ch.label.toLowerCase();
      if (vus.has(cle)) return { error: `Deux champs portent le même libellé « ${ch.label} » : renommez-en un, sinon la seconde réponse écraserait la première.` };
      vus.add(cle);
    }
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ form_config: propre }).eq("id", org.id);
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

  const supabase = await createSupabaseStorageClient();
  if (!supabase) return { error: "Session expirée. Reconnectez-vous, puis réessayez." };
  const path = `${org.id}/modele-piece-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("sections")
    .upload(path, f, { upsert: true, contentType });
  if (upErr) {
    // Diagnostic temporaire (28/07/2026) : deux causes déjà corrigées n'ont pas suffi,
    // il faut savoir qui écrit réellement. À retirer dès que l'envoi refonctionne.
    const trace = `${ctx.profile.role}/${ctx.profile.id.slice(0, 8)} org=${(ctx.profile.organisation_id ?? "aucune").slice(0, 8)} cible=${org.id.slice(0, 8)}`;
    console.error("uploaderModelePiece", upErr.message, trace);
    return { error: `L'envoi a échoué (${upErr.message}) [${trace}]` };
  }
  const url = supabase.storage.from("sections").getPublicUrl(path).data.publicUrl;
  return { url, nom: f.name || `modele.${ext}` };
}
