import crypto from "crypto";

// Intégration Stripe via l'API REST (sans SDK) — Connect, charges directes (0 % Klubster).
const API = "https://api.stripe.com/v1";

/**
 * Mode test / production.
 *
 * Règle : on est en TEST dès qu'une clé de test existe, SAUF si `STRIPE_MODE=live`.
 * Ce choix est délibéré : l'erreur coûteuse n'est pas de tester en croyant être en prod,
 * c'est de facturer de vraies cartes en croyant tester. Le doute penche donc vers le test.
 *
 * Pour passer en production : poser `STRIPE_MODE=live` (et les clés live). Rien d'autre.
 */
const CLE_TEST = process.env.STRIPE_SECRET_KEY_TEST;
const CLE_LIVE = process.env.STRIPE_SECRET_KEY;
const MODE_FORCE = process.env.STRIPE_MODE; // "test" | "live" | undefined

export const stripeModeTest: boolean =
  MODE_FORCE === "test" ? true : MODE_FORCE === "live" ? false : !!CLE_TEST;

const KEY = stripeModeTest ? CLE_TEST : CLE_LIVE;

/**
 * Version d'API épinglée. Sans en-tête `Stripe-Version`, chaque appel suit la version
 * par défaut du COMPTE — un réglage de dashboard non versionné : la forme des réponses
 * peut changer sous nos pieds. À renseigner avec la version affichée dans le dashboard
 * Stripe (Workbench → API version), ex. « 2026-06-24.dahlia ». On ne code PAS de version
 * en dur ici : épingler une version différente de celle du compte changerait les
 * payloads (webhooks compris) sans qu'on l'ait testée.
 */
const VERSION_API = process.env.STRIPE_API_VERSION;

/**
 * Une clé live employée en mode test (ou l'inverse) ferait des dégâts silencieux.
 * Les clés restreintes (`rk_`, recommandées par Stripe) sont acceptées au même titre
 * que les clés secrètes (`sk_`) : seul le mode test/live doit concorder.
 */
export function stripeCleCoherente(): boolean {
  if (!KEY) return false;
  return stripeModeTest
    ? KEY.startsWith("sk_test_") || KEY.startsWith("rk_test_")
    : KEY.startsWith("sk_live_") || KEY.startsWith("rk_live_");
}

/**
 * Secrets de signature des webhooks.
 *
 * Stripe impose une destination par périmètre : une pour les événements du compte
 * plateforme (l'abonnement Klubster), une autre pour ceux des comptes connectés (les
 * cotisations encaissées par les clubs). Deux destinations, donc deux secrets — et autant
 * en production. Chaque variable accepte plusieurs secrets séparés par une virgule.
 *
 * On les essaie tous : une signature valide suffit. Ceux du mode courant passent en
 * premier, pour ne pas calculer un HMAC inutile à chaque appel.
 */
export function webhookSecrets(): string[] {
  const decouper = (v: string | undefined) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const test = decouper(process.env.STRIPE_WEBHOOK_SECRET_TEST);
  const live = decouper(process.env.STRIPE_WEBHOOK_SECRET);
  return stripeModeTest ? [...test, ...live] : [...live, ...test];
}

export function stripeConfigured(): boolean {
  return !!KEY;
}

type Dict = Record<string, unknown>;

function encode(obj: Dict, prefix = "", out: [string, string][] = []): [string, string][] {
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val === undefined || val === null) continue;
    const k = prefix ? `${prefix}[${key}]` : key;
    if (typeof val === "object") {
      encode(val as Dict, k, out);
    } else {
      out.push([k, String(val)]);
    }
  }
  return out;
}

function toForm(obj: Dict): string {
  const params = new URLSearchParams();
  for (const [k, v] of encode(obj)) params.append(k, v);
  return params.toString();
}

async function call(method: "GET" | "POST" | "DELETE", path: string, body?: Dict, stripeAccount?: string) {
  if (!KEY) throw new Error("Stripe non configuré (STRIPE_SECRET_KEY manquante).");
  const headers: Record<string, string> = { Authorization: `Bearer ${KEY}` };
  if (VERSION_API) headers["Stripe-Version"] = VERSION_API;
  if (stripeAccount) headers["Stripe-Account"] = stripeAccount;
  const init: RequestInit = { method, headers };
  if (method === "POST") {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    init.body = body ? toForm(body) : "";
  }
  const res = await fetch(`${API}${path}`, init);
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message ?? `Erreur Stripe (${res.status})`);
  return json;
}

