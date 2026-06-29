"use client";
import { createBrowserClient } from "@supabase/ssr";

// Valeurs publiques (publishable) — exposées au navigateur par conception.
// Fallback pour que les déploiements sans variables d'env fonctionnent quand même.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9mCWkp80McBNZeRTdFx7sw_Kb3NJhKR";

// Client Supabase côté navigateur (Client Components).
export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
