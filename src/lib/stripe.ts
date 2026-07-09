import crypto from "crypto";

// Intégration Stripe via l'API REST (sans SDK) — Connect, charges directes (0 % Klubster).
const API = "https://api.stripe.com/v1";
const KEY = process.env.STRIPE_SECRET_KEY;

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

async function call(method: "GET" | "POST", path: string, body?: Dict, stripeAccount?: string) {
  if (!KEY) throw new Error("Stripe non configuré (STRIPE_SECRET_KEY manquante).");
  const headers: Record<string, string> = { Authorization: `Bearer ${KEY}` };
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

export async function createConnectedAccount(email: string | null) {
  return call("POST", "/accounts", {
    type: "express",
    country: "FR",
    email: email ?? undefined,
    business_type: "non_profit",
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
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

// Paiement en 3 fois : abonnement mensuel de 3 échéances (borné puis annulé via webhook).
// ⚠️ Stripe facture des frais à chaque prélèvement — avertissement affiché au club dans l'Atelier.
export async function createCheckout3xForClub(opts: {
  clubAccount: string;
  coursNom: string;
  montantCentimes: number;
  successUrl: string;
  cancelUrl: string;
  adhesionId: string;
  clientEmail?: string | null;
}) {
  const mensualite = Math.round(opts.montantCentimes / 3);
  return call(
    "POST",
    "/checkout/sessions",
    {
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
            product_data: { name: `Cotisation — ${opts.coursNom} (3 mensualités)` },
          },
        },
      ],
      subscription_data: { metadata: { adhesion_id: opts.adhesionId, echeances: "3" } },
      metadata: { adhesion_id: opts.adhesionId, echeances: "3" },
    },
    opts.clubAccount
  );
}

// Après le checkout 3x : borne l'abonnement à exactement 3 échéances, puis annulation automatique.
export async function planifier3Echeances(subscriptionId: string, clubAccount: string) {
  const schedule = (await call(
    "POST",
    "/subscription_schedules",
    { from_subscription: subscriptionId },
    clubAccount
  )) as { id: string; phases?: Array<{ items?: Array<{ price?: string; quantity?: number }>; start_date?: number }> };

  const phase = schedule.phases?.[0];
  const item = phase?.items?.[0];
  if (!item?.price) return;

  await call(
    "POST",
    `/subscription_schedules/${schedule.id}`,
    {
      end_behavior: "cancel",
      phases: [
        {
          start_date: phase?.start_date,
          iterations: 3,
          items: [{ price: item.price, quantity: item.quantity ?? 1 }],
        },
      ],
    },
    clubAccount
  );
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
  data: { object: Record<string, unknown> };
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
