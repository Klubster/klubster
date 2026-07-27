import { NextRequest, NextResponse } from "next/server";
import { envoyerTelegram } from "@/lib/telegram";

// Diagnostic : booléens des variables d'env vues à l'exécution (aucune valeur exposée).
// Avec ?send=1, déclenche un vrai envoi Telegram DEPUIS le runtime Vercel pour vérifier
// que la home peut notifier. À retirer une fois le chat validé.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const envoyer = new URL(req.url).searchParams.get("send") === "1";
  let sent: boolean | null = null;
  if (envoyer) {
    sent = await envoyerTelegram(
      "🔧 Test sortant depuis Vercel — si tu vois ce message, la home peut notifier Telegram.",
    );
  }
  return NextResponse.json({
    telegram_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
    telegram_chat_id: !!process.env.TELEGRAM_CHAT_ID,
    chat_telegram_secret: !!process.env.CHAT_TELEGRAM_SECRET,
    supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    sent,
  });
}
