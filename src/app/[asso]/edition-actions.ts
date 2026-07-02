"use server";
// Actions du mode « Édition de page » de la vitrine (admin du club uniquement).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { normaliserPageConfig } from "@/lib/page-config";
import type { Organisation, SectionCustom, SectionCustomType } from "@/types/db";

async function gardeAdmin(slug: string): Promise<Organisation> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect(`/${slug}`);
  const profile = await getProfile();
  const ok = profile && (profile.role === "super_admin" || (profile.organisation_id === org.id && profile.role === "admin_asso"));
  if (!ok) redirect(`/connexion?next=/${slug}?edition=1`);
  return org;
}

async function sauver(org: Organisation, pc: ReturnType<typeof normaliserPageConfig>, slug: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ page_config: pc }).eq("id", org.id);
  if (error) console.error("page_config", error.message);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}?edition=1`);
}

// Remonter (dir = -1) ou descendre (dir = 1) une section.
export async function deplacerSection(slug: string, cle: string, dir: number) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  const i = pc.ordre.indexOf(cle);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= pc.ordre.length) redirect(`/${slug}?edition=1`);
  [pc.ordre[i], pc.ordre[j]] = [pc.ordre[j], pc.ordre[i]];
  await sauver(org, pc, slug);
}

// Ajouter une section personnalisée depuis un template (photo obligatoire).
export async function ajouterSection(slug: string, formData: FormData) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  if (pc.custom.length >= 12) redirect(`/${slug}?edition=1`);

  const types: SectionCustomType[] = ["photo-droite", "photo-gauche", "triptyque"];
  const type = types.includes(formData.get("type") as SectionCustomType)
    ? (formData.get("type") as SectionCustomType)
    : "photo-droite";
  const titre = String(formData.get("titre") ?? "").trim().slice(0, 80) || null;
  const texte = String(formData.get("texte") ?? "").trim().slice(0, 2000) || null;
  const texte2 = String(formData.get("texte2") ?? "").trim().slice(0, 2000) || null;

  let imageUrl: string | null = null;
  const file = formData.get("photo");
  if (file && typeof file === "object" && "size" in file) {
    const f = file as File;
    if (f.size > 0 && f.size <= 5 * 1024 * 1024 && (f.type ?? "").startsWith("image/")) {
      const supabase = createSupabaseServerClient();
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${org.id}/section-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("sections")
        .upload(path, f, { upsert: true, contentType: f.type || undefined });
      if (upErr) console.error("upload section", upErr.message);
      else imageUrl = supabase.storage.from("sections").getPublicUrl(path).data.publicUrl;
    }
  }
  if (!imageUrl && !texte) redirect(`/${slug}?edition=1`); // section vide : on ne crée rien

  const section: SectionCustom = { id: `c${Date.now()}`, type, titre, texte, texte2, image_url: imageUrl };
  pc.custom.push(section);
  pc.ordre.push(section.id);
  await sauver(org, pc, slug);
}

// Supprimer une section personnalisée.
export async function supprimerSection(slug: string, id: string) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  pc.custom = pc.custom.filter((c) => c.id !== id);
  pc.ordre = pc.ordre.filter((k) => k !== id);
  await sauver(org, pc, slug);
}
