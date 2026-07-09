"use server";
// Actions du mode « Édition de page » de la vitrine (admin du club uniquement).
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { normaliserPageConfig } from "@/lib/page-config";
import type { ItemChapitre, Organisation, SectionCustom, SectionCustomType } from "@/types/db";

async function gardeAdmin(slug: string): Promise<Organisation> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect(`/${slug}`);
  const profile = await getProfile();
  const ok = profile && (profile.role === "super_admin" || (profile.organisation_id === org.id && profile.role === "admin_asso"));
  if (!ok) redirect(`/connexion?next=/${slug}?edition=1`);
  return org;
}

async function sauver(
  org: Organisation,
  pc: ReturnType<typeof normaliserPageConfig>,
  slug: string,
  ancre?: string,
  succes?: "deplacee" | "ajoutee" | "supprimee"
) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ page_config: pc }).eq("id", org.id);
  if (error) {
    // Sans ceci, un échec d'enregistrement renvoyait la même page qu'un succès :
    // le bénévole cliquait, rien ne se passait, et rien ne le disait.
    console.error("page_config", error.message);
    redirect(`/${slug}?edition=1&erreur=enregistrement`);
  }
  revalidatePath(`/${slug}`);
  // Une modification silencieuse dans une page longue ressemble à un échec.
  // On confirme explicitement, et l'ancre ramène sur la section touchée.
  const params = new URLSearchParams({ edition: "1" });
  if (succes) params.set("ok", succes);
  redirect(`/${slug}?${params.toString()}${ancre ? `#${ancre}` : ""}`);
}

