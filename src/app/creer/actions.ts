"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEMPLATES_COURS, SPORTS } from "@/lib/templates";

export interface CreerInput {
  nom: string;
  sport: string;
  couleur: string;
  adresse?: string;
  email?: string;
  tel?: string;
}

export async function creerClub(input: CreerInput) {
  const nom = (input.nom ?? "").trim();
  if (!nom) throw new Error("Le nom est requis.");

  const slugBase = nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
  const cours = TEMPLATES_COURS[input.sport] ?? TEMPLATES_COURS["autre"];
  const sportLabel = SPORTS.find((s) => s.id === input.sport)?.label ?? "Association";
  const accroche = `${sportLabel.replace(/^(Club de |École de )/, "")} pour tous.`;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_club", {
    p_nom: nom,
    p_sport: input.sport,
    p_couleur: input.couleur,
    p_adresse: input.adresse ?? "",
    p_email: input.email ?? "",
    p_tel: input.tel ?? "",
    p_accroche: accroche,
    p_slug_base: slugBase,
    p_cours: cours,
  });

  if (error || !data) {
    console.error("creerClub", error?.message);
    throw new Error(error?.message ?? "Création impossible.");
  }
  redirect(`/${data as string}`);
}
