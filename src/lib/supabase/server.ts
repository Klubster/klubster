import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Valeurs publiques (publishable) — fallback si les variables d'env ne sont pas définies.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9mCWkp80McBNZeRTdFx7sw_Kb3NJhKR";

// Client Supabase côté serveur (Server Components / Route Handlers).
// Utilise la clé publishable (anon) : la sécurité repose sur les politiques RLS.
//
// Asynchrone depuis Next 15 : `cookies()` retourne désormais une promesse. Le codemod
// officiel proposait l'échappatoire `UnsafeUnwrappedCookies`, qui déballe la promesse de
// force ; elle porte bien son nom et n'est qu'un sursis avant suppression. Puisque tous
// les appelants sont déjà des fonctions asynchrones, autant faire les choses proprement.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll appelé depuis un Server Component : ignoré (géré par le middleware).
        }
      },
    },
  });
}