/* ————————————————————————————————————————————————————————————————
   ABONNEMENT KLUBSTER — facturé par la plateforme (pas par Connect).
   Un seul produit, trois paliers selon le nombre d'adhérents.
   Le premier mois est offert : essai de 30 jours, sans carte pré-débitée.
   ———————————————————————————————————————————————————————————————— */

export const JOURS_ESSAI = 30;

export type PalierAbonnement = "starter" | "club" | "club_plus";

export const PALIERS: Record<PalierAbonnement, { prixCentimes: number; libelle: string }> = {
  starter: { prixCentimes: 900, libelle: "Jusqu’à 300 adhérents" },
  club: { prixCentimes: 1900, libelle: "De 301 à 500 adhérents" },
  club_plus: { prixCentimes: 2900, libelle: "Plus de 500 adhérents" },
};

export function palierPourEffectif(nbAdherents: number): PalierAbonnement {
  if (nbAdherents <= 300) return "starter";
  if (nbAdherents <= 500) return "club";
  return "club_plus";
}

export type CodePromo = {
  /** Identifiant Stripe (promo_…) à passer au checkout. */
  id: string;
  /** Le code tel que Stripe l'orthographie (PREM26), pas la saisie de l'utilisateur. */
  code: string;
  /** Nom donné au coupon dans le dashboard, ex. « Première saison offerte ». */
  nom: string | null;
  /** Ce que le code offre, en français : « 100 % de remise pendant 12 mois ». */
  avantage: string;
};

/** Traduit un coupon Stripe en une phrase qu'un bénévole comprend sans lexique. */
function decrireCoupon(coupon: {
  percent_off?: number | null;
  amount_off?: number | null;
  duration?: string;
  duration_in_months?: number | null;
}): string {
  const remise = coupon.percent_off
    ? `${String(coupon.percent_off).replace(".", ",")} % de remise`
    : coupon.amount_off
      ? `${(coupon.amount_off / 100).toLocaleString("fr-FR")} € de remise`
      : "une remise";

  if (coupon.duration === "forever") return `${remise}, sans limite de durée`;
  if (coupon.duration === "repeating" && coupon.duration_in_months) {
    return `${remise} pendant ${coupon.duration_in_months} mois`;
  }
  return `${remise} sur la première facture`;
}

/**
 * Retrouve un code promo (ex. PREM26) côté serveur, pour l'appliquer d'office
 * au checkout : le président saisit le code dans le cockpit Klubster, jamais
 * sur la page de paiement. Renvoie aussi ce que le code offre, pour l'annoncer
 * AVANT de s'engager. `null` si le code est inconnu, expiré ou épuisé.
 */
export async function detailCodePromo(code: string): Promise<CodePromo | null> {
  const propre = code.trim();
  if (!propre) return null;
  // `expand[]=data.coupon` est indispensable : sans lui Stripe ne renvoie que
  // l'identifiant du coupon, et on ne peut pas dire ce que le code offre.
  const res = await call(
    "GET",
    `/promotion_codes?code=${encodeURIComponent(propre)}&active=true&limit=1&expand[]=data.coupon`,
  );
  const promo = res?.data?.[0];
  if (!promo?.id) return null;
  return {
    id: promo.id as string,
    code: (promo.code as string) ?? propre.toUpperCase(),
    nom: (promo.coupon?.name as string) ?? null,
    avantage: decrireCoupon(promo.coupon ?? {}),
  };
}

/** Un code promo tel qu'affiché dans la console admin, avec son état d'usage. */
export type CodePromoAdmin = CodePromo & {
  actif: boolean;
  utilisations: number;
  maxUtilisations: number | null;
  expireLe: string | null;
};

