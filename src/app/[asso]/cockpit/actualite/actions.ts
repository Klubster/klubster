"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";

async function gardeAdmin(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect(`/${slug}/cockpit`);
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/actualite`);
  }
  return org;
}

export async function enregistrerActualite(slug: string, formData: FormData) {
  const org = await gardeAdmin(slug);
  const supabase = createSupabaseServerClient();

  const texte = String(formData.get("texte") ?? "").trim();
  let imageUrl: string | null = org.actualite?.image_url ?? null;

  const file = formData.get("image");
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    const f = file as File;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${org.id}/hero-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("actualites")
      .upload(path, f, { upsert: true, contentType: f.type || undefined });
    if (upErr) {
      console.error("upload actualite", upErr.message);
    } else {
      imageUrl = supabase.storage.from("actualites").getPublicUrl(path).data.publicUrl;
    }
  }

  const actualite = texte || imageUrl ? { texte: texte || null, image_url: imageUrl } : null;
  const { error } = await supabase.from("organisations").update({ actualite }).eq("id", org.id);
  if (error) console.error("enregistrerActualite", error.message);

  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?ok=1`);
}

export async function supprimerActualite(slug: string) {
  const org = await gardeAdmin(slug);
  const supabase = createSupabaseServerClient();
  await supabase.from("organisations").update({ actualite: null }).eq("id", org.id);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?supprime=1`);
}
