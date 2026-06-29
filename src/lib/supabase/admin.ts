import { createClient } from "@supabase/supabase-js";

// Client service-role (serveur uniquement) — utilisé seulement par le webhook Stripe vérifié.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