/** Liste les codes promo de l'abonnement Klubster (compte plateforme), récents d'abord. */
export async function listerCodesPromo(limite = 100): Promise<CodePromoAdmin[]> {
  const res = await call("GET", `/promotion_codes?limit=${limite}&expand[]=data.coupon`);
  const data = (res?.data ?? []) as Array<Record<string, unknown>>;
  return data.map((p) => {
    const coupon = (p.coupon ?? {}) as Record<string, unknown>;
    return {
      id: p.id as string,
      code: (p.code as string) ?? "",
      nom: (coupon.name as string) ?? null,
      avantage: decrireCoupon(coupon),
      actif: p.active === true,
      utilisations: Number(p.times_redeemed ?? 0),
      maxUtilisations: p.max_redemptions != null ? Number(p.max_redemptions) : null,
      expireLe: p.expires_at ? new Date(Number(p.expires_at) * 1000).toISOString() : null,
    };
  });
}

export type NouveauCodePromo = {
  /** Le code que l'utilisateur saisira (ex. PILOTE27). Normalisé en majuscules. */
  code: string;
  /** « gratuit » = 100 %, « pourcent » = remise en %, « montant » = remise en euros. */
  type: "gratuit" | "pourcent" | "montant";
  /** Valeur : le pourcentage (1–100) ou le montant en euros, selon le type. */
  valeur: number;
  /** « once » = 1re facture, « repeating » = N mois, « forever » = sans limite. */
  duree: "once" | "repeating" | "forever";
  /** Nombre de mois si `duree = repeating`. */
  dureeMois?: number;
  /** Nombre maximal d'utilisations, toutes personnes confondues (optionnel). */
  maxUtilisations?: number | null;
  /** Date d'expiration au format AAAA-MM-JJ (optionnel). */
  expireLe?: string | null;
};

/**
 * Crée un code promo sur l'abonnement Klubster : d'abord un coupon (le montant de la
 * remise et sa durée), puis le code lui-même (ce que l'utilisateur saisit), rattaché à ce
 * coupon. Opère sur le compte plateforme, dans le mode courant (test ou production).
 * Renvoie une phrase de confirmation lisible.
 */
export async function creerCodePromo(opts: NouveauCodePromo): Promise<CodePromoAdmin> {
  const code = opts.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{3,40}$/.test(code)) {
    throw new Error("Le code doit faire 3 à 40 caractères, lettres et chiffres seulement.");
  }

  // 1. Le coupon décrit la remise.
  const coupon: Dict = { duration: opts.duree };
  if (opts.type === "gratuit") coupon.percent_off = 100;
  else if (opts.type === "pourcent") {
    if (!(opts.valeur > 0 && opts.valeur <= 100)) throw new Error("Le pourcentage doit être compris entre 1 et 100.");
    coupon.percent_off = opts.valeur;
  } else {
    if (!(opts.valeur > 0)) throw new Error("Le montant doit être supérieur à zéro.");
    coupon.amount_off = Math.round(opts.valeur * 100);
    coupon.currency = "eur";
  }
  if (opts.duree === "repeating") {
    const mois = Math.max(1, Math.round(opts.dureeMois ?? 1));
    coupon.duration_in_months = mois;
  }
  coupon.name =
    opts.type === "gratuit"
      ? "Offert" + (opts.duree === "repeating" ? ` ${coupon.duration_in_months} mois` : opts.duree === "forever" ? " sans limite" : " (1re facture)")
      : `Code ${code}`;

  const couponCree = await call("POST", "/coupons", coupon);

  // 2. Le code promo, rattaché au coupon.
  const promo: Dict = { coupon: couponCree.id as string, code };
  if (opts.maxUtilisations && opts.maxUtilisations > 0) promo.max_redemptions = Math.round(opts.maxUtilisations);
  if (opts.expireLe) {
    const t = Math.floor(new Date(`${opts.expireLe}T23:59:59`).getTime() / 1000);
    if (Number.isFinite(t)) promo.expires_at = t;
  }

  let promoCree: Record<string, unknown>;
  try {
    promoCree = await call("POST", "/promotion_codes", promo);
  } catch (e) {
    // Le coupon vient d'être créé : si le code échoue (ex. code déjà pris), on le
    // supprime au mieux, sinon chaque tentative ratée laissait un coupon orphelin
    // dans le dashboard. L'erreur d'origine prime sur celle du nettoyage.
    try {
      await call("DELETE", `/coupons/${couponCree.id}`);
    } catch {
      // Nettoyage best effort — tant pis.
    }
    throw e;
  }
  return {
    id: promoCree.id as string,
    code: (promoCree.code as string) ?? code,
    nom: (couponCree.name as string) ?? null,
    avantage: decrireCoupon(couponCree),
    actif: promoCree.active === true,
    utilisations: 0,
    maxUtilisations: opts.maxUtilisations ?? null,
    expireLe: opts.expireLe ?? null,
  };
}

