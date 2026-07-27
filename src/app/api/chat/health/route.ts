import { NextResponse } from "next/server";

// Diagnostic : indique quelles variables d'env le site voit RÉELLEMENT à l'exécution
// (booléens uniquement, aucune valeur exposée). Sert à vérifier la config Vercel du chat.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    telegram_bot_token: !!process.env.TELEGRAM_BOT_TOKEN,
    telegram_chat_id: !!process.env.TELEGRAM_CHAT_ID,
    chat_telegram_secret: !!process.env.CHAT_TELEGRAM_SECRET,
    supabase_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
