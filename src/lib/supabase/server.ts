import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
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

/**
 * Client pour les écritures dans le Storage, dont l'en-tête `Authorization` porte
 * explicitement le jeton de l'utilisateur connecté.
 *
 * Pourquoi ce détour. Le client créé ci-dessus résout le jeton de session à chaque
 * requête, à partir des cookies. Cela fonctionne pour la base de données, mais plus
 * pour le Storage depuis la montée de version des dépendances du 21/07/2026 : les
 * envois partaient avec la seule clé publishable, donc en tant qu'anonyme, et les
 * politiques RLS les refusaient — `new row violates row-level security policy`,
 * renvoyé en HTTP 400. Symptôme côté président : « L'envoi a échoué. Réessayez. »
 * Plus aucun fichier n'a été déposé dans les buckets entre le 21/07 et le 28/07.
 *
 * Poser le jeton nous-mêmes rend l'identité de l'appelant non négociable. La sécurité
 * ne bouge pas : c'est le jeton de l'utilisateur, les politiques RLS s'appliquent
 * exactement comme avant.
 *
 * Retourne `null` s'il n'y a pas de session : à l'appelant de refuser proprement.
 */
export async function createSupabaseStorageClient() {
  const base = await createSupabaseServerClient();
  const { data } = await base.auth.getSession();
  const jeton = data.session?.access_token;
  if (!jeton) return null;
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
