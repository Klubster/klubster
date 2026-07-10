"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organisation, Creneau } from "@/types/db";

async function garde(slug: string): Promise<Organisation> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const p = await getProfile();
  if (!p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/cours`);
  }
  return org;
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Les créneaux arrivent du navigateur : on ne garde que ce qui est un vrai créneau. */
function creneauxPropres(brut: unknown): Creneau[] {
  if (!Array.isArray(brut)) return [];
  return brut
    .filter(
      (k): k is Creneau =>
        !!k &&
        typeof k === "object" &&
        JOURS.includes((k as Creneau).jour) &&
        HEURE.test((k as Creneau).debut) &&
        HEURE.test((k as Creneau).fin)
    )
    .slice(0, 10)
    // La note (« 8-12 ans ») est saisie ailleurs mais vit dans le créneau : la jeter ici
    // effacerait, à chaque changement de tarif, une information que personne ne pourrait
    // remettre depuis cette page.
    .map((k) => ({
      jour: k.jour,
      debut: k.debut,
      fin: k.fin,
      ...(k.note ? { note: String(k.note).slice(0, 60) } : {}),
    }));
}

/** Un tarif se saisit en euros et se stocke en centimes. « 12,50 » comme « 12.50 ». */
function tarifCentimes(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "0").replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export interface CoursForm {
  nom: string;
  public_cible: string | null;
  tarif_centimes: number;
  creneaux: Creneau[];
}

export async function enregistrerCours(slug: string, coursId: string | null, form: CoursForm) {
  const org = await garde(slug);

  const nom = String(form.nom ?? "").trim().slice(0, 120);
  if (!nom) return { erreur: "Le nom du cours est obligatoire." };

  const ligne = {
    nom,
    public_cible: String(form.public_cible ?? "").trim().slice(0, 120) || null,
    tarif_centimes: Math.max(0, Math.round(form.tarif_centimes ?? 0)),
    creneaux: creneauxPropres(form.creneaux),
  };

  const supabase = createSupabaseServerClient();

  // Sur une modification, le filtre par organisation empêche d'éditer le cours d'un autre
  // club en changeant un identifiant dans le HTML.
  const { error } = coursId
    ? await supabase.from("cours").update(ligne).eq("id", coursId).eq("organisation_id", org.id)
    : await supabase.from("cours").insert({ ...ligne, organisation_id: org.id });

  if (error) {
    console.error("enregistrerCours", error.message);
    return { erreur: "L’enregistrement a échoué." };
  }

  revalidatePath(`/${slug}/cockpit/cours`);
  revalidatePath(`/${slug}`);
  revalidatePath(`/${slug}/inscription`);
  return { ok: true };
}

/**
 * Supprimer un cours.
 *
 * `adhesions.cours_id` est en ON DELETE SET NULL : supprimer un cours qui a des adhérents
 * les laisserait sans cours, sans avertissement et sans retour possible. On refuse.
 */
export async function supprimerCours(slug: string, coursId: string) {
  const org = await garde(slug);
  const supabase = createSupabaseServerClient();

  const { count } = await supabase
    .from("adhesions")
    .select("id", { count: "exact", head: true })
    .eq("cours_id", coursId)
    .eq("organisation_id", org.id);

  if ((count ?? 0) > 0) {
    return {
      erreur: `Ce cours compte ${count} adhérent${count! > 1 ? "s" : ""}. Déplacez-les avant de le supprimer.`,
    };
  }

  const { error } = await supabase.from("cours").delete().eq("id", coursId).eq("organisation_id", org.id);
  if (error) {
    console.error("supprimerCours", error.message);
    return { erreur: "La suppression a échoué." };
  }

  revalidatePath(`/${slug}/cockpit/cours`);
  revalidatePath(`/${slug}`);
  return { ok: true };
}

/** Utilisé par le formulaire d'ajout rapide (une seule ligne, sans créneau). */
export async function ajouterCoursSimple(slug: string, formData: FormData) {
  await garde(slug);
  const r = await enregistrerCours(slug, null, {
    nom: String(formData.get("nom") ?? ""),
    public_cible: null,
    tarif_centimes: tarifCentimes(formData.get("tarif")),
    creneaux: [],
  });
  redirect(`/${slug}/cockpit/cours${r.erreur ? "?erreur=1" : "?ok=1"}`);
}
