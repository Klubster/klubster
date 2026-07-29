"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseStorageClient } from "@/lib/supabase/server";
import { verifierPermission } from "@/lib/garde";
import { validerImage } from "@/lib/upload";

/**
 * Identité du club (logo, couleur) — modifiable APRÈS la création.
 * Jusqu'ici, le logo ne pouvait être posé qu'à l'étape 02 du wizard : un club
 * créé sans logo ne pouvait plus jamais en ajouter un (constaté le 13/07/2026
 * en construisant le club de démonstration « comme un utilisateur »).
 */
// Logo, police et couleur habillent le site public, les emails et l'application des
// adhérents : permission « site ». Un trésorier ou un encadrant n'a pas à y toucher.
async function organisationAutorisee(slug: string) {
  const ctx = await verifierPermission(slug, "site");
  if (!ctx) return null;
  return { supabase: await createSupabaseServerClient(), org: ctx.org };
}

export async function changerLogo(slug: string, fd: FormData) {
  const ctx = await organisationAutorisee(slug);
  if (!ctx) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { supabase, org } = ctx;

  const file = fd.get("logo");
  if (!file || typeof file !== "object" || !("size" in file) || (file as File).size === 0) {
    redirect(`/${slug}/cockpit/identite?erreur=vide`);
  }
  // Validation par octets réels (3 Mo max — les logos vectorisés exportés en PNG
  // haute définition dépassent souvent 2 Mo ; le plafond serveur est à 4 Mo).
  const v = await validerImage(file as File, 3);
  if (!v.ok) redirect(`/${slug}/cockpit/identite?erreur=image`);

  const path = `${org.id}/logo-${Date.now()}.${v.ext}`;
  // Client au jeton explicite : sans lui l'envoi part en anonyme (voir
  // createSupabaseStorageClient).
  const stockage = await createSupabaseStorageClient();
  if (!stockage) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { error: upErr } = await stockage.storage
    .from("logos")
    .upload(path, file as File, { upsert: true, contentType: v.contentType });
  if (upErr) {
    console.error("changerLogo upload", upErr.message);
    redirect(`/${slug}/cockpit/identite?erreur=envoi`);
  }
  const url = stockage.storage.from("logos").getPublicUrl(path).data.publicUrl;
  const { error } = await supabase.from("organisations").update({ logo_url: url }).eq("id", org.id);
  if (error) {
    console.error("changerLogo update", error.message);
    redirect(`/${slug}/cockpit/identite?erreur=enregistrement`);
  }
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/identite?ok=logo`);
}

export async function retirerLogo(slug: string) {
  const ctx = await organisationAutorisee(slug);
  if (!ctx) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { supabase, org } = ctx;
  const { error } = await supabase.from("organisations").update({ logo_url: null }).eq("id", org.id);
  if (error) redirect(`/${slug}/cockpit/identite?erreur=enregistrement`);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/identite?ok=retire`);
}

export async function changerTheme(slug: string, fd: FormData) {
  const ctx = await organisationAutorisee(slug);
  if (!ctx) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { supabase, org } = ctx;
  // getTemplate / getMode retombent sur des valeurs sûres si l'entrée est inconnue.
  const { getTemplate, getMode } = await import("@/lib/themes");
  const template = getTemplate(String(fd.get("template") ?? "")).id;
  const mode = getMode(String(fd.get("mode") ?? ""));
  const { error } = await supabase
    .from("organisations")
    .update({ theme_template: template, theme_mode: mode })
    .eq("id", org.id);
  if (error) redirect(`/${slug}/cockpit/identite?erreur=enregistrement`);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/identite?ok=theme`);
}

export async function changerCouleur(slug: string, fd: FormData) {
  const ctx = await organisationAutorisee(slug);
  if (!ctx) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { supabase, org } = ctx;
  const brut = String(fd.get("couleur") ?? "").trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(brut)) redirect(`/${slug}/cockpit/identite?erreur=couleur`);
  const { error } = await supabase
    .from("organisations")
    .update({ couleur_primaire: "#" + brut.toUpperCase() })
    .eq("id", org.id);
  if (error) redirect(`/${slug}/cockpit/identite?erreur=enregistrement`);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/identite?ok=couleur`);
}

/**
 * Dates de saison du club.
 *
 * Le réglage existait déjà, mais uniquement dans « Paiements », où il ne bornait que
 * les totaux de trésorerie. Or la saison décide de bien plus que ça : `saisonCourante()`
 * filtre les jauges de cours (`src/lib/complets.ts`), les relances automatiques
 * (`api/cron/relances`), la vue des cours du cockpit ET ce que l'adhérent voit dans son
 * espace. Un club qui ne l'a pas réglée retombe sur une bascule au 1ᵉʳ septembre : les
 * inscriptions prises au forum des associations fin août sont étiquetées sur la saison
 * PRÉCÉDENTE, et disparaissent de toutes ces vues le 1ᵉʳ septembre (relevé du 29/07/2026).
 *
 * D'où sa présence ici, dans les réglages du club, où un président le cherchera.
 * L'action de « Paiements » reste en place : deux entrées, un seul couple de colonnes.
 *
 * Permission « site » comme le reste de cette page — c'est un réglage de club, pas une
 * écriture financière.
 */
export async function changerSaison(slug: string, fd: FormData) {
  const ctx = await organisationAutorisee(slug);
  if (!ctx) redirect(`/connexion?next=/${slug}/cockpit/identite`);
  const { supabase, org } = ctx;

  const debut = String(fd.get("saison_debut") ?? "").trim() || null;
  const fin = String(fd.get("saison_fin") ?? "").trim() || null;

  // Les deux ensemble, ou aucune : une seule des deux ne suffit pas à déduire un
  // libellé de saison, et `saison_courante()` retomberait silencieusement sur la
  // bascule de septembre — soit exactement le défaut qu'on cherche à éviter.
  if ((debut && !fin) || (!debut && fin)) redirect(`/${slug}/cockpit/identite?erreur=saison_incomplete`);
  if (debut && fin && new Date(debut) >= new Date(fin)) redirect(`/${slug}/cockpit/identite?erreur=saison_ordre`);

  const { error } = await supabase
    .from("organisations")
    .update({ saison_debut: debut, saison_fin: fin })
    .eq("id", org.id);
  if (error) redirect(`/${slug}/cockpit/identite?erreur=enregistrement`);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/identite?ok=saison`);
}