// Remonter (dir = -1) ou descendre (dir = 1) une section.
export async function deplacerSection(slug: string, cle: string, dir: number) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  const i = pc.ordre.indexOf(cle);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= pc.ordre.length) redirect(`/${slug}?edition=1`);
  [pc.ordre[i], pc.ordre[j]] = [pc.ordre[j], pc.ordre[i]];
  await sauver(org, pc, slug, cle, "deplacee");
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
    if (f.size > 0 && f.size <= 3 * 1024 * 1024 && (f.type ?? "").startsWith("image/")) {
      const supabase = createSupabaseServerClient();
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const path = `${org.id}/section-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("sections")
        .upload(path, f, { upsert: true, contentType: f.type || undefined });
      if (upErr) {
        console.error("upload section", upErr.message);
        redirect(`/${slug}?edition=1&erreur=photo`);
      } else imageUrl = supabase.storage.from("sections").getPublicUrl(path).data.publicUrl;
    }
  }
  if (!imageUrl && !texte) redirect(`/${slug}?edition=1&erreur=vide`); // section vide : on ne crée rien

  const section: SectionCustom = { id: `c${Date.now()}`, type, titre, texte, texte2, image_url: imageUrl };
  pc.custom.push(section);
  pc.ordre.push(section.id);
  await sauver(org, pc, slug, section.id, "ajoutee"); // atterrir directement sur la section créée
}

// Upload d'une image du chapitre vers le bucket public `sections`. Renvoie l'URL publique ou null.
async function uploaderImage(orgId: string, file: unknown, prefixe: string): Promise<string | null> {
  if (!file || typeof file !== "object" || !("size" in file)) return null;
  const f = file as File;
  if (f.size <= 0 || f.size > 3 * 1024 * 1024 || !(f.type ?? "").startsWith("image/")) return null;
  const supabase = createSupabaseServerClient();
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${orgId}/${prefixe}-${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const { error } = await supabase.storage.from("sections").upload(path, f, { upsert: true, contentType: f.type || undefined });
  if (error) {
    console.error("upload chapitre", error.message);
    return null;
  }
  return supabase.storage.from("sections").getPublicUrl(path).data.publicUrl;
}

const champ = (fd: FormData, nom: string, max = 300) => String(fd.get(nom) ?? "").trim().slice(0, max) || null;

// Ajouter un chapitre depuis la bibliothèque (le layout est imposé par le type).
export async function ajouterChapitre(slug: string, type: SectionCustomType, formData: FormData) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  if (pc.custom.length >= 16) redirect(`/${slug}?edition=1`);

  const s: SectionCustom = {
    id: `c${Date.now()}`,
    type,
    titre: champ(formData, "titre", 80),
    texte: champ(formData, "texte", 2000),
    texte2: champ(formData, "texte2", 2000),
    image_url: null,
    items: [],
  };
  const items: ItemChapitre[] = [];

  if (type === "president") {
    // texte = citation ; items[0] = { titre: nom, texte: rôle }
    s.image_url = await uploaderImage(org.id, formData.get("photo"), "president");
    const nom = champ(formData, "nom", 80);
    const role = champ(formData, "role", 80) ?? "Président du club";
    if (nom) items.push({ titre: nom, texte: role, image_url: null });
    if (!s.texte) redirect(`/${slug}?edition=1&erreur=vide`); // la citation est le cœur du chapitre
  } else if (type === "chiffres" || type === "faq" || type === "resultats") {
    // paires titre/texte : chiffre+label, question+réponse, résultat+détail
    for (let i = 0; i < 6; i++) {
      const t = champ(formData, `item_titre_${i}`, 160);
      const x = champ(formData, `item_texte_${i}`, 600);
      if (t || x) items.push({ titre: t, texte: x, image_url: null });
    }
    if (items.length === 0) redirect(`/${slug}?edition=1&erreur=vide`);
  } else if (type === "equipe") {
    for (let i = 0; i < 6; i++) {
      const prenom = champ(formData, `item_titre_${i}`, 60);
      const role = champ(formData, `item_texte_${i}`, 80);
      if (!prenom) continue;
      const url = await uploaderImage(org.id, formData.get(`item_photo_${i}`), "equipe");
      items.push({ titre: prenom, texte: role, image_url: url });
    }
    if (items.length === 0) redirect(`/${slug}?edition=1&erreur=vide`);
  } else if (type === "galerie" || type === "partenaires") {
    // Ces deux chapitres passent désormais par ajouterChapitreMedias (envoi direct navigateur).
    redirect(`/${slug}?edition=1&erreur=type`);
  } else if (type === "citation") {
    if (!s.texte) redirect(`/${slug}?edition=1&erreur=vide`);
  } else {
    // Texte & photo (layouts historiques) : géré par ajouterSection.
    redirect(`/${slug}?edition=1&erreur=type`);
  }

  s.items = items;
  pc.custom.push(s);
  pc.ordre.push(s.id);
  await sauver(org, pc, slug, s.id, "ajoutee"); // atterrir directement sur le chapitre créé
}

/**
 * Galerie / partenaires : les images ont été envoyées directement du navigateur vers
 * Supabase (limite de 4 Mo des Server Actions). Le serveur ne reçoit que des URLs.
 *
 * On ne fait jamais confiance à une URL fournie par le client : chacune doit pointer
 * vers le bucket `sections` ET vers le dossier de CETTE organisation. Sinon un club
 * pourrait afficher — ou faire croire qu'il héberge — les images d'un autre.
 */
export async function ajouterChapitreMedias(slug: string, type: "galerie" | "partenaires", formData: FormData) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  if (pc.custom.length >= 16) redirect(`/${slug}?edition=1`);

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
  const prefixeAttendu = `${base}/storage/v1/object/public/sections/${org.id}/`;

  let urls: unknown;
  try {
    urls = JSON.parse(String(formData.get("urls") ?? "[]"));
  } catch {
    redirect(`/${slug}?edition=1&erreur=photo`);
  }

  const valides = (Array.isArray(urls) ? urls : [])
    .filter((u): u is string => typeof u === "string" && u.startsWith(prefixeAttendu))
    .slice(0, 8);

  if (valides.length === 0) redirect(`/${slug}?edition=1&erreur=photo`);

  const s: SectionCustom = {
    id: `c${Date.now()}`,
    type,
    titre: champ(formData, "titre", 80),
    texte: champ(formData, "texte", 2000),
    texte2: null,
    image_url: null,
    items: valides.map((url) => ({ titre: null, texte: null, image_url: url })),
  };

  pc.custom.push(s);
  pc.ordre.push(s.id);
  await sauver(org, pc, slug, s.id, "ajoutee");
}

// Supprimer une section personnalisée.
export async function supprimerSection(slug: string, id: string) {
  const org = await gardeAdmin(slug);
  const pc = normaliserPageConfig(org.page_config);
  pc.custom = pc.custom.filter((c) => c.id !== id);
  pc.ordre = pc.ordre.filter((k) => k !== id);
  await sauver(org, pc, slug, undefined, "supprimee");
}
