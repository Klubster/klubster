import { type NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookMulti,
  webhookSecrets,
  planifierEcheances,
  getSubscription,
  bornerEcheances,
  stripeModeTest,
  type StripeEvent,
} from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";
import { compteConnecte } from "@/lib/stripe-org";
import type { Organisation } from "@/types/db";

export const dynamic = "force-dynamic";
export const preferredRegion = "cdg1"; // RGPD — exécution en Europe (Paris)

type ClientAdmin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");
  if (webhookSecrets().length === 0) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });
  }

  // Un même endpoint sert le mode test et le mode production. La vérification renvoie
  // aussi le mode du secret qui a validé la signature, et refuse tout événement dont
  // le `livemode` ne concorde pas : un événement de test ne peut plus être écrit dans
  // les données de production, ni l'inverse.
  const verifie = verifyWebhookMulti(raw, sig);
  if (!verifie) return NextResponse.json({ error: "Signature invalide." }, { status: 400 });
  const { event } = verifie;
  // Le mode courant de l'application doit être celui de l'événement reçu. Sinon la
  // destination Stripe est mal configurée : on refuse plutôt que d'écrire au hasard.
  if (verifie.live === stripeModeTest) {
    console.error("webhook: mode de l'evenement different du mode de l application", {
      id: event.id,
      evenementLive: verifie.live,
      appEnTest: stripeModeTest,
    });
    return NextResponse.json({ error: "Mode incohérent." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    // Sans client admin, on ne peut rien écrire de fiable : on demande une redélivrance.
    return NextResponse.json({ error: "Base indisponible." }, { status: 500 });
  }

  /* ——— Verrou d'idempotence atomique ———
     On « réclame » l'événement via une RPC atomique (INSERT ... ON CONFLICT DO UPDATE ...
     WHERE, verrouillante au niveau de la ligne) : un seul appelant obtient le bail, on
     traite, et on ne passe l'événement `traite` qu'après succès. Deux livraisons
     concurrentes ne peuvent plus traiter le même règlement en double. Un échec renvoie
     500 → Stripe redélivre, et le passage suivant reprend (statut `echoue` ou bail
     expiré). Un `traite` est acquitté sans rien rejouer ; un `occupe` (autre worker en
     cours, bail encore valide) demande une redélivrance plutôt qu'un double traitement. */
  if (event.id) {
    const verrou = await reclamerEvenement(admin, event.id, event.type);
    if (verrou === "traite") return NextResponse.json({ received: true, duplicate: true });
    if (verrou === "occupe") return NextResponse.json({ error: "Déjà en cours de traitement." }, { status: 409 });
    if (verrou === "erreur") return NextResponse.json({ error: "Verrou indisponible." }, { status: 500 });
  }

  try {
    if (!event.account) {
      // Événement de la PLATEFORME (abonnement Klubster), jamais une cotisation d'adhérent.
      const traite = await traiterAbonnement(event, admin);
      if (traite) {
        await marquerTraite(admin, event.id);
        return NextResponse.json({ received: true, abonnement: true });
      }
    } else {
      await traiterCotisation(event, admin);
    }

    await marquerTraite(admin, event.id);
    return NextResponse.json({ received: true });
  } catch (e) {
    // On journalise l'échec ET on renvoie 500 : Stripe rejouera l'événement.
    const msg = e instanceof Error ? e.message : String(e);
    console.error("webhook echec", event.type, msg);
    await marquerEchoue(admin, event.id, msg);
    return NextResponse.json({ error: "Traitement échoué, redélivrance demandée." }, { status: 500 });
  }
}

/* ——— Cotisations d'un club (compte connecté). Toute erreur remonte pour déclencher un rejeu. ——— */
async function traiterCotisation(event: StripeEvent, admin: ClientAdmin): Promise<void> {
  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as {
      mode?: string;
      subscription?: string;
      payment_intent?: string;
      amount_total?: number;
      metadata?: { adhesion_id?: string; echeances?: string };
    };
    const adhesionId = obj.metadata?.adhesion_id;
    if (!adhesionId) return;

    // On refuse d'écrire si le compte connecté à l'origine de l'événement n'est pas
    // celui de l'organisation de l'adhésion : sans ce contrôle, une métadonnée forgée
    // pourrait créditer un paiement sur le club d'un autre.
    await verifierCompte(admin, adhesionId, event.account!);

    const echeances = bornerEcheances(obj.metadata?.echeances ?? 1);

    if (obj.mode === "subscription" && echeances > 1) {
      if (obj.subscription) await planifierEcheances(obj.subscription, event.account!, echeances);
      if (typeof obj.amount_total === "number" && obj.amount_total > 0) {
        await appelerRpc(admin, adhesionId, obj.amount_total, `Échéance 1/${echeances} (Stripe)`, event.id);
      }
    } else if (typeof obj.amount_total === "number" && obj.amount_total > 0) {
      // Paiement en une fois : la RPC enregistre le règlement ET passe l'adhésion « payé »
      // seulement si le total réglé couvre le montant dû. Plus de statut forcé à l'aveugle.
      await appelerRpc(admin, adhesionId, obj.amount_total, "Paiement en ligne (Stripe)", event.id);
      // On mémorise le paiement : c'est lui qu'un remboursement depuis le cockpit ciblera,
      // et c'est par lui qu'on rattache un futur remboursement ou litige à l'adhésion.
      // L'écriture doit réussir : sans ce lien, un remboursement ultérieur ne retrouverait
      // pas l'adhésion. On lève en cas d'échec pour déclencher un rejeu Stripe.
      if (obj.payment_intent) {
        const { error } = await admin.from("adhesions").update({ stripe_payment_intent: obj.payment_intent }).eq("id", adhesionId);
        if (error) throw new Error(`maj payment_intent: ${error.message}`);
      }
    }
    return;
  }

  /* Échéances 2 à N. On n'écoute QUE `invoice.paid` (pas `invoice.payment_succeeded`,
     que Stripe émet aussi sous un autre id d'événement → double comptage). */
  if (event.type === "invoice.paid") {
    const obj = event.data.object as { subscription?: string; amount_paid?: number; billing_reason?: string };
    if (obj.billing_reason === "subscription_cycle" && obj.subscription) {
      const sub = await getSubscription(obj.subscription, event.account!);
      const adhesionId = sub.metadata?.adhesion_id as string | undefined;
      const total = bornerEcheances(sub.metadata?.echeances ?? 1);
      if (adhesionId && typeof obj.amount_paid === "number" && obj.amount_paid > 0) {
        await verifierCompte(admin, adhesionId, event.account!);
        const { count } = await admin
          .from("reglements")
          .select("id", { count: "exact", head: true })
          .eq("adhesion_id", adhesionId);
        const rang = (count ?? 0) + 1;
        await appelerRpc(admin, adhesionId, obj.amount_paid, `Échéance ${rang}/${total} (Stripe)`, event.id);
      }
    }
    return;
  }

  // Échéance rejetée : adhésion « en retard » + emails. L'échec d'email ne fait pas
  // échouer le webhook (sinon rejeu en boucle) : il est isolé dans signalerEcheanceRejetee.
  if (event.type === "invoice.payment_failed") {
    const obj = event.data.object as { subscription?: string; amount_due?: number };
    if (obj.subscription) {
      const sub = await getSubscription(obj.subscription, event.account!);
      const adhesionId = sub.metadata?.adhesion_id as string | undefined;
      if (adhesionId) {
        await verifierCompte(admin, adhesionId, event.account!);
        await signalerEcheanceRejetee(adhesionId, obj.amount_due ?? 0, admin);
      }
    }
    return;
  }

  // Remboursement : règlement négatif, l'adhésion rouvre son solde si elle n'est plus couverte.
  // Le remboursement peut venir du cockpit Klubster OU du tableau de bord Stripe : le webhook
  // reste la seule source qui écrit l'écriture, pour ne jamais compter deux fois.
  if (event.type === "charge.refunded") {
    const obj = event.data.object as {
      amount_refunded?: number;
      payment_intent?: string;
      metadata?: { adhesion_id?: string };
      refunds?: { data?: Array<{ id?: string; amount?: number }> };
    };
    const adhesionId = await resoudreAdhesion(admin, obj.metadata?.adhesion_id, obj.payment_intent);
    // On enregistre le DERNIER remboursement (delta), identifié par son propre id : plusieurs
    // remboursements partiels sur une même charge ne sont donc pas additionnés à tort.
    const dernier = obj.refunds?.data?.[0];
    const montant = dernier?.amount ?? obj.amount_refunded ?? 0;
    const ref = dernier?.id ?? event.id;
    if (adhesionId && montant > 0) {
      await verifierCompte(admin, adhesionId, event.account!);
      const { error } = await admin.rpc("enregistrer_remboursement_webhook", {
        p_adhesion_id: adhesionId,
        p_montant_centimes: montant,
        p_ref: ref,
      });
      if (error) throw new Error(`remboursement: ${error.message}`);
    } else {
      console.warn("charge.refunded sans adhesion_id identifiable", event.id);
    }
    return;
  }

  // Litige (chargeback) ouvert : on prévient le club, on remet l'adhésion « en retard » et on
  // l'horodate comme litige — c'est ce qui la distingue d'un simple impayé dans le cockpit.
  if (event.type === "charge.dispute.created") {
    const obj = event.data.object as { metadata?: { adhesion_id?: string }; amount?: number; payment_intent?: string };
    const adhesionId = await resoudreAdhesion(admin, obj.metadata?.adhesion_id, obj.payment_intent);
    if (adhesionId) {
      await verifierCompte(admin, adhesionId, event.account!);
      await signalerLitige(adhesionId, obj.amount ?? 0, admin);
    } else {
      console.warn("charge.dispute.created sans adhesion_id identifiable", event.id);
    }
    return;
  }

  // Litige clôturé (gagné ou perdu) : le litige n'est plus « en cours ». On lève le drapeau ;
  // le statut de paiement, lui, ne change pas ici (une perte reste un impayé à traiter).
  if (event.type === "charge.dispute.closed") {
    const obj = event.data.object as { metadata?: { adhesion_id?: string }; payment_intent?: string };
    const adhesionId = await resoudreAdhesion(admin, obj.metadata?.adhesion_id, obj.payment_intent);
    if (adhesionId) {
      await verifierCompte(admin, adhesionId, event.account!);
      await admin.from("adhesions").update({ litige_le: null }).eq("id", adhesionId);
    }
  }
}

