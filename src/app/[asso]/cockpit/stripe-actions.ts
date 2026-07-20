"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createConnectedAccount,
  createAccountLink,
  stripeConfigured,
  bornerEcheances,
  createAbonnementCheckout,
  createPortalSession,
  palierPourEffectif,
  trouverCodePromo,
} from "@/lib/stripe";
import { compteConnecte, champsCompteConnecte, clientAbonnement } from "@/lib/stripe-org";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

/**
 * Le club fixe le nombre maximal de mensualités proposées à ses adhérents (1 à 12).
 * L'adhérent choisira ensuite librement dans cette limite.
 */
export async function definirEcheancesMax(slug: string, formData: FormData) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }

  const max = bornerEcheances(formData.get("echeances_max"));
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ echeances_max: max }).eq("id", org.id);
  if (error) {
    console.error("echeances_max", error.message);
    redirect(`/${slug}/cockpit?stripe=erreur`);
  }
  redirect(`/${slug}/cockpit?stripe=echeances`);
}

/**
 * Souscrire à l'abonnement Klubster — premier mois offert.
 * Le palier est calculé sur l'effectif réel du club : personne ne choisit son prix.
 */
export async function souscrireAbonnement(slug: string, formData?: FormData) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }
  if (!stripeConfigured()) redirect(`/${slug}/cockpit?abonnement=nonconfig`);

  // Code promo saisi dans le cockpit (jamais sur la page de paiement) :
  // résolu ici, appliqué d'office au checkout. Un code inconnu bloque AVANT
  // de partir chez Stripe — le président n'a pas de mauvaise surprise là-bas.
  const codeSaisi = String(formData?.get("code") ?? "").trim();
  let promotionCodeId: string | null = null;
  if (codeSaisi) {
    try {
      promotionCodeId = await trouverCodePromo(codeSaisi);
    } catch (e) {
      console.error("code promo", e);
    }
    if (!promotionCodeId) redirect(`/${slug}/cockpit?abonnement=codeinconnu`);
  }

  const supabase = createSupabaseServerClient();
  const { count } = await supabase
    .from("adherents")
    .select("id", { count: "exact", head: true })
    .eq("organisation_id", org.id);

  let url: string | null = null;
  try {
    const session = await createAbonnementCheckout({
      promotionCodeId,
      organisationId: org.id,
      organisationNom: org.nom,
      palier: palierPourEffectif(count ?? 0),
      email: profile.email ?? org.email_contact,
      customerId: clientAbonnement(org),
      successUrl: `${BASE}/${slug}/cockpit?abonnement=ok`,
      cancelUrl: `${BASE}/${slug}/cockpit?abonnement=annule`,
    });
    url = (session?.url as string) ?? null;
  } catch (e) {
    console.error("abonnement checkout", e);
  }
  // redirect() lève NEXT_REDIRECT : il doit rester hors du try, sinon le catch l'avale.
  if (!url) redirect(`/${slug}/cockpit?abonnement=erreur`);
  redirect(url);
}

/** Portail Stripe : factures, moyen de paiement, résiliation. */
export async function gererAbonnement(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }
  const client = clientAbonnement(org);
  if (!client) redirect(`/${slug}/cockpit?abonnement=aucun`);

  let url: string | null = null;
  try {
    const session = await createPortalSession(client, `${BASE}/${slug}/cockpit`);
    url = (session?.url as string) ?? null;
  } catch (e) {
    console.error("portail abonnement", e);
  }
  if (!url) redirect(`/${slug}/cockpit?abonnement=erreur`);
  redirect(url);
}

export async function connecterStripe(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }
  if (!stripeConfigured()) redirect(`/${slug}/cockpit?stripe=nonconfig`);

  const supabase = createSupabaseServerClient();
  let url: string | null = null;

  // Stripe refuse la création de compte tant que Connect n'est pas activé sur la
  // plateforme. Sans ce filet, le président voit « Application error » : un écran
  // qui ne lui apprend rien et qu'il ne peut pas corriger.
  try {
    let acct = compteConnecte(org);
    if (!acct) {
      const account = await createConnectedAccount(org.email_contact, {
        nom: org.nom,
        url: org.domaine_custom ? `https://${org.domaine_custom}` : `${BASE}/${org.slug}`,
      });
      acct = account.id as string;
      // Écrit dans le compartiment du mode courant : un compte de test ne doit
      // jamais apparaître comme un compte de production.
      await supabase.from("organisations").update(champsCompteConnecte(org, acct)).eq("id", org.id);
    }
    const link = await createAccountLink(acct, `${BASE}/${slug}/cockpit`, `${BASE}/${slug}/cockpit?stripe=ok`);
    url = (link.url as string) ?? null;
  } catch (e) {
    console.error("connecterStripe", e);
  }

  // redirect() lève NEXT_REDIRECT : il doit rester hors du try, sinon le catch l'avale.
  if (!url) redirect(`/${slug}/cockpit?stripe=erreur`);
  redirect(url);
}
