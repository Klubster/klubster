import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhook, planifier3Echeances, getSubscription } from "@/lib/stripe";
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

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as {
      mode?: string;
      subscription?: string;
      amount_total?: number;
      metadata?: { adhesion_id?: string; echeances?: string };
    };
    const adhesionId = obj.metadata?.adhesion_id;

    if (obj.mode === "subscription" && obj.metadata?.echeances === "3") {
      // Paiement en 3 fois : 1re échéance encaissée → on borne l'abonnement à 3 prélèvements.
      if (obj.subscription && event.account) {
        try {
          await planifier3Echeances(obj.subscription, event.account);
        } catch (e) {
          console.error("planifier3Echeances", e);
        }
      }
      if (adhesionId && admin && typeof obj.amount_total === "number" && obj.amount_total > 0) {
        await admin.rpc("enregistrer_reglement_webhook", {
          p_adhesion_id: adhesionId,
          p_montant_centimes: obj.amount_total,
          p_note: "Échéance 1/3 (Stripe)",
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

  // Échéances 2 et 3 du paiement en 3 fois (prélèvements mensuels suivants).
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
        if (adhesionId && typeof obj.amount_paid === "number" && obj.amount_paid > 0) {
          await admin.rpc("enregistrer_reglement_webhook", {
            p_adhesion_id: adhesionId,
            p_montant_centimes: obj.amount_paid,
            p_note: "Échéance (Stripe)",
          });
        }
      } catch (e) {
        console.error("webhook invoice", e);
      }
    }
  }

  return NextResponse.json({ received: true });
}
