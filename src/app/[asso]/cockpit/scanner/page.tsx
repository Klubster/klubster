import { normaliserCouleur } from "@/lib/contraste";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Scanner from "./Scanner";

export const dynamic = "force-dynamic";

export interface CoursControle {
  id: string;
  nom: string;
  /** jours des créneaux, en minuscules (« mercredi ») — sert à proposer le cours du jour */
  jours: string[];
}

export default async function Page(props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/scanner`);
  }
  // La liste des cours du club : l'encadrant choisit POUR QUEL COURS il pointe.
  // Les jours de créneaux servent uniquement à proposer un cours par défaut quand
  // c'est sans ambiguïté (un seul cours a un créneau aujourd'hui).
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("cours")
    .select("id, nom, creneaux")
    .eq("organisation_id", org.id)
    .order("ordre");
  const cours: CoursControle[] = (data ?? []).map((c) => ({
    id: c.id as string,
    nom: c.nom as string,
    jours: Array.isArray(c.creneaux)
      ? (c.creneaux as Array<{ jour?: string }>).map((cr) => (cr.jour ?? "").toLowerCase()).filter(Boolean)
      : [],
  }));

  return <Scanner slug={org.slug} nom={org.nom} accent={normaliserCouleur(org.couleur_primaire)} cours={cours} />;
}
