import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Réponse de Mathieu depuis Telegram → écrite dans la bonne conversation.
// Appelée UNIQUEMENT par le bot du VPS (klubster_bot), authentifiée par un secret
// partagé. La clé service-role reste sur Vercel : le VPS ne l'a jamais.
export async function POST(req: NextRequest) {
  const secret = process.env.CHAT_TELEGRAM_SECRET;
  if (!secret || req.headers.get("x-chat-secret") !== secret) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: { tag?: string; corps?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const tag = (body.tag ?? "").trim();
  const corps = (body.corps ?? "").trim().slice(0, 4000);
  const m = tag.match(/^#([vc]):([0-9a-fA-F-]{36})$/);
  if (!m || !corps) {
    return NextResponse.json({ ok: false, error: "bad_tag" }, { status: 400 });
  }
  const [, type, convId] = m;

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false, error: "no_admin" }, { status: 500 });

  const now = new Date().toISOString();

  if (type === "v") {
    // Chat public du site.
    const { data: conv } = await admin
      .from("site_chat_conversations")
      .select("id, non_lus_visiteur")
      .eq("id", convId)
      .maybeSingle();
    if (!conv) return NextResponse.json({ ok: false, error: "conv_introuvable" }, { status: 404 });
    // ⚠️ Une réponse qui n'atteint pas la base doit être ANNONCÉE au bot : sinon
    // Mathieu voit son message parti depuis Telegram, le visiteur n'a jamais rien
    // reçu, et personne ne l'apprend (revue externe du 26/08/2026).
    const { error: eMsg } = await admin
      .from("site_chat_messages")
      .insert({ conversation_id: convId, sender: "operateur", corps });
    if (eMsg) {
      console.error("chat reply (visiteur) : message non enregistré", eMsg.message);
      return NextResponse.json({ ok: false, error: "ecriture_refusee" }, { status: 500 });
    }
    const { error: eConv } = await admin
      .from("site_chat_conversations")
      .update({
        dernier_sender: "operateur",
        dernier_at: now,
        statut: "ouvert",
        non_lus_visiteur: ((conv as { non_lus_visiteur: number }).non_lus_visiteur ?? 0) + 1,
      })
      .eq("id", convId);
    if (eConv) console.error("chat reply (visiteur) : entête de conversation", eConv.message);
    return NextResponse.json({ ok: true, cible: "visiteur" });
  }

  // type === "c" : chat cockpit (président de club).
  const { data: conv } = await admin
    .from("chat_conversations")
    .select("id, non_lus_club")
    .eq("id", convId)
    .maybeSingle();
  if (!conv) return NextResponse.json({ ok: false, error: "conv_introuvable" }, { status: 404 });
  const { error: eMsg } = await admin
    .from("chat_messages")
    .insert({ conversation_id: convId, sender: "operateur", corps });
  if (eMsg) {
    console.error("chat reply (club) : message non enregistré", eMsg.message);
    return NextResponse.json({ ok: false, error: "ecriture_refusee" }, { status: 500 });
  }
  const { error: eConv } = await admin
    .from("chat_conversations")
    .update({
      dernier_message_at: now,
      dernier_sender: "operateur",
      dernier_apercu: corps.slice(0, 140),
      statut: "ouvert",
      non_lus_operateur: 0,
      non_lus_club: ((conv as { non_lus_club: number }).non_lus_club ?? 0) + 1,
    })
    .eq("id", convId);
  if (eConv) console.error("chat reply (club) : entête de conversation", eConv.message);
  return NextResponse.json({ ok: true, cible: "club" });
}
