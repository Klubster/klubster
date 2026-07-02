"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTemplate, getMode } from "@/lib/themes";

export interface CoursInput {
  nom: string;
  public_cible: string | null;
  tarif_centimes: number;
}

export interface CreerInput {
  nom: string;
  template: string;
  mode: string;
  couleur: string;
  adresse?: string;
  email?: string;
  tel?: string;
  cours: CoursInput[];
  accepteCGV?: boolean;
}

export async function creerClub(input: CreerInput) {
  const nom = (input.nom ?? "").trim();
  if (!nom) throw new Error("Le nom est requis.");
  if (!input.accepteCGV) throw new Error("Vous devez accepter les CGV et le contrat de sous-traitance.");

  const slugBase = nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
  const cours = (input.cours ?? [])
    .filter((c) => (c.nom ?? "").trim())
    .slice(0, 30)
    .map((c) => ({
      nom: c.nom.trim().slice(0, 120),
      public_cible: c.public_cible?.trim() || null,
      tarif_centimes: Number.isFinite(c.tarif_centimes) ? Math.max(0, Math.round(c.tarif_centimes)) : 0,
      creneaux: [],
    }));

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_club", {
    p_nom: nom,
    p_template: getTemplate(input.template).id,
    p_mode: getMode(input.mode),
    p_couleur: input.couleur,
    p_adresse: input.adresse ?? "",
    p_email: input.email ?? "",
    p_tel: input.tel ?? "",
    p_accroche: "Une association ouverte à toutes et à tous.",
    p_slug_base: slugBase,
    p_cours: cours,
  });

  if (error || !data) {
    console.error("creerClub", error?.message);
    throw new Error(error?.message ?? "Création impossible.");
  }
  redirect(`/${data as string}`);
}
