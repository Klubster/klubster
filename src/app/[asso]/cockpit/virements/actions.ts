"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createLoginLink } from "@/lib/stripe";
import { compteConnecte } from "@/lib/stripe-org";

/**
 * Ouvre le tableau de bord Stripe du club pour modifier ses coordonnées bancaires.
 * Le RIB ne passe pas par Klubster : c'est une exigence de conformité, pas un choix
 * de confort. Le lien est à usage unique et expire vite.
 */
export async function ouvrirCompteStripe(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/virements`);
  }

  const account = compteConnecte(org);
  if (!account) redirect(`/${slug}/cockpit?stripe=nonconnecte`);

  let url: string | null = null;
  try {
    const lien = await createLoginLink(account);
    url = (lien?.url as string) ?? null;
  } catch (e) {
    console.error("loginLink", e);
  }
  // redirect() lève NEXT_REDIRECT : il doit rester hors du try, sinon le catch l'avale.
  if (!url) redirect(`/${slug}/cockpit/virements?erreur=lien`);
  redirect(url);
}
