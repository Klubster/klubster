import { stripeModeTest } from "@/lib/stripe";
import type { Organisation } from "@/types/db";

/**
 * Identifiants Stripe d'une organisation, selon le mode courant.
 *
 * En mode test, les `acct_`, `cus_` et `sub_` sont différents de ceux de production.
 * Les stocker au même endroit condamnerait la bascule : un club « connecté » en test
 * apparaîtrait connecté en production, avec un compte qui n'existe pas.
 */
export type StripeTest = {
  account_id?: string | null;
  customer_id?: string | null;
  subscription_id?: string | null;
  statut?: string | null;
};

export function compteConnecte(org: Organisation): string | null {
  if (!stripeModeTest) return org.stripe_account_id;
  return (org.stripe_test as StripeTest | null)?.account_id ?? null;
}

export function clientAbonnement(org: Organisation): string | null {
  if (!stripeModeTest) return org.abonnement_customer_id;
  return (org.stripe_test as StripeTest | null)?.customer_id ?? null;
}

export function statutAbonnement(org: Organisation): string {
  if (!stripeModeTest) return org.abonnement_statut ?? "aucun";
  return (org.stripe_test as StripeTest | null)?.statut ?? "aucun";
}

/** Champs à écrire pour enregistrer un identifiant, dans le bon compartiment. */
export function champsCompteConnecte(org: Organisation, accountId: string): Record<string, unknown> {
  if (!stripeModeTest) return { stripe_account_id: accountId };
  const actuel = (org.stripe_test as StripeTest | null) ?? {};
  return { stripe_test: { ...actuel, account_id: accountId } };
}
