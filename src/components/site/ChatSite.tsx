"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { envoyerMessageVisiteur, chargerMessagesVisiteur } from "@/app/(marketing)/chat-site-actions";
import type { SiteChatMessage } from "@/lib/site-chat";

const VID_KEY = "klub_chat_vid";
const CID_KEY = "klub_chat_cid";

function uid() {
  try {
    return crypto.randomUUID();
  } catch {
    return "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Bulle de chat du site vitrine Klubster. Le visiteur écrit ; le message arrive sur le
 * Telegram de Mathieu (klubster_bot). Mathieu répond depuis Telegram et la réponse
 * remonte ici (polling). Anonyme : identité = un uuid stocké en localStorage.
 */
export default function ChatSite() {
  const [ouvert, setOuvert] = useState(false);
  const [messages, setMessages] = useState<SiteChatMessage[]>([]);
  const [texte, setTexte] = useState("");
  const [contact, setContact] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const vidRef = useRef<string>("");
  const cidRef = useRef<string | null>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Identité visiteur + conversation (persistées entre visites).
  useEffect(() => {
    let vid = localStorage.getItem(VID_KEY);
    if (!vid) {
      vid = uid();
      localStorage.setItem(VID_KEY, vid);
    }
    vidRef.current = vid;
    cidRef.current = localStorage.getItem(CID_KEY);
  }, []);

  const rafraichir = useCallback(async () => {
    const cid = cidRef.current;
    if (!cid) return;
    const r = await chargerMessagesVisiteur(vidRef.current, cid);
    if (r.ok && r.messages) setMessages(r.messages);
  }, []);

  // Chargement + polling tant que le panneau est ouvert.
  useEffect(() => {
    if (!ouvert) return;
    rafraichir();
    const t = setInterval(rafraichir, 4000);
    return () => clearInterval(t);
  }, [ouvert, rafraichir]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, ouvert]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const corps = texte.trim();
    if (!corps || envoi) return;
    setEnvoi(true);
    setTexte("");
    // Affichage optimiste.
    const optimiste: SiteChatMessage = {
      id: "tmp_" + Date.now(),
      sender: "visiteur",
      corps,
      cree_at: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimiste]);
    const r = await envoyerMessageVisiteur(vidRef.current, cidRef.current, corps, undefined, contact || undefined);
    if (r.ok && r.convId) {
      cidRef.current = r.convId;
      localStorage.setItem(CID_KEY, r.convId);
      await rafraichir();
    }
    setEnvoi(false);
  }

  return (
    <>
      {/* Bouton flottant */}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label={ouvert ? "Fermer le chat" : "Discuter avec Klubster"}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center bg-ink text-paper shadow-lg transition-transform hover:scale-105"
      >
        {ouvert ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <span className="font-logo text-xl leading-none">
            k<span className="text-brand">_</span>
          </span>
        )}
      </button>

      {/* Panneau */}
      {ouvert && (
        <div className="fixed bottom-24 right-5 z-50 flex h-[70vh] max-h-[560px] w-[92vw] max-w-[380px] flex-col border border-line bg-paper shadow-2xl">
          <div className="border-b border-line bg-ink px-4 py-3 text-paper">
            <p className="mono text-[13px] font-bold">
              Klubster<span className="text-brand">_</span>
            </p>
            <p className="mono text-[10px] text-paper/70">Une question ? Écrivez à Mathieu, il répond ici.</p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {messages.length === 0 && (
              <p className="mono text-[12px] leading-relaxed text-ink-soft">
                Bonjour 👋 Posez votre question sur Klubster, je vous réponds directement ici.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={m.sender === "visiteur" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    "max-w-[80%] px-3 py-2 text-[13px] leading-relaxed " +
                    (m.sender === "visiteur" ? "bg-ink text-paper" : "border border-line bg-bg-alt text-ink")
                  }
                >
                  {m.corps}
                </div>
              </div>
            ))}
            <div ref={finRef} />
          </div>

          <form onSubmit={envoyer} className="border-t border-line p-3">
            {messages.length === 0 && (
              <input
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="Email ou téléphone (optionnel)"
                className="mono mb-2 w-full border border-line bg-paper px-3 py-2 text-[12px] outline-none focus:border-ink"
              />
            )}
            <div className="flex gap-2">
              <input
                value={texte}
                onChange={(e) => setTexte(e.target.value)}
                placeholder="Votre message…"
                className="mono flex-1 border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
              />
              <button
                type="submit"
                disabled={envoi || !texte.trim()}
                className="mono bg-brand-dark px-4 py-2 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                →
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
