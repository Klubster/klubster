import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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
 * Client pour les ÉCRITURES dans le Storage.
 *
 * Historique, parce que le choix mérite d'être justifié. Depuis la montée de version
 * des dépendances du 21/07/2026, plus aucun fichier n'a pu être déposé dans les
 * buckets — modèles de pièces, logos, photos, et les documents des adhérents. Les
 * requêtes arrivaient au Storage sans identité exploitable : les politiques RLS les
 * refusaient avec `new row violates row-level security policy`, renvoyé en HTTP 400.
 * Trois tentatives pour rattacher la session de l'utilisateur à ce client ont échoué
 * (en-tête `Authorization` explicite, puis l'option `accessToken` de supabase-js),
 * alors même que le serveur identifiait correctement l'appelant et que le prédicat
 * de la politique était vérifié à la main en SQL.
 *
 * On sort donc de cette dépendance : l'écriture passe par le client service-role.
 *
 * Ce que cela implique, et pourquoi c'est tenable :
 *  - Les politiques RLS ne gardent plus ces écritures. C'est le code applicatif qui
 *    autorise, en amont, via `verifierPermission()` ou `getUser()` + vérification de
 *    propriété — c'est déjà le cas à chacun des sept points d'envoi.
 *  - Le chemin de destination est construit côté serveur à partir de l'identifiant de
 *    l'organisation, jamais d'une valeur envoyée par le navigateur. Un appelant ne
 *    peut donc pas viser le dossier d'un autre club.
 *  - Les politiques RLS restent en place et continuent de protéger les écritures
 *    faites depuis le navigateur (galerie du site club) et toutes les lectures.
 *
 * Retourne `null` si la clé service-role est absente : à l'appelant de refuser.
 */
export function createSupabaseStorageClient() {
  return createSupabaseAdminClient();
}
