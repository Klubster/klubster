"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envoyerTelegram, escapeHtml } from "@/lib/telegram";
import { verifierMessageChatPublic, notificationChatAutorisee } from "@/lib/antiabus";
import type { SiteChatMessage } from "@/lib/site-chat";

const COLS = "id,sender,corps,cree_at";

/** Vérifie qu'une conversation appartient bien au visiteur (garde par uuid inguessable). */
async function convDuVisiteur(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  convId: string,
  visiteurId: string,
) {
  const { data } = await admin
    .from("site_chat_conversations")
    .select("id, visiteur_id")
    .eq("id", convId)
    .maybeSingle();
  const row = data as { id: string; visiteur_id: string } | null;
  return row && row.visiteur_id === visiteurId ? row : null;
}

/** Le visiteur envoie un message. Crée la conversation au besoin, notifie Mathieu sur Telegram. */
export async function envoyerMessageVisiteur(
  visiteurId: string,
  convId: string | null,
  corps: string,
  nom?: string,
  contact?: string,
): Promise<{ ok: boolean; convId?: string; message?: SiteChatMessage; raison?: "trop_de_messages" | "echec" }> {
  const texte = (corps ?? "").trim().slice(0, 4000);
  if (!texte || !visiteurId) return { ok: false, raison: "echec" };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false, raison: "echec" };

  // Conversation existante (vérifiée) ou nouvelle.
  const existante = convId ? (await convDuVisiteur(admin, convId, visiteurId))?.id : null;

  // Garde anti-abus AVANT toute écriture et toute notification : cette action est
  // publique, anonyme, et écrit en service-role (revue externe du 26/08/2026).
  const verdict = await verifierMessageChatPublic({ visiteurId, nouvelleConversation: !existante });
  if (!verdict.ok) return { ok: false, raison: verdict.raison };

  let id = existante;
  if (!id) {
    const { data: cree, error: eConv } = await admin
      .from("site_chat_conversations")
      .insert({
        visiteur_id: visiteurId,
        nom: nom?.trim().slice(0, 120) || null,
        contact: contact?.trim().slice(0, 200) || null,
      })
      .select("id")
      .single();
    if (eConv) console.error("chat site : création de conversation", eConv.message);
    id = (cree as { id: string } | null)?.id;
  }
  if (!id) return { ok: false, raison: "echec" };

  // ⚠️ Un échec d'écriture ne doit JAMAIS ressembler à un succès : sans ce contrôle,
  // le visiteur voyait son message affiché, l'éditeur recevait une notification, et
  // rien n'existait en base (revue externe du 26/08/2026).
  const { data: msg, error: eMsg } = await admin
    .from("site_chat_messages")
    .insert({ conversation_id: id, sender: "visiteur", corps: texte })
    .select(COLS)
    .single();
  if (eMsg || !msg) {
    console.error("chat site : message non enregistré", eMsg?.message);
    return { ok: false, raison: "echec" };
  }

  // L'entête de conversation est un confort d'affichage : son échec est journalisé,
  // mais il ne perd pas un message déjà écrit.
  const { error: eMaj } = await admin
    .from("site_chat_conversations")
    .update({ dernier_sender: "visiteur", dernier_at: new Date().toISOString(), statut: "ouvert" })
    .eq("id", id);
  if (eMaj) console.error("chat site : entête de conversation", eMaj.message);

  // Notif Telegram taggée : le bot du VPS route la réponse via /api/chat/reply.
  // Une notification par conversation et par tranche de 5 minutes — une salve de
  // phrases fait vibrer le téléphone une fois, pas dix.
  if (await notificationChatAutorisee(`v:${id}`, 5 * 60 * 1000)) {
    const entete = [
      "💬 <b>Chat site Klubster</b>",
      nom ? `— ${escapeHtml(nom.slice(0, 120))}` : "",
      contact ? `(${escapeHtml(contact.slice(0, 200))})` : "",
    ]
      .filter(Boolean)
      .join(" ");
    await envoyerTelegram(
      `${entete}\n${escapeHtml(texte.slice(0, 1500))}\n\n↩️ Réponds à ce message pour lui répondre.\n#v:${id}`,
    ).catch(() => {});
  }

  return { ok: true, convId: id, message: msg as SiteChatMessage };
}

/** Le visiteur (re)charge son fil — sert aussi de polling pour voir les réponses de Mathieu. */
export async function chargerMessagesVisiteur(
  visiteurId: string,
  convId: string,
): Promise<{ ok: boolean; messages?: SiteChatMessage[] }> {
  if (!visiteurId || !convId) return { ok: false };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false };
  const conv = await convDuVisiteur(admin, convId, visiteurId);
  if (!conv) return { ok: false };
  const { data, error } = await admin
    .from("site_chat_messages")
    .select(COLS)
    .eq("conversation_id", convId)
    .order("cree_at", { ascending: true });
  // Une lecture en échec renvoyait « ok, zéro message » : le fil paraissait vide,
  // les réponses de l'éditeur semblaient perdues.
  if (error) {
    console.error("chat site : lecture du fil", error.message);
    return { ok: false };
  }
  await admin.from("site_chat_conversations").update({ non_lus_visiteur: 0 }).eq("id", convId);
  return { ok: true, messages: (data ?? []) as SiteChatMessage[] };
}
