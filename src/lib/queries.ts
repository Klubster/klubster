import { createSupabaseServerClient } from "@/lib/supabase/server";
import { STATUTS_PIECE_FOURNIE, STATUT_PIECE_MANQUANTE } from "@/lib/pieces";
import type { Organisation, Cours, ActualiteEntree } from "@/types/db";

// Charge une association publiée par son slug (ex. "usmboxe").
// La lecture publique est autorisée par la politique RLS "publie = true".
export async function getOrganisationBySlug(slug: string): Promise<Organisation | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("slug", slug)
    .eq("publie", true)
    .maybeSingle();
  if (error) {
    console.error("getOrganisationBySlug", error.message);
    return null;
  }
  return data as Organisation | null;
}

// Colonnes de vitrine, lisibles par un visiteur non connecté. On EXCLUT les identifiants
// internes d'abonnement (`abonnement_customer_id`, `abonnement_subscription_id`) et les
// préférences d'emails du club (`emails_config`) : un visiteur anonyme n'en a jamais
// besoin, et ils n'ont pas à sortir via l'API publique (4e audit). `stripe_account_id`
// et `stripe_test` restent lus : le formulaire public en dépend (mode de paiement,
// checkout sur le compte connecté du club).
const COLONNES_ORG_PUBLIQUES =
  "id, slug, nom, sport, logo_url, couleur_primaire, adresse, email_contact, telephone, " +
  "stripe_account_id, abonnement_plan, publie, created_at, accroche, presentation, infos_pratiques, " +
  "form_config, actualite, theme_template, theme_mode, page_config, domaine_custom, echeances_max, " +
  "abonnement_statut, abonnement_essai_fin, abonnement_periode_fin, stripe_test, saison_debut, saison_fin";

/**
 * Variante PUBLIQUE de `getOrganisationBySlug` pour les pages accessibles sans connexion
 * (vitrine, inscription, manifest, installer…). Elle ne lit que les colonnes de vitrine :
 * les colonnes internes retirées à `anon` en base (migration 0015) feraient échouer un
 * `select("*")` anonyme. Le cockpit, lui, reste sur `getOrganisationBySlug` (authentifié,
 * accès complet).
 */
export async function getOrganisationPubliqueBySlug(slug: string): Promise<Organisation | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisations")
    .select(COLONNES_ORG_PUBLIQUES)
    .eq("slug", slug)
    .eq("publie", true)
    .maybeSingle();
  if (error) {
    console.error("getOrganisationPubliqueBySlug", error.message);
    return null;
  }
  // Les 3 colonnes internes absentes ne sont jamais lues par les pages publiques.
  return data as unknown as Organisation | null;
}

export async function getCoursByOrganisation(organisationId: string): Promise<Cours[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cours")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("ordre", { ascending: true });
  if (error) {
    console.error("getCoursByOrganisation", error.message);
    return [];
  }
  return (data ?? []) as Cours[];
}

// Fil d'actualités du club, la plus récente d'abord (date de publication, puis date de
// saisie pour départager deux actus publiées le même jour). Lecture publique (RLS).
export async function getActualites(organisationId: string, limit = 3): Promise<ActualiteEntree[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("actualites")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("publie_le", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getActualites", error.message);
    return [];
  }
  return (data ?? []) as ActualiteEntree[];
}

// Une actualité précise — TOUJOURS filtrée par organisation : une actu d'un autre club
// répond 404, même avec un id valide.
export async function getActualite(organisationId: string, id: string): Promise<ActualiteEntree | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("actualites")
    .select("*")
    .eq("organisation_id", organisationId)
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getActualite", error.message);
    return null;
  }
  return data as ActualiteEntree | null;
}

export interface CockpitStats {
  equipage: number;
  enAttente: number;
  enRetard: number;
  paye: number;
  tresorerieCentimes: number;
}

// Agrégats du Cockpit via une fonction SECURITY DEFINER (aucune donnée personnelle exposée).
export async function getCockpitStats(slug: string): Promise<CockpitStats> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cockpit_stats", { p_slug: slug });
  const row = (data as Array<Record<string, number>> | null)?.[0];
  if (error || !row) {
    if (error) console.error("getCockpitStats", error.message);
    return { equipage: 0, enAttente: 0, enRetard: 0, paye: 0, tresorerieCentimes: 0 };
  }
  return {
    equipage: row.equipage,
    enAttente: row.en_attente,
    enRetard: row.en_retard,
    paye: row.paye,
    tresorerieCentimes: Number(row.tresorerie_centimes),
  };
}

/* ——— « Aujourd'hui_ » : le club en un coup d'œil (données réelles uniquement) ——— */

export interface EvenementClub {
  ts: string; // ISO
  type: "inscription" | "presence" | "piece";
  texte: string;
}

export interface Aujourdhui {
  nouvelles7j: number;
  piecesAttendues: number;
  /** Nombre d'ADHÉRENTS dont au moins une pièce manque — pas le nombre de pièces. */
  dossiersIncomplets: number;
  evenements: EvenementClub[];
}

// prenom/nom depuis une jointure Supabase (objet ou tableau selon la relation).
function nomDe(rel: unknown): string {
  const a = Array.isArray(rel) ? rel[0] : rel;
  if (a && typeof a === "object" && "prenom" in a) {
    const p = a as { prenom: string | null; nom: string | null };
    return [p.prenom, p.nom].filter(Boolean).join(" ") || "Un adhérent";
  }
  return "Un adhérent";
}

