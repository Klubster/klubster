import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { peut } from "@/lib/roles";

export const dynamic = "force-dynamic";

/**
 * Consultation d'une pièce de dossier par le club.
 *
 * Le fichier déposé par un adhérent était bien stocké, et son chemin enregistré —
 * mais ce chemin n'était relu nulle part : le club voyait « reçue » sans jamais
 * pouvoir ouvrir le document. La page Fonctionnalités promettait pourtant des
 * documents centralisés et consultables (relevé à l'audit du 21/07/2026).
 *
 * On ne sert jamais le fichier directement et le compartiment reste privé : on
 * délivre une URL signée de courte durée, après avoir vérifié la chaîne complète
 * utilisateur → club → adhérent → pièce.
 */
const DUREE_SIGNATURE = 60; // secondes : le temps d'ouvrir l'onglet, pas de le partager

export async function GET(
  _req: Request,
  props: { params: Promise<{ asso: string; id: string; pieceId: string }> }
) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) return NextResponse.json({ erreur: "Introuvable" }, { status: 404 });

  const profile = await getProfile();
  const memeClub = profile && (profile.organisation_id === org.id || profile.role === "super_admin");
  if (!memeClub) {
    return NextResponse.redirect(new URL(`/connexion?next=/${org.slug}/cockpit`, _req.url));
  }
  // Une pièce de dossier peut contenir une donnée de santé (certificat médical) :
  // trésorier et encadrant n'ont rien à y faire, la matrice de rôles le dit déjà.
  if (!peut(profile.role, "sante")) {
    return NextResponse.redirect(new URL(`/${org.slug}/cockpit?acces=refuse`, _req.url));
  }

  const supabase = await createSupabaseServerClient();

  // La pièce doit appartenir à CET adhérent, lui-même rattaché à CE club : sans cette
  // double condition, un identifiant de pièce d'un autre club suffirait.
  const { data: piece } = await supabase
    .from("pieces_adherent")
    .select("id, chemin, label, cle, adherent_id, organisation_id")
    .eq("id", params.pieceId)
    .eq("adherent_id", params.id)
    .eq("organisation_id", org.id)
    .maybeSingle();

  const chemin = (piece as { chemin: string | null } | null)?.chemin ?? null;
  if (!piece || !chemin) {
    return NextResponse.redirect(
      new URL(`/${org.slug}/cockpit/adherents/${params.id}?erreur=piece_absente`, _req.url)
    );
  }

  const { data: signee, error } = await supabase.storage
    .from("pieces")
    .createSignedUrl(chemin, DUREE_SIGNATURE);

  if (error || !signee?.signedUrl) {
    console.error("consultation piece", error?.message);
    return NextResponse.redirect(
      new URL(`/${org.slug}/cockpit/adherents/${params.id}?erreur=piece_lecture`, _req.url)
    );
  }

  return NextResponse.redirect(signee.signedUrl);
}
