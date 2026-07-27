"use client";

// Vue opérateur (éditeur) de la messagerie — liste des clubs à gauche, fil à droite.
// Temps réel Supabase (le super_admin peut tout lire via RLS). DA Klubster.

import { useEffect, useRef, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listerConversations, chargerMessagesOp, repondre, clore } from "./actions";
import type { ChatMessage, ConversationOp } from "@/lib/chat";

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const jour = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function ChatOperateur({ initial }: { initial: ConversationOp[] }) {
  const [convs, setConvs] = useState<ConversationOp[]>(initial);
  const [selId, setSelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reponse, setReponse] = useState("");
  const [pending, start] = useTransition();
  const selRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    selRef.current = selId;
  }, [selId]);

  const selected = convs.find((c) => c.id === selId) ?? null;

  function versLeBas() {
    requestAnimationFrame(() => finRef.current?.scrollIntoView({ behavior: "smooth" }));
  }
  async function rafraichir() {
    setConvs(await listerConversations());
  }
  async function ouvrir(id: string) {
    setSelId(id);
    setMessages(await chargerMessagesOp(id));
    setConvs((cs) => cs.map((c) => (c.id === id ? { ...c, non_lus_operateur: 0 } : c)));
    versLeBas();
  }

  useEffect(() => {
    const sb = createSupabaseBrowserClient();
    const ch = sb
      .channel("chat-operateur")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, (payload) => {
        const m = payload.new as ChatMessage;
        if (m.conversation_id === selRef.current) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          versLeBas();
        }
        rafraichir();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, () => rafraichir())
      .subscribe();
    const iv = setInterval(rafraichir, 15000);
    return () => {
      clearInterval(iv);
      sb.removeChannel(ch);
    };
  }, []);

  function envoyer() {
    const t = reponse.trim();
    if (!t || !selId) return;
    setReponse("");
    const optimiste: ChatMessage = { id: `tmp-${Date.now()}`, conversation_id: selId, sender: "operateur", corps: t, created_at: new Date().toISOString() };
    setMessages((m) => [...m, optimiste]);
    versLeBas();
    start(async () => {
      await repondre(selId, t);
      setMessages(await chargerMessagesOp(selId));
      rafraichir();
    });
  }

  const totalNonLus = convs.reduce((s, c) => s + (c.non_lus_operateur || 0), 0);

  return (
    <div className="grid h-[calc(100vh-9rem)] grid-cols-1 border border-line md:grid-cols-[22rem_1fr]">
      {/* Liste */}
      <aside className={`flex flex-col border-r border-line bg-paper ${selId ? "hidden md:flex" : ""}`}>
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">CONVERSATIONS<span className="text-brand">_</span></span>
          {totalNonLus > 0 ? <span className="mono bg-brand-dark px-2 py-0.5 text-[11px] font-bold text-white">{totalNonLus}</span> : null}
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 ? (
            <p className="p-4 text-[13px] text-ink-soft">Aucune conversation pour l’instant.</p>
          ) : (
            convs.map((c) => (
              <button
                key={c.id}
                onClick={() => ouvrir(c.id)}
                className={`flex w-full flex-col gap-0.5 border-b border-line px-4 py-3 text-left hover:bg-bg-alt ${selId === c.id ? "bg-bg-alt" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[14px] font-medium">{c.club_nom}</span>
                  <span className="flex items-center gap-1.5">
                    {c.statut === "clos" ? <span className="mono text-[10px] text-ink-faint">clos</span> : null}
                    {c.non_lus_operateur > 0 ? <span className="mono bg-brand-dark px-1.5 text-[10px] font-bold text-white">{c.non_lus_operateur}</span> : null}
                  </span>
                </div>
                <span className="truncate text-[12px] text-ink-soft">
                  {c.dernier_sender === "operateur" ? "Vous : " : ""}
                  {c.dernier_apercu || "—"}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Fil */}
      <section className={`flex flex-col bg-paper ${!selId ? "hidden md:flex" : ""}`}>
        {!selected ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-ink-soft">Sélectionnez une conversation</div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <button onClick={() => setSelId(null)} className="mono text-[13px] text-ink-soft hover:text-ink md:hidden" aria-label="Retour">←</button>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{selected.club_nom}</div>
                <div className="truncate text-[11px] text-ink-soft">/{selected.club_slug}</div>
              </div>
              {selected.statut !== "clos" ? (
                <button
                  onClick={() => start(async () => { await clore(selected.id); rafraichir(); })}
                  className="mono border border-line px-2.5 py-1 text-[11px] hover:border-ink"
                >
                  Clore
                </button>
              ) : null}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto bg-bg-alt p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "operateur" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[78%] px-3.5 py-2 text-[13px] leading-relaxed ${m.sender === "operateur" ? "bg-ink text-paper" : "border border-line bg-paper text-ink"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.corps}</p>
                    <div className={`mono mt-0.5 text-right text-[9px] ${m.sender === "operateur" ? "text-paper/50" : "text-ink-faint"}`}>{jour.format(new Date(m.created_at))}</div>
                  </div>
                </div>
              ))}
              <div ref={finRef} />
            </div>

            <div className="flex items-end gap-2 border-t border-line bg-paper p-3">
              <textarea
                value={reponse}
                onChange={(e) => setReponse(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    envoyer();
                  }
                }}
                rows={1}
                placeholder="Votre réponse… (Entrée pour envoyer)"
                className="max-h-32 flex-1 resize-none border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
              />
              <button onClick={envoyer} disabled={pending || !reponse.trim()} className="mono bg-brand-dark px-4 py-2.5 text-[12px] text-white hover:opacity-90 disabled:opacity-40">
                →
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
