"use server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envoyerTelegram, escapeHtml } from "@/lib/telegram";
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
): Promise<{ ok: boolean; convId?: string; message?: SiteChatMessage }> {
  const texte = (corps ?? "").trim().slice(0, 4000);
  if (!texte || !visiteurId) return { ok: false };
  const admin = createSupabaseAdminClient();
  if (!admin) return { ok: false };

  // Conversation existante (vérifiée) ou nouvelle.
  let id = convId && (await convDuVisiteur(admin, convId, visiteurId))?.id;
  if (!id) {
    const { data: cree } = await admin
      .from("site_chat_conversations")
      .insert({
        visiteur_id: visiteurId,
        nom: nom?.trim().slice(0, 120) || null,
        contact: contact?.trim().slice(0, 200) || null,
      })
      .select("id")
      .single();
    id = (cree as { id: string } | null)?.id;
  }
  if (!id) return { ok: false };

  const { data: msg } = await admin
    .from("site_chat_messages")
    .insert({ conversation_id: id, sender: "visiteur", corps: texte })
    .select(COLS)
    .single();

  await admin
    .from("site_chat_conversations")
    .update({ dernier_sender: "visiteur", dernier_at: new Date().toISOString(), statut: "ouvert" })
    .eq("id", id);

  // Notif Telegram taggée : le bot du VPS route la réponse via /api/chat/reply.
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

  return { ok: true, convId: id, message: (msg as SiteChatMessage) ?? undefined };
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
  const { data } = await admin
    .from("site_chat_messages")
    .select(COLS)
    .eq("conversation_id", convId)
    .order("cree_at", { ascending: true });
  await admin.from("site_chat_conversations").update({ non_lus_visiteur: 0 }).eq("id", convId);
  return { ok: true, messages: (data ?? []) as SiteChatMessage[] };
}
