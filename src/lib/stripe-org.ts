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

/**
 * État d'accès d'un club à l'écriture, dérivé de son abonnement.
 *
 *   ouvert    — usage normal (essai en cours, abonné à jour, ou pas encore d'abonnement :
 *               les clubs pilotes de la première saison offerte sont dans ce dernier cas) ;
 *   sursis    — paiement en retard, mais dans la fenêtre de grâce : tout marche encore,
 *               un bandeau invite à régulariser ;
 *   suspendu  — résilié, ou impayé au-delà de la grâce : lecture et export conservés, mais
 *               plus de nouvelles inscriptions ni de nouvelles écritures. Les données ne
 *               sont JAMAIS supprimées pour un simple impayé.
 *
 * On ne bloque jamais sur `aucun` : un compte qui n'a pas encore démarré d'abonnement
 * (onboarding, ou club pilote en saison offerte) doit rester pleinement utilisable.
 */
export type AccesClub = "ouvert" | "sursis" | "suspendu";

const GRACE_JOURS = 7;

export function accesClub(org: Organisation, maintenant = new Date()): AccesClub {
  const statut = statutAbonnement(org);
  if (statut === "resilie") return "suspendu";
  if (statut !== "impaye") return "ouvert"; // aucun, essai, actif

  // Impayé : fenêtre de grâce à partir de la fin de période (ou de la fin d'essai).
  const base = org.abonnement_periode_fin ?? org.abonnement_essai_fin;
  if (!base) return "sursis"; // pas de date connue : on laisse le bénéfice du doute
  const limite = new Date(base);
  limite.setDate(limite.getDate() + GRACE_JOURS);
  return maintenant > limite ? "suspendu" : "sursis";
}
