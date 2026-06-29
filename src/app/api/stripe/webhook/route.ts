import { type NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook non configuré." }, { status: 400 });

  const event = verifyWebhook(raw, sig, secret);
  if (!event) return NextResponse.json({ error: "Signature invalide." }, { status: 400 });

  if (event.type === "checkout.session.completed") {
    const obj = event.data.object as { metadata?: { adhesion_id?: string } };
    const adhesionId = obj.metadata?.adhesion_id;
    const admin = createSupabaseAdminClient();
    if (adhesionId && admin) {
      await admin.from("adhesions").update({ statut: "paye" }).eq("id", adhesionId);
    }
  }
  return NextResponse.json({ received: true });
}