/**
 * Retrouve l'adhésion visée par un événement de charge (remboursement, litige).
 * D'abord par la métadonnée `adhesion_id` si Stripe la porte, sinon par le
 * `payment_intent` qu'on a mémorisé à l'encaissement — le chemin fiable, car les
 * objets Charge/Dispute ne recopient pas toujours nos métadonnées.
 */
async function resoudreAdhesion(
  admin: ClientAdmin,
  adhesionId: string | undefined,
  paymentIntent: string | undefined
): Promise<string | null> {
  if (adhesionId) return adhesionId;
  if (!paymentIntent) return null;
  const { data } = await admin
    .from("adhesions")
    .select("id")
    .eq("stripe_payment_intent", paymentIntent)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Un litige (chargeback) a été ouvert : l'adhésion repasse « en retard », le club est prévenu. */
async function signalerLitige(adhesionId: string, montantCentimes: number, admin: ClientAdmin) {
  const { data } = await admin
    .from("adhesions")
    .select("adherents(prenom, nom), organisations(nom, email_contact)")
    .eq("id", adhesionId)
    .maybeSingle();
  {
    const { error } = await admin
      .from("adhesions")
      .update({ statut: "en_retard", litige_le: new Date().toISOString() })
      .eq("id", adhesionId);
    if (error) throw new Error(`litige maj statut: ${error.message}`);
  }
  if (!data) return;
  const adherent = data.adherents as unknown as { prenom: string; nom: string } | null;
  const org = data.organisations as unknown as { nom: string; email_contact: string | null } | null;
  if (!org?.email_contact || !adherent) return;
  const montant = (montantCentimes / 100).toFixed(2).replace(".", ",");
  try {
    await envoyerEmail({
      to: org.email_contact,
      objet: `Litige bancaire — ${adherent.prenom} ${adherent.nom}`,
      texte:
        `Un litige (contestation de paiement) de ${montant} € a été ouvert pour ${adherent.prenom} ${adherent.nom}.\n\n` +
        `Son adhésion est repassée « en retard ». Stripe vous contactera pour répondre au litige depuis votre tableau de bord.\n\nklubster.fr`,
    });
  } catch (e) {
    console.error("email litige", e);
  }
}

/** Vérifie que le compte Stripe de l'événement est bien celui de l'organisation de l'adhésion. */
async function verifierCompte(admin: ClientAdmin, adhesionId: string, account: string): Promise<void> {
  const { data } = await admin
    .from("adhesions")
    .select("organisations(id, stripe_account_id, stripe_test)")
    .eq("id", adhesionId)
    .maybeSingle();
  const org = data?.organisations as unknown as Organisation | null;
  if (!org) throw new Error(`adhesion ${adhesionId} sans organisation`);
  const attendu = compteConnecte(org);
  if (!attendu || attendu !== account) {
    throw new Error(`compte Stripe ${account} != compte de l'organisation (${attendu ?? "aucun"})`);
  }
}

/** Appelle la RPC d'enregistrement (idempotente par `p_ref`) et remonte l'erreur pour rejeu. */
async function appelerRpc(admin: ClientAdmin, adhesionId: string, montant: number, note: string, ref?: string): Promise<void> {
  const { error } = await admin.rpc("enregistrer_reglement_webhook", {
    p_adhesion_id: adhesionId,
    p_montant_centimes: montant,
    p_note: note,
    p_ref: ref ?? null,
  });
  if (error) throw new Error(`enregistrer_reglement_webhook: ${error.message}`);
}

/* ——— Verrou d'idempotence : primitives ——— */

async function reclamerEvenement(
  admin: ClientAdmin,
  eventId: string,
  type: string | undefined
): Promise<"nouveau" | "traite" | "occupe" | "erreur"> {
  // Un seul appel atomique décide qui obtient le bail (voir migration 0005).
  const { data, error } = await admin.rpc("claim_stripe_event", {
    p_event_id: eventId,
    p_type: type ?? null,
    p_lease_seconds: 120,
  });
  if (error) {
    console.error("claim_stripe_event", error.message);
    return "erreur";
  }
  const statut = String(data);
  if (statut === "traite") return "traite";
  if (statut === "occupe") return "occupe";
  return "nouveau";
}

async function marquerTraite(admin: ClientAdmin, eventId: string | undefined): Promise<void> {
  if (!eventId) return;
  await admin.from("stripe_events").update({ statut: "traite", traite_le: new Date().toISOString() }).eq("event_id", eventId);
}

async function marquerEchoue(admin: ClientAdmin, eventId: string | undefined, erreur: string): Promise<void> {
  if (!eventId) return;
  await admin.from("stripe_events").update({ statut: "echoue", derniere_erreur: erreur.slice(0, 500) }).eq("event_id", eventId);
}

/**
 * Un prélèvement d'échéance a été refusé.
 *
 * On marque l'adhésion « en retard » et on prévient les deux personnes concernées :
 * l'adhérent, qui peut corriger sa carte, et le club, qui doit le savoir. Un échec
 * d'envoi d'email ne doit jamais faire échouer le webhook : Stripe rejouerait
 * l'événement, et le statut serait réécrit en boucle.
 */
async function signalerEcheanceRejetee(adhesionId: string, montantCentimes: number, admin: ClientAdmin) {
  const { data } = await admin
    .from("adhesions")
    .select("id, adherents(prenom, nom, email), organisations(nom, email_contact)")
    .eq("id", adhesionId)
    .maybeSingle();

  {
    const { error } = await admin.from("adhesions").update({ statut: "en_retard" }).eq("id", adhesionId);
    if (error) throw new Error(`échéance rejetée maj statut: ${error.message}`);
  }

  if (!data) return;
  const adherent = data.adherents as unknown as { prenom: string; nom: string; email: string | null } | null;
  const org = data.organisations as unknown as { nom: string; email_contact: string | null } | null;
  if (!adherent || !org) return;

  const montant = (montantCentimes / 100).toFixed(2).replace(".", ",");
  const qui = `${adherent.prenom} ${adherent.nom}`;

  try {
    if (adherent.email) {
      await envoyerEmail({
        to: adherent.email,
        fromNom: org.nom,
        replyTo: org.email_contact,
        objet: `Votre prélèvement de ${montant} € n’a pas abouti`,
        texte:
          `Bonjour ${adherent.prenom},\n\n` +
          `Le prélèvement de votre cotisation (${montant} €) auprès de ${org.nom} a été refusé par votre banque.\n\n` +
          `Il ne s’agit pas nécessairement d’une erreur de votre part : plafond atteint, carte expirée, opposition. ` +
          `Vous pouvez mettre à jour votre moyen de paiement ou vous rapprocher de votre association.\n\n` +
          `— ${org.nom}`,
      });
    }
    if (org.email_contact) {
      await envoyerEmail({
        to: org.email_contact,
        objet: `Échéance rejetée — ${qui}`,
        texte:
          `Le prélèvement de ${montant} € de ${qui} a été refusé.\n\n` +
          `Son adhésion est passée en « en retard » dans votre cockpit.` +
          (adherent.email ? ` Il a été prévenu par email.` : ` Il n’a pas d’email : prévenez-le.`) +
          `\n\nklubster.fr`,
      });
    }
  } catch (e) {
    console.error("email echeance rejetee", e);
  }
}

/**
 * Événements de l'abonnement Klubster (compte plateforme).
 * Renvoie true si l'événement a été traité ici — pour ne pas le laisser filer vers
 * la logique des cotisations, qui l'interpréterait comme un règlement d'adhérent.
 */
async function traiterAbonnement(event: StripeEvent, admin: ClientAdmin): Promise<boolean> {
  // En mode test, tout vit dans `stripe_test` : un abonnement de test ne doit jamais
  // faire croire, en production, qu'un club est à jour de ses paiements.
  const majParSubscription = async (subscriptionId: string, champs: Record<string, unknown>) => {
    if (stripeModeTest) {
      const { data } = await admin
        .from("organisations")
        .select("id, stripe_test")
        .eq("stripe_test->>subscription_id", subscriptionId)
        .maybeSingle();
      if (!data) return;
      const actuel = (data.stripe_test as Record<string, unknown>) ?? {};
      const { error } = await admin
        .from("organisations")
        .update({ stripe_test: { ...actuel, ...champs } })
        .eq("id", data.id);
      // On lève l'erreur au lieu de la journaliser : sinon l'événement était marqué
      // « traité » alors que l'état de l'abonnement du club n'avait pas été écrit. Un
      // throw fait renvoyer 500 au webhook, et Stripe redélivre (audit du 21/07/2026).
      if (error) throw new Error(`abonnement test maj: ${error.message}`);
      return;
    }
    const { error } = await admin
      .from("organisations")
      .update(champs)
      .eq("abonnement_subscription_id", subscriptionId);
    if (error) throw new Error(`abonnement maj: ${error.message}`);
  };

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as {
      mode?: string;
      subscription?: string;
      customer?: string;
      metadata?: { organisation_id?: string };
    };
    const orgId = obj.metadata?.organisation_id;
    if (obj.mode !== "subscription" || !orgId) return false;

    if (stripeModeTest) {
      const { data } = await admin.from("organisations").select("stripe_test").eq("id", orgId).maybeSingle();
      const actuel = (data?.stripe_test as Record<string, unknown>) ?? {};
      await admin
        .from("organisations")
        .update({
          stripe_test: {
            ...actuel,
            customer_id: obj.customer ?? null,
            subscription_id: obj.subscription ?? null,
            statut: "essai",
          },
        })
        .eq("id", orgId);
      return true;
    }

    await admin
      .from("organisations")
      .update({
        abonnement_customer_id: obj.customer ?? null,
        abonnement_subscription_id: obj.subscription ?? null,
        abonnement_statut: "essai",
      })
      .eq("id", orgId);
    return true;
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const obj = event.data.object as {
      id?: string;
      status?: string;
      trial_end?: number | null;
      current_period_end?: number | null;
    };
    if (!obj.id) return false;

    // Vocabulaire Stripe → vocabulaire Klubster.
    const statut =
      event.type === "customer.subscription.deleted" || obj.status === "canceled"
        ? "resilie"
        : obj.status === "trialing"
          ? "essai"
          : obj.status === "active"
            ? "actif"
            : obj.status === "past_due" || obj.status === "unpaid"
              ? "impaye"
              : "aucun";

    await majParSubscription(
      obj.id,
      stripeModeTest
        ? { statut }
        : {
            abonnement_statut: statut,
            abonnement_essai_fin: obj.trial_end ? new Date(obj.trial_end * 1000).toISOString() : null,
            abonnement_periode_fin: obj.current_period_end
              ? new Date(obj.current_period_end * 1000).toISOString()
              : null,
          }
    );
    return true;
  }

  if (event.type === "invoice.payment_failed") {
    const obj = event.data.object as { subscription?: string };
    if (!obj.subscription) return false;
    await majParSubscription(obj.subscription, stripeModeTest ? { statut: "impaye" } : { abonnement_statut: "impaye" });
    return true;
  }

  if (event.type === "invoice.paid" || event.type === "invoice.payment_succeeded") {
    const obj = event.data.object as { subscription?: string; billing_reason?: string };
    // Facture d'abonnement Klubster : Stripe l'envoie au club, nous notons seulement l'état.
    if (!obj.subscription) return false;
    await majParSubscription(obj.subscription, stripeModeTest ? { statut: "actif" } : { abonnement_statut: "actif" });
    return true;
  }

  return false;
}
