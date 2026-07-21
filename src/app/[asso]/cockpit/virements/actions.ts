"use server";
import { redirect } from "next/navigation";
import { exigerPermission } from "@/lib/garde";
import { createLoginLink } from "@/lib/stripe";
import { compteConnecte } from "@/lib/stripe-org";

/**
 * Ouvre le tableau de bord Stripe du club pour modifier ses coordonnées bancaires.
 * Le RIB ne passe pas par Klubster : c'est une exigence de conformité, pas un choix
 * de confort. Le lien est à usage unique et expire vite.
 */
export async function ouvrirCompteStripe(slug: string) {
  // Le tableau de bord Stripe donne accès aux virements et aux coordonnées bancaires
  // du club : permission « paiements ». Aucune table n'étant touchée ici, aucune
  // politique de base ne pouvait servir de garde-fou.
  const { org } = await exigerPermission(slug, "paiements");

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
