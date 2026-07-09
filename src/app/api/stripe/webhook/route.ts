import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhook, planifierEcheances, getSubscription, bornerEcheances } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const preferredRegion = "cdg1"; // RGPD — exécution en Europe (Paris)

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });

  const event = verifyWebhook(raw, sig, secret);
  if (!event) return NextResponse.json({ error: "Signature invalide." }, { status: 400 });

  const admin = createSupabaseAdminClient();

  // Idempotence — Stripe redélivre les événements (au moins une fois). Sans ce verrou,
  // une redélivrance enregistrerait le règlement en double.
  if (admin && event.id) {
    const { error: verrou } = await admin
      .from("stripe_events")
      .insert({ event_id: event.id, type: event.type });
    if (verrou) {
      // 23505 = violation de clé primaire → événement déjà traité, on acquitte sans rejouer.
      if (verrou.code === "23505") return NextResponse.json({ received: true, duplicate: true });
      // Toute autre erreur : on renvoie 500 pour que Stripe redélivre plus tard.
      console.error("stripe_events", verrou.message);
      return NextResponse.json({ error: "Verrou d’idempotence indisponible." }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as {
      mode?: string;
      subscription?: string;
      amount_total?: number;
      metadata?: { adhesion_id?: string; echeances?: string };
    };
    const adhesionId = obj.metadata?.adhesion_id;

    const echeances = bornerEcheances(obj.metadata?.echeances ?? 1);

    if (obj.mode === "subscription" && echeances > 1) {
      // 1re échéance encaissée → on borne l'abonnement à exactement N prélèvements.
      if (obj.subscription && event.account) {
        try {
          await planifierEcheances(obj.subscription, event.account, echeances);
        } catch (e) {
          console.error("planifierEcheances", e);
        }
      }
      if (adhesionId && admin && typeof obj.amount_total === "number" && obj.amount_total > 0) {
        await admin.rpc("enregistrer_reglement_webhook", {
          p_adhesion_id: adhesionId,
          p_montant_centimes: obj.amount_total,
          p_note: `Échéance 1/${echeances} (Stripe)`,
        });
      }
    } else if (adhesionId && admin) {
      // Paiement en 1 fois : soldé.
      if (typeof obj.amount_total === "number" && obj.amount_total > 0) {
        await admin.rpc("enregistrer_reglement_webhook", {
          p_adhesion_id: adhesionId,
          p_montant_centimes: obj.amount_total,
          p_note: "Paiement en ligne (Stripe)",
        });
      }
      await admin.from("adhesions").update({ statut: "paye" }).eq("id", adhesionId);
    }
  }

  // Échéances 2 à N (prélèvements mensuels suivants).
  if (event.type === "invoice.payment_succeeded" || event.type === "invoice.paid") {
    const obj = event.data.object as {
      subscription?: string;
      amount_paid?: number;
      billing_reason?: string;
    };
    // La 1re facture est déjà comptée via checkout.session.completed.
    if (obj.billing_reason === "subscription_cycle" && obj.subscription && event.account && admin) {
      try {
        const sub = await getSubscription(obj.subscription, event.account);
        const adhesionId = sub.metadata?.adhesion_id;
        const total = bornerEcheances(sub.metadata?.echeances ?? 1);
        if (adhesionId && typeof obj.amount_paid === "number" && obj.amount_paid > 0) {
          // Le rang de l'échéance = nombre de règlements déjà enregistrés + 1.
          const { count } = await admin
            .from("reglements")
            .select("id", { count: "exact", head: true })
            .eq("adhesion_id", adhesionId);
          const rang = (count ?? 0) + 1;

          await admin.rpc("enregistrer_reglement_webhook", {
            p_adhesion_id: adhesionId,
            p_montant_centimes: obj.amount_paid,
            p_note: `Échéance ${rang}/${total} (Stripe)`,
          });
        }
      } catch (e) {
        console.error("webhook invoice", e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
