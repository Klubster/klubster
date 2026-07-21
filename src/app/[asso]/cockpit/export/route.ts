import { NextResponse } from "next/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { peut } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const preferredRegion = "cdg1";

/**
 * Export CSV des adhérents du club — réversibilité et portabilité (RGPD art. 20).
 * Un club doit pouvoir repartir avec ses données sans rien demander à personne.
 *
 * Réservé aux administrateurs de l'association (ou au super-admin). Aucune donnée
 * de santé n'est exportée : le questionnaire reste dans le dossier de l'adhérent.
 */
function champCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const slug = params.asso;
  const org = await getOrganisationBySlug(slug);
  const profil = await getProfile();

  if (!org || !profil || (profil.organisation_id !== org.id && profil.role !== "super_admin")) {
    // On ne révèle pas l'existence du club à un visiteur non autorisé.
    return new NextResponse("Introuvable.", { status: 404 });
  }
  // Emporter le fichier complet des adhérents — noms, emails, téléphones — n'est pas
  // une lecture ordinaire. Un encadrant ou un accès en lecture seule pouvait le faire
  // en appelant l'URL directement (relevé à l'audit du 21/07/2026).
  if (!peut(profil.role, "adherents_ecriture")) {
    return new NextResponse("Introuvable.", { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("adherents")
    .select("prenom, nom, email, telephone, created_at, adhesions(saison, statut, montant_centimes, mode_paiement, cours(nom))")
    .eq("organisation_id", org.id)
    .order("nom", { ascending: true });

  if (error) {
    console.error("export adherents", error.message);
    return new NextResponse("Export indisponible.", { status: 500 });
  }

  type Adhesion = { saison: string | null; statut: string | null; montant_centimes: number | null; mode_paiement: string | null; cours: { nom: string } | null };
  type Ligne = { prenom: string; nom: string; email: string | null; telephone: string | null; created_at: string; adhesions: Adhesion[] | null };

  const entetes = ["Prénom", "Nom", "Email", "Téléphone", "Inscrit le", "Cours", "Saison", "Statut", "Montant (€)", "Mode de paiement"];
  const lignes = [entetes.map(champCsv).join(";")];

  for (const a of (data ?? []) as unknown as Ligne[]) {
    const adhesions = a.adhesions?.length ? a.adhesions : [null];
    for (const ad of adhesions) {
      lignes.push(
        [
          a.prenom,
          a.nom,
          a.email,
          a.telephone,
          a.created_at?.slice(0, 10),
          ad?.cours?.nom ?? "",
          ad?.saison ?? "",
          ad?.statut ?? "",
          ad?.montant_centimes != null ? (ad.montant_centimes / 100).toFixed(2).replace(".", ",") : "",
          ad?.mode_paiement ?? "",
        ]
          .map(champCsv)
          .join(";")
      );
    }
  }

  // BOM UTF-8 : sans lui, Excel massacre les accents.
  const csv = "﻿" + lignes.join("\n");
  const nomFichier = `adherents-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
