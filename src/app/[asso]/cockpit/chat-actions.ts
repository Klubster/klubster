"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { sendToAll } from "@/lib/push";
import { envoyerTelegram, escapeHtml } from "@/lib/telegram";
import type { ChatMessage } from "@/lib/chat";

const COLS = "id,conversation_id,sender,corps,created_at";

// Appartenance au club — sans redirection (l'action est appelée depuis le widget client).
async function membre(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) return null;
  const profile = await getProfile();
  if (!profile) return null;
  if (profile.organisation_id !== org.id && profile.role !== "super_admin") return null;
  if (profile.role === "adherent") return null;
  return { org, profile };
}

async function conversationDuClub(orgId: string, sb: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data } = await sb
    .from("chat_conversations")
    .select("id, non_lus_operateur")
    .eq("organisation_id", orgId)
    .maybeSingle();
  if (data) return data as { id: string; non_lus_operateur: number };
  const { data: cree } = await sb
    .from("chat_conversations")
    .insert({ organisation_id: orgId })
    .select("id, non_lus_operateur")
    .single();
  return (cree as { id: string; non_lus_operateur: number } | null) ?? null;
}

/** État léger pour le montage du widget : id de conversation + compteur non lus (sans effet de bord). */
export async function etatChatClub(slug: string): Promise<{ ok: boolean; convId?: string; nonLus?: number }> {
  const ctx = await membre(slug);
  if (!ctx) return { ok: false };
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("chat_conversations")
    .select("id, non_lus_club")
    .eq("organisation_id", ctx.org.id)
    .maybeSingle();
  const row = data as { id: string; non_lus_club: number } | null;
  return { ok: true, convId: row?.id, nonLus: row?.non_lus_club ?? 0 };
}

/** Ouverture du panneau : charge le fil et marque lu côté club. Crée la conversation au besoin. */
export async function chargerMessagesClub(slug: string): Promise<{ ok: boolean; convId?: string; messages?: ChatMessage[] }> {
  const ctx = await membre(slug);
  if (!ctx) return { ok: false };
  const sb = await createSupabaseServerClient();
  const conv = await conversationDuClub(ctx.org.id, sb);
  if (!conv) return { ok: false };
  const { data, error } = await sb.from("chat_messages").select(COLS).eq("conversation_id", conv.id).order("created_at", { ascending: true });
  // Un fil illisible (RLS, panne) s'affichait comme un fil vide : les réponses de
  // l'éditeur paraissaient perdues.
  if (error) {
    console.error("chat cockpit : lecture du fil", error.message);
    return { ok: false };
  }
  await sb.from("chat_conversations").update({ non_lus_club: 0 }).eq("id", conv.id);
  return { ok: true, convId: conv.id, messages: (data ?? []) as ChatMessage[] };
}

/** Envoi d'un message du club. Notifie l'éditeur par email uniquement au premier non-lu d'une salve. */
export async function envoyerMessageClub(slug: string, corps: string): Promise<{ ok: boolean; convId?: string; message?: ChatMessage }> {
  const ctx = await membre(slug);
  if (!ctx) return { ok: false };
  const texte = corps.trim().slice(0, 4000);
  if (!texte) return { ok: false };
  const sb = await createSupabaseServerClient();
  const conv = await conversationDuClub(ctx.org.id, sb);
  if (!conv) return { ok: false };

  // ⚠️ Le message d'abord, la notification ENSUITE. Sans ce contrôle, une écriture
  // refusée (RLS, panne) laissait le président devant son message affiché, l'éditeur
  // recevait une alerte, et rien n'existait en base (revue externe du 26/08/2026).
  const { data: msg, error: eMsg } = await sb
    .from("chat_messages")
    .insert({ conversation_id: conv.id, sender: "club", corps: texte, auteur: ctx.profile.id })
    .select(COLS)
    .single();
  if (eMsg || !msg) {
    console.error("chat cockpit : message non enregistré", eMsg?.message);
    return { ok: false };
  }

  // Notification push à chaque message (temps réel sur le téléphone de l'éditeur).
  await sendToAll({ title: `💬 ${ctx.org.nom}`, body: texte.slice(0, 140), url: "/admin/messages" }).catch(() => {});

  const { error: eConv } = await sb
    .from("chat_conversations")
    .update({
      dernier_message_at: new Date().toISOString(),
      dernier_sender: "club",
      dernier_apercu: texte.slice(0, 140),
      statut: "ouvert",
      non_lus_operateur: (conv.non_lus_operateur ?? 0) + 1,
    })
    .eq("id", conv.id);
  // Compteurs et aperçu : un échec ici ne perd pas le message, mais il se voit.
  if (eConv) console.error("chat cockpit : entête de conversation", eConv.message);

  // Notif Telegram (klubster_bot) à chaque message. Mathieu répond DIRECTEMENT depuis
  // Telegram : le bot du VPS route la réponse via /api/chat/reply. Le tag #c:<convId>
  // identifie la conversation. (Remplace l'ancienne notification par email.)
  await envoyerTelegram(
    `💬 <b>${escapeHtml(ctx.org.nom)}</b> — cockpit\n${escapeHtml(texte.slice(0, 1500))}\n\n↩️ Réponds à ce message pour répondre au club.\n#c:${conv.id}`,
  ).catch(() => {});

  return { ok: true, convId: conv.id, message: msg as ChatMessage };
}
