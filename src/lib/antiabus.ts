import { headers } from "next/headers";

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

function ip(): string {
  const h = headers();
  const fwd = h.get("x-forwarded-for");
  return (fwd ? fwd.split(",")[0] : h.get("x-real-ip") ?? "inconnue").trim();
}

async function turnstileValide(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // non configuré : on ne bloque pas
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false; // en cas de panne, on refuse plutôt que d'ouvrir la porte
  }
}

export type Verdict = { ok: true } | { ok: false; raison: "robot" | "trop_de_tentatives" };

export async function verifierSoumissionPublique(formData: FormData, slug: string): Promise<Verdict> {
  // 1. Pot de miel — champ caché, invisible pour un humain.
  if (String(formData.get("site_web") ?? "").trim() !== "") return { ok: false, raison: "robot" };

  // 2. Turnstile, si configuré.
  const token = String(formData.get("cf-turnstile-response") ?? "");
  if (!(await turnstileValide(token))) return { ok: false, raison: "robot" };

  // 3. Limitation de débit.
  if (trop(`ip:${ip()}`, MAX_PAR_IP)) return { ok: false, raison: "trop_de_tentatives" };
  if (trop(`asso:${slug}`, MAX_PAR_ASSO)) return { ok: false, raison: "trop_de_tentatives" };

  return { ok: true };
}