/** Active ou désactive un code promo existant (sans le supprimer, pour garder l'historique). */
export async function basculerCodePromo(id: string, actif: boolean): Promise<void> {
  await call("POST", `/promotion_codes/${id}`, { active: actif });
}

/**
 * Souscription à l'abonnement Klubster : 30 jours offerts, puis prélèvement mensuel.
 * Stripe émet et envoie la facture chaque mois ; nous n'encaissons rien nous-mêmes.
 * La carte n'est PAS exigée pendant l'essai : la demander d'entrée fait fuir
 * les bénévoles ; Stripe la réclame par email à l'approche de l'échéance.
 */
export async function createAbonnementCheckout(opts: {
  organisationId: string;
  organisationNom: string;
  palier: PalierAbonnement;
  email: string | null;
  customerId?: string | null;
  successUrl: string;
  cancelUrl: string;
  /** Identifiant Stripe (promo_…) déjà résolu via trouverCodePromo. */
  promotionCodeId?: string | null;
}) {
  const p = PALIERS[opts.palier];
  return call("POST", "/checkout/sessions", {
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer: opts.customerId ?? undefined,
    customer_email: opts.customerId ? undefined : (opts.email ?? undefined),
    // En mode subscription, Stripe crée toujours le client : `customer_creation`
    // y est interdit et faisait échouer tout le checkout en live (20/07/2026).
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: p.prixCentimes,
          recurring: { interval: "month" },
          product_data: { name: `Klubster — abonnement (${p.libelle})` },
        },
      },
    ],
    // Pas de carte pendant l'essai. À la fin : facture émise normalement —
    // payée d'office si un code 100 % court toujours (clubs pilotes), sinon
    // Stripe relance par email pour ajouter un moyen de paiement.
    payment_method_collection: "if_required",
    // Code promo (ex. PREM26) : saisi dans le cockpit et appliqué ici d'office —
    // la page Stripe affiche directement 0 €. `discounts` et
    // `allow_promotion_codes` s'excluent mutuellement chez Stripe.
    // Uniquement sur l'abonnement Klubster — jamais sur les cotisations des adhérents.
    ...(opts.promotionCodeId
      ? { discounts: [{ promotion_code: opts.promotionCodeId }] }
      : { allow_promotion_codes: true }),
    subscription_data: {
      trial_period_days: JOURS_ESSAI,
      trial_settings: { end_behavior: { missing_payment_method: "create_invoice" } },
      metadata: { organisation_id: opts.organisationId, palier: opts.palier },
    },
    metadata: { organisation_id: opts.organisationId, palier: opts.palier },
  });
}

/** Portail Stripe : le club consulte ses factures, change de carte, résilie seul. */
export async function createPortalSession(customerId: string, returnUrl: string) {
  return call("POST", "/billing_portal/sessions", { customer: customerId, return_url: returnUrl });
}

/**
 * Compte connecté du club. On transmet le nom et l'adresse du site :
 * sans cela l'onboarding démarre vide, et surtout l'adhérent voit un libellé
 * générique sur son relevé bancaire au lieu du nom de son club — première
 * cause de réclamation « je ne reconnais pas ce prélèvement ».
 */
