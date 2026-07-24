"use server";
// Gestion du fil d'actualités du club (table `actualites`). L'ancien champ
// `organisations.actualite` n'est plus géré ici : le bandeau « À la une » le lit
// encore en repli tant que le club n'a rien publié dans la table, c'est tout.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { exigerPermission } from "@/lib/garde";
import { validerImage } from "@/lib/upload";

// Publier sur le site du club engage son image publique : permission « site »,
// et non la simple appartenance à l'équipe.
async function gardeAdmin(slug: string) {
  const { org } = await exigerPermission(slug, "site");
  return org;
}

// Date de publication « AAAA-MM-JJ » réellement calendaire (un « 2026-02-31 » saisi à
// la main glisserait en mars côté Postgres). Repli : aujourd'hui.
function dateSure(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return s;
  }
  return new Date().toISOString().slice(0, 10);
}

export async function ajouterActualite(slug: string, formData: FormData) {
  const org = await gardeAdmin(slug);
  const supabase = await createSupabaseServerClient();

  const titre = String(formData.get("titre") ?? "").trim().slice(0, 120);
  const texte = String(formData.get("texte") ?? "").trim().slice(0, 5000);
  if (!titre || !texte) redirect(`/${slug}/cockpit/actualite?erreur=vide`);

  let imageUrl: string | null = null;
  const file = formData.get("image");
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    const f = file as File;
    // Type et extension déterminés par les octets réels, jamais par f.name ni f.type.
    const v = await validerImage(f);
    if (!v.ok) redirect(`/${slug}/cockpit/actualite?erreur=image`);
    const path = `${org.id}/actu-${Date.now()}.${v.ext}`;
    const { error: upErr } = await supabase.storage
      .from("actualites")
      .upload(path, f, { upsert: true, contentType: v.contentType });
    if (upErr) {
      console.error("upload actualite", upErr.message);
    } else {
      imageUrl = supabase.storage.from("actualites").getPublicUrl(path).data.publicUrl;
    }
  }

  const { error } = await supabase.from("actualites").insert({
    organisation_id: org.id,
    titre,
    texte,
    image_url: imageUrl,
    publie_le: dateSure(formData.get("publie_le")),
  });
  if (error) {
    console.error("ajouterActualite", error.message);
    redirect(`/${slug}/cockpit/actualite?erreur=enregistrement`);
  }

  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?ok=1`);
}

export async function supprimerActualite(slug: string, id: string) {
  const org = await gardeAdmin(slug);
  const supabase = await createSupabaseServerClient();
  // Filtre organisation_id en plus de l'id : jamais l'actu d'un autre club, même si la
  // RLS le garantit déjà — la Server Action n'est jamais la seule garde, ni l'inverse.
  const { error } = await supabase.from("actualites").delete().eq("id", id).eq("organisation_id", org.id);
  if (error) console.error("supprimerActualite", error.message);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?supprime=1`);
}
