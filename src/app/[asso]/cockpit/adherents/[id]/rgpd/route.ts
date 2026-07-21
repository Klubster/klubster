import { NextResponse } from "next/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peut } from "@/lib/roles";

export const dynamic = "force-dynamic";

// Export RGPD complet d'un adhérent (droit d'accès / portabilité) : toutes ses données
// dans un seul fichier JSON. Réservé au président et au secrétariat.
export async function GET(_req: Request, props: { params: Promise<{ asso: string; id: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    return NextResponse.json({ error: "non autorisé" }, { status: 403 });
  }
  if (!peut(profile.role, "adherents_ecriture")) {
    return NextResponse.json({ error: "non autorisé" }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: adherent } = await supabase
    .from("adherents")
    .select("id, prenom, nom, email, telephone, date_naissance, created_at, infos")
    .eq("id", params.id)
    .eq("organisation_id", org.id)
    .maybeSingle();
  if (!adherent) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const [{ data: adhesions }, { data: pieces }, { data: sante }] = await Promise.all([
    supabase.from("adhesions").select("saison, statut, montant_centimes, mode_paiement, created_at, cours(nom)").eq("adherent_id", params.id),
    supabase.from("pieces_adherent").select("label, statut, created_at").eq("adherent_id", params.id),
    // Le résultat santé fait partie des données de la personne ; le détail des réponses n'existe pas.
    supabase.from("questionnaires_sante").select("type, resultat, signataire_nom, created_at").eq("adherent_id", params.id),
  ]);

  const ids = (adhesions ?? []).length ? undefined : undefined;
  void ids;
  const { data: reglements } = await supabase
    .from("reglements")
    .select("montant_centimes, mode, note, created_at, adhesion:adhesions!inner(adherent_id)")
    .eq("adhesion.adherent_id", params.id);

  const paquet = {
    genere_le: new Date().toISOString(),
    association: org.nom,
    adherent,
    adhesions: adhesions ?? [],
    reglements: (reglements ?? []).map((r) => ({
      montant_centimes: r.montant_centimes,
      mode: r.mode,
      note: r.note,
      created_at: r.created_at,
    })),
    pieces: pieces ?? [],
    questionnaires_sante: sante ?? [],
    note: "Le détail des réponses au questionnaire de santé n'est pas conservé.",
  };

  const nom = `${adherent.prenom}-${adherent.nom}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return new NextResponse(JSON.stringify(paquet, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="donnees-${nom}.json"`,
    },
  });
}
