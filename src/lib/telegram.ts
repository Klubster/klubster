// Envoi Telegram côté serveur — notifications de chat vers Mathieu (klubster_bot).
// Le tag #v:<convId> / #c:<convId> placé dans le message permet au bot du VPS de
// router la réponse de Mathieu vers la bonne conversation (route /api/chat/reply).

const API = "https://api.telegram.org";

export async function envoyerTelegram(text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`${API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text.slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      // Ne jamais bloquer l'action utilisateur si Telegram est lent.
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

/** Échappe le texte destiné à parse_mode=HTML de Telegram. */
export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
