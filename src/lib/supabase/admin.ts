import { createClient } from "@supabase/supabase-js";

// Client service-role — SERVEUR UNIQUEMENT. Ne jamais importer depuis un composant client.
// Usages : webhook Stripe (signé) et inscription publique (après le garde anti-abus).
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