export async function createConnectedAccount(
  email: string | null,
  club?: { nom?: string | null; url?: string | null },
) {
  return call("POST", "/accounts", {
    type: "express",
    country: "FR",
    email: email ?? undefined,
    business_type: "non_profit",
    business_profile: {
      name: club?.nom ?? undefined,
      url: club?.url ?? undefined,
      // 8641 : associations civiques et sociales — la catégorie des clubs amateurs.
      mcc: "8641",
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

/* ————————————————————————————————————————————————————————————————
   VIREMENTS DU CLUB — l'argent vit sur le compte connecté, jamais chez nous.
   Ces lectures sont faites « au nom du club » (en-tête Stripe-Account) :
   la plateforme ne fait que regarder, elle ne déplace aucun fonds.
   ———————————————————————————————————————————————————————————————— */

/** Solde du club : `available` (virable) et `pending` (en cours de compensation). */
export async function getSoldeClub(account: string) {
  return call("GET", "/balance", undefined, account);
}

/** Derniers virements vers le compte bancaire du club. */
export async function getVirementsClub(account: string, limit = 12) {
  return call("GET", `/payouts?limit=${limit}`, undefined, account);
}

/** Coordonnées du compte bancaire enregistré (les 4 derniers chiffres suffisent à rassurer). */
export async function getCompteBancaireClub(account: string) {
  return call("GET", "/external_accounts?object=bank_account&limit=1", undefined, account);
}

/**
 * Lien vers le tableau de bord Stripe du club (Express), à usage unique et
 * de courte durée. Sert uniquement à modifier le RIB : une donnée bancaire ne
 * doit jamais transiter par nos serveurs.
 */
export async function createLoginLink(account: string) {
  return call("POST", `/accounts/${account}/login_links`, {}, undefined);
}

export async function createAccountLink(account: string, refreshUrl: string, returnUrl: string) {
  return call("POST", "/account_links", {
    account,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });
}

export async function getAccount(account: string) {
  return call("GET", `/accounts/${account}`);
}

export async function createCheckoutForClub(opts: {
  clubAccount: string;
  coursNom: string;
  montantCentimes: number;
  successUrl: string;
  cancelUrl: string;
  adhesionId: string;
  clientEmail?: string | null;
}) {
  // Charge directe sur le compte connecté du club → l'argent va au club, 0 % pour Klubster.
  return call(
    "POST",
    "/checkout/sessions",
    {
      mode: "payment",
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      customer_email: opts.clientEmail ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: opts.montantCentimes,
            product_data: { name: `Cotisation — ${opts.coursNom}` },
          },
        },
      ],
      payment_intent_data: { metadata: { adhesion_id: opts.adhesionId } },
      metadata: { adhesion_id: opts.adhesionId },
    },
    opts.clubAccount
  );
}

/**
 * Rembourse un paiement en ligne (charge directe) sur le compte connecté du club.
 * Sans `montantCentimes` : remboursement total. On n'écrit rien en base ici — c'est
 * l'événement `charge.refunded` qui suit qui enregistre l'écriture, une seule fois,
 * qu'on rembourse depuis Klubster ou depuis le tableau de bord Stripe.
 */
export async function rembourser(paymentIntent: string, clubAccount: string, montantCentimes?: number) {
  const body: Dict = { payment_intent: paymentIntent };
  if (typeof montantCentimes === "number" && montantCentimes > 0) body.amount = montantCentimes;
  return call("POST", "/refunds", body, clubAccount);
}

/** Plafond produit : 12 mensualités = un prélèvement par mois sur toute la saison. */
export const ECHEANCES_MAX = 12;

export function bornerEcheances(n: unknown): number {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v)) return 1;
  return Math.min(Math.max(v, 1), ECHEANCES_MAX);
}

/**
 * Découpe un montant en N mensualités égales, au centime près.
 * Les arrondis sont absorbés par la première échéance : la somme des mensualités
 * fait exactement le montant dû. Sans cela, un club encaisserait 1 ou 2 centimes de moins.
 */
export function repartirMensualites(montantCentimes: number, echeances: number): number[] {
  const n = bornerEcheances(echeances);
  const base = Math.floor(montantCentimes / n);
  const reste = montantCentimes - base * n;
  return Array.from({ length: n }, (_, i) => (i === 0 ? base + reste : base));
}

