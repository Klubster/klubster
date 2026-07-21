import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { peut, type Action } from "@/lib/roles";
import type { Organisation } from "@/types/db";
import type { Profile } from "@/lib/auth";

/**
 * Garde d'accès des actions serveur.
 *
 * Jusqu'au 21/07/2026, la plupart des actions ne vérifiaient qu'une chose : que la
 * personne appartenait bien au club. Le rôle, lui, ne servait qu'à masquer des boutons
 * dans l'interface. Un « lecture seule » ou un encadrant pouvait donc appeler
 * directement l'action — envoyer un message à tous les adhérents, exporter la liste,
 * modifier le formulaire d'inscription — puisque rien côté serveur ne l'en empêchait.
 *
 * Une politique RLS ne suffit pas à couvrir ces cas : envoyer un email par Resend ou
 * ouvrir un portail Stripe ne passe par aucune table. Le contrôle doit donc vivre ici,
 * dans le même mouvement que l'action, et non seulement dans la base.
 *
 * Usage :
 *   const { org, supabase } = await exigerPermission(slug, "messages");
 *   const { org } = await exigerPresident(slug);
 */

export interface Contexte {
  org: Organisation;
  profile: Profile;
}

async function base(slug: string, retour: string): Promise<Contexte> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile) redirect(`/connexion?next=${encodeURIComponent(retour)}`);
  // Cloisonnement entre clubs : inchangé, il tenait déjà.
  if (profile.organisation_id !== org.id && profile.role !== "super_admin") {
    redirect(`/connexion?next=${encodeURIComponent(retour)}`);
  }
  return { org, profile };
}

/** Exige une permission précise de la matrice des rôles (lib/roles.ts). */
export async function exigerPermission(slug: string, action: Action): Promise<Contexte> {
  const ctx = await base(slug, `/${slug}/cockpit`);
  if (!peut(ctx.profile.role, action)) {
    redirect(`/${slug}/cockpit?acces=refuse`);
  }
  return ctx;
}

/** Réservé au président (et à l'éditeur) : équipe, abonnement, identité du club. */
export async function exigerPresident(slug: string): Promise<Contexte> {
  const ctx = await base(slug, `/${slug}/cockpit`);
  if (ctx.profile.role !== "admin_asso" && ctx.profile.role !== "super_admin") {
    redirect(`/${slug}/cockpit?acces=refuse`);
  }
  return ctx;
}

/** Appartenance au club seulement — pour les lectures ouvertes à toute l'équipe. */
export async function exigerMembre(slug: string): Promise<Contexte> {
  return base(slug, `/${slug}/cockpit`);
}

/**
 * Même contrôle, mais sans redirection : pour les actions appelées depuis un composant
 * client, qui renvoient `{ error }` et affichent le message à l'écran plutôt que de
 * dérouter la navigation en pleine saisie.
 */
export async function verifierPermission(slug: string, action: Action): Promise<Contexte | null> {
  const org = await getOrganisationBySlug(slug);
  if (!org) return null;
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.organisation_id !== org.id && profile.role !== "super_admin") return null;
  if (!peut(profile.role, action)) return null;
  return { org, profile };
}
