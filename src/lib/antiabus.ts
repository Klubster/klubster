import { headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * Garde anti-abus pour les formulaires publics (inscription d'un adhérent).
 *
 * Sans lui, chaque soumission déclenche un `auth.signUp` (donc un email de confirmation vers
 * une adresse arbitraire) et deux emails Resend. C'est un vecteur de bombardement par email
 * et d'épuisement du quota d'envoi du club.
 *
 * Trois couches, de la moins à la plus coûteuse :
 *   1. pot de miel  — un champ invisible que seuls les robots remplissent ;
 *   2. limitation de débit — par IP et par association ;
 *   3. Turnstile (Cloudflare) — activé automatiquement dès que TURNSTILE_SECRET_KEY existe.
 *
 * Limite connue : le compteur vit en mémoire, donc par instance serverless. Il freine un
 * robot naïf, pas une attaque distribuée. Turnstile est la vraie défense.
 */

type Compteur = { nb: number; reset: number };
const compteurs = new Map<string, Compteur>();

const FENETRE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PAR_IP = 5;
const MAX_PAR_ASSO = 30;
const TAILLE_MAX_CACHE = 5000;

function trop(cle: string, max: number): boolean {
  const maintenant = Date.now();

  // Purge paresseuse : on borne la mémoire (le middleware avait le défaut inverse).
  if (compteurs.size > TAILLE_MAX_CACHE) {
    for (const [k, v] of compteurs) if (v.reset < maintenant) compteurs.delete(k);
    if (compteurs.size > TAILLE_MAX_CACHE) compteurs.clear();
  }

  const actuel = compteurs.get(cle);
  if (!actuel || actuel.reset < maintenant) {
    compteurs.set(cle, { nb: 1, reset: maintenant + FENETRE_MS });
    return false;
  }
  actuel.nb += 1;
  return actuel.nb > max;
}

/**
 * Limitation de débit PARTAGÉE entre instances (migration 0016). Le compteur en mémoire
 * ne voyait que sa propre instance serverless ; ici, une RPC atomique compte à l'échelle
 * de la plateforme. Repli sur le compteur mémoire si la base est indisponible — on ne
 * bloque jamais une inscription pour une panne du limiteur, le pot de miel et Turnstile
 * restant en place.
 */
async function tropDistribue(cle: string, max: number): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return trop(cle, max);
  try {
    const { data, error } = await admin.rpc("incrementer_rate_limit", {
      p_cle: cle,
      p_fenetre_secondes: Math.round(FENETRE_MS / 1000),
      p_max: max,
    });
    if (error) return trop(cle, max);
    return data === true;
  } catch {
    return trop(cle, max);
  }
}

// Asynchrone depuis Next 15 : `headers()` retourne une promesse. Le codemod proposait
// l'échappatoire `UnsafeUnwrappedHeaders` ; le seul appelant étant déjà asynchrone,
// autant l'écrire correctement.
async function ip(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip") ?? "inconnue").trim();
}

/** `ok` — ou les codes d'erreur siteverify, remontés jusqu'au client le temps du
 * diagnostic (24/07/2026 : refus « robot » sur jetons frais et humains). */
type ResultatTurnstile = { ok: true } | { ok: false; codes: string };

async function turnstileValide(token: string): Promise<ResultatTurnstile> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true }; // non configuré : on ne bloque pas

  // Le jeton est produit au moment de la soumission : son absence n'est pas un cas légitime.
  if (!token) {
    console.warn("[antiabus] Aucun jeton Turnstile — soumission refusée.");
    return { ok: false, codes: "jeton-absent" };
  }

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (data.success === true) return { ok: true };

    const codes = data["error-codes"] ?? [];
    console.warn("[antiabus] Turnstile refusé :", codes.join(", ") || "aucun code");
    const detail = codes.join(",") || "aucun-code";

    // « timeout-or-duplicate » = jeton expiré (valable 5 min) ou DÉJÀ consommé.
    // Cloudflare est explicite : ce résultat doit être traité comme un échec exigeant un
    // nouveau jeton. L'accepter, comme on le faisait, transformait un jeton unique en
    // passe permanent — rejouable depuis des IP variées et des instances serverless
    // différentes, exactement ce dont un robot d'inscription a besoin (audit du
    // 21/07/2026). Le widget se régénère au rechargement : un humain retente sans peine.
    if (codes.includes("timeout-or-duplicate")) return { ok: false, codes: detail };

    // Secret manquant ou invalide = NOTRE configuration est cassée. En développement on
    // laisse passer pour ne pas bloquer les tests ; en production on refuse, car « laisser
    // passer quand le contrôle est cassé » revient à n'avoir aucun contrôle.
    if (codes.includes("invalid-input-secret") || codes.includes("missing-input-secret")) {
      const prod = process.env.NODE_ENV === "production";
      console.error("[antiabus] Secret Turnstile invalide ou manquant.", prod ? "Refusé (prod)." : "Toléré (dev).");
      return prod ? { ok: false, codes: detail } : { ok: true };
    }

    return { ok: false, codes: detail };
  } catch {
    // Cloudflare réellement injoignable (erreur réseau) : on n'annule pas les inscriptions
    // du soir pour une panne d'un tiers. Le pot de miel et la limitation de débit restent
    // en place comme filet. C'est le SEUL cas où l'on accepte en mode dégradé.
    console.warn("[antiabus] Turnstile injoignable — accepté en mode dégradé (pot de miel + rate limit actifs).");
    return { ok: true };
  }
}

export type Verdict =
  | { ok: true }
  | { ok: false; raison: "robot" | "trop_de_tentatives"; detail?: string };

export async function verifierSoumissionPublique(formData: FormData, slug: string): Promise<Verdict> {
  // 1. Pot de miel — champ caché, invisible pour un humain.
  if (String(formData.get("site_web") ?? "").trim() !== "") return { ok: false, raison: "robot", detail: "pot-de-miel" };

  // 2. Turnstile, si configuré.
  const token = String(formData.get("cf-turnstile-response") ?? "");
  const resultat = await turnstileValide(token);
  if (!resultat.ok) return { ok: false, raison: "robot", detail: resultat.codes };

  // 3. Limitation de débit — partagée entre instances (repli mémoire si base indisponible).
  if (await tropDistribue(`ip:${await ip()}`, MAX_PAR_IP)) return { ok: false, raison: "trop_de_tentatives" };
  if (await tropDistribue(`asso:${slug}`, MAX_PAR_ASSO)) return { ok: false, raison: "trop_de_tentatives" };

  return { ok: true };
}
