"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { envoyerEmail } from "@/lib/resend";
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
  const { data } = await sb.from("chat_messages").select(COLS).eq("conversation_id", conv.id).order("created_at", { ascending: true });
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

  const { data: msg } = await sb
    .from("chat_messages")
    .insert({ conversation_id: conv.id, sender: "club", corps: texte, auteur: ctx.profile.id })
    .select(COLS)
    .single();

  const premierNonLu = (conv.non_lus_operateur ?? 0) === 0;
  await sb
    .from("chat_conversations")
    .update({
      dernier_message_at: new Date().toISOString(),
      dernier_sender: "club",
      dernier_apercu: texte.slice(0, 140),
      statut: "ouvert",
      non_lus_operateur: (conv.non_lus_operateur ?? 0) + 1,
    })
    .eq("id", conv.id);

  if (premierNonLu) {
    await notifierEditeur(ctx.org.nom, texte).catch(() => {});
  }

  return { ok: true, convId: conv.id, message: (msg as ChatMessage) ?? undefined };
}

// Email à l'éditeur (super_admin) quand un club écrit. Lecture de l'email via le client
// service-role : la RLS de `profiles` empêche un club de lire le profil d'un autre.
async function notifierEditeur(nomClub: string, texte: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { data } = await admin
    .from("profiles")
    .select("email")
    .eq("role", "super_admin")
    .not("email", "is", null)
    .limit(1)
    .maybeSingle();
  const to = (data as { email: string | null } | null)?.email;
  if (!to) return;
  await envoyerEmail({
    to,
    objet: `💬 ${nomClub} — nouveau message`,
    texte: `${nomClub} vous a écrit depuis son cockpit Klubster :\n\n« ${texte.slice(0, 600)} »\n\nRépondre : https://klubster.fr/admin/messages`,
    fromNom: "Klubster",
  });
}
