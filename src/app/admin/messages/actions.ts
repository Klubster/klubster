"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { verifierSuperAdmin } from "@/lib/admin";
import type { ChatMessage, ConversationOp } from "@/lib/chat";

const COLS = "id,conversation_id,sender,corps,created_at";

// PostgREST peut renvoyer l'embed « organisations » en objet (relation many-to-one) ;
// on normalise defensivement.
type OrgEmbed = { nom: string | null; slug: string | null } | { nom: string | null; slug: string | null }[] | null;
function extraireOrg(o: OrgEmbed): { nom: string; slug: string } {
  const r = Array.isArray(o) ? o[0] : o;
  return { nom: r?.nom ?? "—", slug: r?.slug ?? "" };
}

interface RowConv {
  id: string;
  organisation_id: string;
  statut: string;
  dernier_message_at: string | null;
  dernier_sender: string | null;
  dernier_apercu: string | null;
  non_lus_operateur: number;
  organisations: OrgEmbed;
}

export async function listerConversations(): Promise<ConversationOp[]> {
  if (!(await verifierSuperAdmin())) return [];
  const sb = await createSupabaseServerClient();
  const { data } = await sb
    .from("chat_conversations")
    .select("id,organisation_id,statut,dernier_message_at,dernier_sender,dernier_apercu,non_lus_operateur, organisations(nom,slug)")
    .order("dernier_message_at", { ascending: false, nullsFirst: false })
    .limit(300);
  return ((data ?? []) as RowConv[]).map((r) => {
    const org = extraireOrg(r.organisations);
    return {
      id: r.id,
      organisation_id: r.organisation_id,
      club_nom: org.nom,
      club_slug: org.slug,
      statut: r.statut,
      dernier_message_at: r.dernier_message_at,
      dernier_sender: r.dernier_sender,
      dernier_apercu: r.dernier_apercu,
      non_lus_operateur: r.non_lus_operateur,
    };
  });
}

export async function chargerMessagesOp(convId: string): Promise<ChatMessage[]> {
  if (!(await verifierSuperAdmin())) return [];
  const sb = await createSupabaseServerClient();
  const { data } = await sb.from("chat_messages").select(COLS).eq("conversation_id", convId).order("created_at", { ascending: true });
  await sb.from("chat_conversations").update({ non_lus_operateur: 0 }).eq("id", convId);
  return (data ?? []) as ChatMessage[];
}

export async function repondre(convId: string, corps: string): Promise<{ ok: boolean }> {
  if (!(await verifierSuperAdmin())) return { ok: false };
  const texte = corps.trim().slice(0, 4000);
  if (!texte) return { ok: false };
  const sb = await createSupabaseServerClient();
  await sb.from("chat_messages").insert({ conversation_id: convId, sender: "operateur", corps: texte });
  const { data: conv } = await sb.from("chat_conversations").select("non_lus_club").eq("id", convId).single();
  const nonLus = (conv as { non_lus_club: number } | null)?.non_lus_club ?? 0;
  await sb
    .from("chat_conversations")
    .update({
      dernier_message_at: new Date().toISOString(),
      dernier_sender: "operateur",
      dernier_apercu: texte.slice(0, 140),
      statut: "ouvert",
      non_lus_operateur: 0,
      non_lus_club: nonLus + 1,
    })
    .eq("id", convId);
  return { ok: true };
}

export async function clore(convId: string): Promise<{ ok: boolean }> {
  if (!(await verifierSuperAdmin())) return { ok: false };
  const sb = await createSupabaseServerClient();
  await sb.from("chat_conversations").update({ statut: "clos" }).eq("id", convId);
  return { ok: true };
}