export async function getAujourdhui(organisationId: string): Promise<Aujourdhui> {
  const supabase = await createSupabaseServerClient();
  const depuis7j = new Date(Date.now() - 7 * 86400_000).toISOString();

  const [adh, pres, pieces, nouvelles, attendues] = await Promise.all([
    supabase
      .from("adhesions")
      .select("created_at, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("presences")
      .select("created_at, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("pieces_adherent")
      // STATUT_PIECE_FOURNIE, pas « attendue » ni « recue » : la contrainte de la table
      // n'accepte que 'manquante' | 'fournie' | 'par_email'. Le filtre précédent portait
      // sur une valeur qui n'existe nulle part — il ne retirait donc jamais rien, et le
      // fil d'activité annonçait « Pièce déposée » pour des pièces encore manquantes.
      .select("updated_at, label, statut, adherents(prenom, nom)")
      .eq("organisation_id", organisationId)
      .in("statut", [...STATUTS_PIECE_FOURNIE])
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase
      .from("adhesions")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .gte("created_at", depuis7j),
    // Pièces encore manquantes, avec leur adhérent : le président a besoin du nombre de
    // DOSSIERS à relancer, pas du nombre de documents — quatre pièces manquantes chez la
    // même famille, c'est un seul appel à passer.
    supabase
      .from("pieces_adherent")
      .select("adherent_id")
      .eq("organisation_id", organisationId)
      .eq("statut", STATUT_PIECE_MANQUANTE),
  ]);

  const evenements: EvenementClub[] = [
    ...(adh.data ?? []).map((r) => ({
      ts: r.created_at as string,
      type: "inscription" as const,
      texte: `Inscription — ${nomDe(r.adherents)}`,
    })),
    ...(pres.data ?? []).map((r) => ({
      ts: r.created_at as string,
      type: "presence" as const,
      texte: `Présence pointée — ${nomDe(r.adherents)}`,
    })),
    ...(pieces.data ?? []).map((r) => ({
      ts: (r.updated_at ?? "") as string,
      type: "piece" as const,
      texte: `Pièce déposée — ${r.label ?? "document"} (${nomDe(r.adherents)})`,
    })),
  ]
    .filter((e) => e.ts)
    .sort((a, b) => (a.ts < b.ts ? 1 : -1))
    .slice(0, 9);

  const lignesManquantes = (attendues.data ?? []) as { adherent_id: string }[];
  const adherentsIncomplets = new Set(lignesManquantes.map((p) => p.adherent_id));

  return {
    nouvelles7j: nouvelles.count ?? 0,
    piecesAttendues: lignesManquantes.length,
    dossiersIncomplets: adherentsIncomplets.size,
    evenements,
  };
}

/* ——— Remplissage des cours : capacité réelle vs places occupées ——— */

export interface RemplissageCours {
  id: string;
  nom: string;
  placesMax: number | null;
  occupees: number;
}

/**
 * Occupation par cours. Seules les adhésions qui occupent réellement une place sont
 * comptées : une adhésion annulée ou remboursée libère la sienne — la compter revenait
 * à déclarer un cours complet alors que deux places étaient disponibles.
 */
export const STATUTS_OCCUPANT_UNE_PLACE = ["en_attente", "paye", "en_retard"] as const;

export async function getRemplissageCours(organisationId: string): Promise<RemplissageCours[]> {
  const supabase = await createSupabaseServerClient();
  const [coursRes, adhRes] = await Promise.all([
    supabase.from("cours").select("id, nom, places_max").eq("organisation_id", organisationId).order("ordre"),
    supabase
      .from("adhesions")
      .select("cours_id")
      .eq("organisation_id", organisationId)
      .in("statut", [...STATUTS_OCCUPANT_UNE_PLACE]),
  ]);

  const occupation = new Map<string, number>();
  for (const a of (adhRes.data ?? []) as { cours_id: string | null }[]) {
    if (!a.cours_id) continue;
    occupation.set(a.cours_id, (occupation.get(a.cours_id) ?? 0) + 1);
  }

  return ((coursRes.data ?? []) as { id: string; nom: string; places_max: number | null }[]).map((c) => ({
    id: c.id,
    nom: c.nom,
    placesMax: c.places_max,
    occupees: occupation.get(c.id) ?? 0,
  }));
}

/** Litiges bancaires ouverts (chargebacks). Passe par la vue qui vérifie le rôle en base. */
export async function getLitigesOuverts(organisationId: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count, error } = await supabase
    .from("adhesions_finance")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", organisationId)
    .not("litige_le", "is", null);
  if (error) {
    // Un rôle sans accès à la finance n'est pas une panne : zéro litige visible, point.
    console.error("getLitigesOuverts", error.message);
    return 0;
  }
  return count ?? 0;
}

/**
 * Identifiants des adhérents ayant une adhésion créée dans les N derniers jours.
 * Vit ici plutôt que dans la page : `Date.now()` appelé pendant le rendu d'un composant
 * serveur est une fonction impure, et ESLint le refuse à juste titre.
 */
export async function getAdherentsRecents(organisationId: string, jours: number): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const depuis = new Date(Date.now() - jours * 86400_000).toISOString();
  const { data } = await supabase
    .from("adhesions")
    .select("adherent_id")
    .eq("organisation_id", organisationId)
    .gte("created_at", depuis);
  return [...new Set(((data ?? []) as { adherent_id: string }[]).map((x) => x.adherent_id))];
}
