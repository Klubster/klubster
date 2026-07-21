import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  organisation_id: string | null;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  role: string;
}

export async function getUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

/**
 * Où atterrit quelqu'un qui vient de se connecter, sans `?next=` explicite.
 *
 * La valeur par défaut était `/creer`, l'assistant de création d'association. Un
 * président qui gère déjà son club se retrouvait donc, à chaque connexion, devant un
 * formulaire de création — et l'assistant y restaurait son brouillon local, jusqu'à lui
 * présenter un club fantôme portant un nom de test. C'est ce mécanisme qui a produit une
 * association parasite publiée par erreur (constaté le 21/07/2026).
 *
 * Désormais : on renvoie chacun chez soi. `/creer` reste la destination des seuls
 * comptes qui n'ont effectivement aucune association.
 */
export async function destinationApresConnexion(): Promise<string> {
  const profile = await getProfile();
  if (!profile) return "/connexion";
  if (!profile.organisation_id) {
    // Un adhérent sans organisation n'a rien à faire dans l'assistant de création.
    return profile.role === "adherent" ? "/" : "/creer";
  }

  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase
    .from("organisations")
    .select("slug")
    .eq("id", profile.organisation_id)
    .maybeSingle();

  // Organisation introuvable (supprimée entre-temps) : mieux vaut l'assistant qu'une 404.
  const slug = (org as { slug: string } | null)?.slug;
  if (!slug) return "/creer";

  return profile.role === "adherent" ? `/${slug}/espace` : `/${slug}/cockpit`;
}
