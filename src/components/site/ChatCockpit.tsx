"use client";

// Widget « Écrire à Mathieu » — bulle flottante dans le cockpit. Chat live (Supabase
// realtime), DA Klubster (0 arrondi, mono, vert en accent). Le président écrit, l'éditeur
// répond depuis /admin/messages. Toute la sécurité vit dans les Server Actions + la RLS.

import { useEffect, useRef, useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { etatChatClub, chargerMessagesClub, envoyerMessageClub } from "@/app/[asso]/cockpit/chat-actions";
import type { ChatMessage } from "@/lib/chat";

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });

export default function ChatCockpit({ slug }: { slug: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nonLus, setNonLus] = useState(0);
  const [texte, setTexte] = useState("");
  const [charge, setCharge] = useState(false);
  const [pending, start] = useTransition();
  const finRef = useRef<HTMLDivElement>(null);
  const ouvertRef = useRef(false);
  ouvertRef.current = ouvert;

  function versLeBas() {
    requestAnimationFrame(() => finRef.current?.scrollIntoView({ behavior: "smooth" }));
  }

  // État initial : badge non-lus + id de conversation (pour l'abonnement temps réel).
  useEffect(() => {
    etatChatClub(slug).then((r) => {
      if (r.ok) {
        setConvId(r.convId ?? null);
        setNonLus(r.nonLus ?? 0);
      }
    });
  }, [slug]);

  // Abonnement temps réel dès qu'une conversation existe. Filtre par conversation : le
  // navigateur ne reçoit que les messages de CE club (défense en plus de la RLS realtime).
  useEffect(() => {
    if (!convId) return;
    const sb = createSupabaseBrowserClient();
    const ch = sb
      .channel(`chat-club-${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender === "operateur" && !ouvertRef.current) setNonLus((n) => n + 1);
          if (m.sender === "operateur" && ouvertRef.current) chargerMessagesClub(slug);
          versLeBas();
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [convId, slug]);

  async function ouvrir() {
    setOuvert(true);
    setNonLus(0);
    if (!charge) {
      const r = await chargerMessagesClub(slug);
      if (r.ok) {
        setConvId(r.convId ?? null);
        setMessages(r.messages ?? []);
        setCharge(true);
      }
    }
    versLeBas();
  }

  function envoyer() {
    const t = texte.trim();
    if (!t) return;
    setTexte("");
    const optimiste: ChatMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: convId ?? "tmp",
      sender: "club",
      corps: t,
      created_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimiste]);
    versLeBas();
    start(async () => {
      const r = await envoyerMessageClub(slug, t);
      if (r.ok && r.convId) setConvId(r.convId);
      const rr = await chargerMessagesClub(slug);
      if (rr.ok) setMessages(rr.messages ?? []);
    });
  }

  return (
    <>
      {/* Panneau */}
      {ouvert ? (
        <div className="fixed inset-x-3 bottom-3 z-50 flex max-h-[80vh] flex-col border border-line bg-paper shadow-[0_30px_80px_-40px_rgba(17,17,17,0.5)] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]">
          <div className="flex items-center justify-between bg-ink px-4 py-3 text-paper">
            <div>
              <p className="mono text-[11px] uppercase tracking-label">ÉCRIRE À MATHIEU<span className="text-brand">_</span></p>
              <p className="mt-0.5 text-[11px] text-paper/60">Créateur de Klubster · réponse sous 24 h ouvrées</p>
            </div>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" className="mono text-[18px] leading-none text-paper/70 hover:text-paper">×</button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-bg-alt px-4 py-4">
            {messages.length === 0 ? (
              <p className="mt-6 text-center text-[13px] text-ink-soft">
                Une question sur votre club, un blocage, une idée ?<br />Écrivez-moi ici, je vous réponds personnellement.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "club" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] px-3 py-2 text-[13px] leading-relaxed ${m.sender === "club" ? "bg-ink text-paper" : "border border-line bg-paper text-ink"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.corps}</p>
                    <div className={`mono mt-1 text-right text-[9px] ${m.sender === "club" ? "text-paper/50" : "text-ink-faint"}`}>{heure.format(new Date(m.created_at))}</div>
                  </div>
                </div>
              ))
            )}
            <div ref={finRef} />
          </div>

          <div className="flex items-end gap-2 border-t border-line bg-paper p-2.5">
            <textarea
              value={texte}
              onChange={(e) => setTexte(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  envoyer();
                }
              }}
              rows={1}
              placeholder="Votre message… (Entrée pour envoyer)"
              className="max-h-28 flex-1 resize-none border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
            />
            <button
              onClick={envoyer}
              disabled={pending || !texte.trim()}
              className="mono shrink-0 bg-brand-dark px-4 py-2.5 text-[12px] text-white hover:opacity-90 disabled:opacity-40"
            >
              →
            </button>
          </div>
        </div>
      ) : (
        /* Bulle fermée */
        <button
          onClick={ouvrir}
          className="mono fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-brand-dark px-4 py-3 text-[12px] text-white shadow-[0_16px_40px_-16px_rgba(17,17,17,0.6)] hover:opacity-90"
        >
          <span aria-hidden>💬</span> ÉCRIRE À MATHIEU
          {nonLus > 0 ? (
            <span className="ml-1 inline-flex min-w-4 items-center justify-center bg-white px-1 text-[10px] font-bold text-brand-dark">{nonLus}</span>
          ) : null}
        </button>
      )}
    </>
  );
}
