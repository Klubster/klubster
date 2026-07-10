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

/**
 * Ajouter un adhérent à la main.
 *
 * Le cas est constant : quelqu'un s'inscrit sur papier au forum des associations, ou par
 * téléphone. Sans cette porte, le bénévole ressaisit tout dans un tableur — précisément
 * ce que Klubster prétend supprimer.
 *
 * Le tarif vient de la base, jamais du formulaire : sinon on pourrait s'inscrire à 0 €.
 */
export async function ajouterAdherent(slug: string, formData: FormData) {
  const org = await garde(slug);

  const prenom = texte(formData, "prenom", 80);
  const nom = texte(formData, "nom", 80);
  if (!prenom || !nom) redirect(`/${slug}/cockpit/adherents/nouveau?erreur=nom`);

  const coursId = texte(formData, "cours", 40);
  const supabase = createSupabaseServerClient();

  const { data: adherent, error } = await supabase
    .from("adherents")
    .insert({
      organisation_id: org.id,
      prenom,
      nom,
      email: texte(formData, "email", 160),
      telephone: texte(formData, "telephone", 30),
    })
    .select("id")
    .single();

  if (error || !adherent) {
    console.error("ajouterAdherent", error?.message);
    redirect(`/${slug}/cockpit/adherents/nouveau?erreur=enregistrement`);
  }

  if (coursId) {
    const { data: cours } = await supabase
      .from("cours")
      .select("tarif_centimes")
      .eq("id", coursId)
      .eq("organisation_id", org.id)
      .maybeSingle();

    if (cours) {
      await supabase.from("adhesions").insert({
        organisation_id: org.id,
        adherent_id: adherent.id,
        cours_id: coursId,
        saison: "2025-2026",
        montant_centimes: (cours as { tarif_centimes: number }).tarif_centimes,
        statut: "en_attente",
        mode_paiement: texte(formData, "mode", 20),
      });
    }
  }

  revalidatePath(`/${slug}/cockpit/adherents`);
  redirect(`/${slug}/cockpit/adherents/${adherent.id}?ok=1`);
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