/**
 * Paiement en N fois : abonnement mensuel borné à N échéances, puis annulé automatiquement.
 * ⚠️ Stripe facture des frais à CHAQUE prélèvement — plus il y a d'échéances, plus le club paie.
 *
 * Limite connue : Stripe impose une mensualité identique à chaque cycle. On facture donc
 * `plancher(montant / N)` à chaque échéance, et le reliquat d'arrondi (au plus N−1 centimes)
 * est ajouté à la première via un `add_invoice_items`.
 */
export async function createCheckoutEcheancesForClub(opts: {
  clubAccount: string;
  coursNom: string;
  montantCentimes: number;
  echeances: number;
  successUrl: string;
  cancelUrl: string;
  adhesionId: string;
  clientEmail?: string | null;
}) {
  const n = bornerEcheances(opts.echeances);
  const mensualites = repartirMensualites(opts.montantCentimes, n);
  const mensualite = mensualites[n - 1]; // la mensualité « normale »
  const reliquat = mensualites[0] - mensualite; // ajouté à la première facture

  const body: Record<string, unknown> = {
    mode: "subscription",
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    customer_email: opts.clientEmail ?? undefined,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: mensualite,
          recurring: { interval: "month" },
          product_data: { name: `Cotisation — ${opts.coursNom} (${n} mensualités)` },
        },
      },
    ],
    subscription_data: { metadata: { adhesion_id: opts.adhesionId, echeances: String(n) } },
    metadata: { adhesion_id: opts.adhesionId, echeances: String(n) },
  };

  if (reliquat > 0) {
    (body.subscription_data as Record<string, unknown>).add_invoice_items = [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: reliquat,
          product_data: { name: "Ajustement d’arrondi" },
        },
      },
    ];
  }

  return call("POST", "/checkout/sessions", body, opts.clubAccount);
}

type ScheduleStripe = {
  id: string;
  end_behavior?: string;
  phases?: Array<{ items?: Array<{ price?: string; quantity?: number }>; start_date?: number }>;
};

/**
 * Après le checkout : borne l'abonnement à exactement N échéances, puis annulation.
 *
 * REJOUABLE (4e audit) : le webhook `checkout.session.completed` peut être redélivré par
 * Stripe si une étape ultérieure échoue. Recréer alors un échéancier avec
 * `from_subscription` sur un abonnement qui en possède déjà un fait échouer l'appel — et
 * l'événement s'empoisonnait. On commence donc par relire l'abonnement : échéancier déjà
 * borné → il n'y a rien à faire ; échéancier existant mais pas encore borné → on le
 * reprend là où il en était.
 *
 * Et si le prix de la phase est introuvable, on LÈVE au lieu de sortir en silence : un
 * retour silencieux laissait l'abonnement SANS borne — prélèvements au-delà du nombre de
 * mensualités convenu. L'erreur fait rejouer l'événement plutôt que laisser courir.
 */
export async function planifierEcheances(subscriptionId: string, clubAccount: string, echeances: number) {
  const n = bornerEcheances(echeances);

  const sub = (await call("GET", `/subscriptions/${subscriptionId}`, undefined, clubAccount)) as {
    schedule?: string | { id: string } | null;
  };
  const scheduleExistant = typeof sub.schedule === "string" ? sub.schedule : sub.schedule?.id ?? null;

  let schedule: ScheduleStripe;
  if (scheduleExistant) {
    schedule = (await call("GET", `/subscription_schedules/${scheduleExistant}`, undefined, clubAccount)) as ScheduleStripe;
    // Déjà borné lors d'un passage précédent (end_behavior « cancel ») : rien à refaire.
    if (schedule.end_behavior === "cancel") return;
  } else {
    schedule = (await call(
      "POST",
      "/subscription_schedules",
      { from_subscription: subscriptionId },
      clubAccount
    )) as ScheduleStripe;
  }

  const phase = schedule.phases?.[0];
  const item = phase?.items?.[0];
  if (!item?.price) {
    throw new Error(
      `planifierEcheances : prix introuvable sur l'échéancier ${schedule.id} (abonnement ${subscriptionId}) — abonnement non borné, rejeu demandé.`
    );
  }

  await call(
    "POST",
    `/subscription_schedules/${schedule.id}`,
    {
      end_behavior: "cancel",
      phases: [
        {
          start_date: phase?.start_date,
          iterations: n,
          items: [{ price: item.price, quantity: item.quantity ?? 1 }],
        },
      ],
    },
    clubAccount
  );
}

