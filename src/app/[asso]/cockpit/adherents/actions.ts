"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organisation } from "@/types/db";

async function garde(slug: string): Promise<Organisation> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const p = await getProfile();
  if (!p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/adherents`);
  }
  return org;
}

const texte = (fd: FormData, nom: string, max: number) =>
  String(fd.get(nom) ?? "").trim().slice(0, max) || null;

/**
 * Modifier la fiche d'un adhérent.
 *
 * On ne fait jamais confiance à l'`adherentId` du formulaire : la mise à jour est filtrée
 * par `organisation_id`, sinon un président pourrait éditer l'adhérent d'un autre club en
 * changeant un identifiant dans le HTML.
 */
export async function modifierAdherent(slug: string, adherentId: string, formData: FormData) {
  const org = await garde(slug);

  const prenom = texte(formData, "prenom", 80);
  const nom = texte(formData, "nom", 80);
  if (!prenom || !nom) redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=nom`);

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("adherents")
    .update({
      prenom,
      nom,
      email: texte(formData, "email", 160),
      telephone: texte(formData, "telephone", 30),
    })
    .eq("id", adherentId)
    .eq("organisation_id", org.id);

  if (error) {
    console.error("modifierAdherent", error.message);
    redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=enregistrement`);
  }

  revalidatePath(`/${slug}/cockpit/adherents`);
  revalidatePath(`/${slug}/cockpit/adherents/${adherentId}`);
  redirect(`/${slug}/cockpit/adherents/${adherentId}?ok=1`);
}

/** Marquer une pièce comme reçue (ou de nouveau manquante) depuis la fiche. */
export async function basculerPiece(slug: string, adherentId: string, pieceId: string, statut: string) {
  const org = await garde(slug);
  const supabase = createSupabaseServerClient();
  const nouveau = statut === "recue" ? "manquante" : "recue";

  const { error } = await supabase
    .from("pieces_adherent")
    .update({ statut: nouveau })
    .eq("id", pieceId)
    .eq("organisation_id", org.id);

  if (error) console.error("basculerPiece", error.message);
  revalidatePath(`/${slug}/cockpit/adherents/${adherentId}`);
  redirect(`/${slug}/cockpit/adherents/${adherentId}`);
}