/**
 * Relit une charge avec ses remboursements, sur le compte connecté du club. Sert au
 * webhook `charge.refunded` quand le payload n'inclut pas `refunds.data` : on n'y devine
 * jamais un delta à partir du cumul `amount_refunded`.
 */
export async function getChargeAvecRefunds(chargeId: string, clubAccount: string) {
  return call("GET", `/charges/${chargeId}?expand[]=refunds`, undefined, clubAccount) as Promise<{
    id: string;
    refunds?: { data?: Array<{ id?: string; amount?: number }> };
  }>;
}

// Retrouve les métadonnées d'un abonnement (webhook facture → adhesion_id).
export async function getSubscription(subscriptionId: string, clubAccount: string) {
  return call("GET", `/subscriptions/${subscriptionId}`, undefined, clubAccount) as Promise<{
    id: string;
    metadata?: Record<string, string>;
  }>;
}

export interface StripeEvent {
  id: string;
  type: string;
  account?: string; // présent pour les événements Connect (compte du club)
  /**
   * Mode réel de l'événement, tel que Stripe l'annonce. Il n'était pas conservé : le
   * traitement choisissait le compartiment test ou production d'après une variable
   * globale, sans jamais confronter les deux. Un événement de test pouvait donc être
   * écrit côté production, ou l'inverse (relevé à l'audit du 21/07/2026).
   */
  livemode?: boolean;
  data: { object: Record<string, unknown> };
}

/** Événement vérifié, accompagné du mode déduit du secret qui a validé sa signature. */
export interface WebhookVerifie {
  event: StripeEvent;
  live: boolean;
}

// Fenêtre de validité d'une signature Stripe. Au-delà, on refuse : sans cela, un
// payload signé capturé resterait rejouable indéfiniment.
const TOLERANCE_SECONDES = 300;

export function verifyWebhook(rawBody: string, sigHeader: string | null, secret: string): StripeEvent | null {
  if (!sigHeader) return null;
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(",")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return null;

  const horodatage = Number(t);
  if (!Number.isFinite(horodatage)) return null;
  const ecart = Math.abs(Math.floor(Date.now() / 1000) - horodatage);
  if (ecart > TOLERANCE_SECONDES) return null;

  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) return null;
  } catch {
    return null;
  }
  return JSON.parse(rawBody);
}

/** Les secrets avec le mode auquel chacun appartient. */
function secretsParMode(): { secret: string; live: boolean }[] {
  const decouper = (v: string | undefined) =>
    (v ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  const test = decouper(process.env.STRIPE_WEBHOOK_SECRET_TEST).map((secret) => ({ secret, live: false }));
  const live = decouper(process.env.STRIPE_WEBHOOK_SECRET).map((secret) => ({ secret, live: true }));
  return stripeModeTest ? [...test, ...live] : [...live, ...test];
}

/**
 * Vérifie la signature contre chacun des secrets connus (test et live).
 * Un seul endpoint sert les deux modes : sans cela, basculer en production
 * exigerait de reconfigurer Stripe, et on oublierait.
 *
 * Le mode n'est plus déduit d'une variable globale mais du secret qui a effectivement
 * validé la signature — et il doit concorder avec le `livemode` annoncé par Stripe.
 * Toute incohérence est refusée : c'est le seul moyen d'empêcher qu'un événement de
 * test soit comptabilisé comme un encaissement réel.
 */
export function verifyWebhookMulti(rawBody: string, sigHeader: string | null): WebhookVerifie | null {
  for (const { secret, live } of secretsParMode()) {
    const event = verifyWebhook(rawBody, sigHeader, secret);
    if (!event) continue;
    if (typeof event.livemode === "boolean" && event.livemode !== live) {
      console.error("webhook: mode du secret et livemode incohérents", { id: event.id, live, livemode: event.livemode });
      return null;
    }
    return { event, live };
  }
  return null;
}
