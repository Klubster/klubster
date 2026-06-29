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

export function verifyWebhook(rawBody: string, sigHeader: string | null, secret: string): { type: string; data: { object: Record<string, unknown> } } | null {
  if (!sigHeader) return null;
  const parts: Record<string, string> = {};
  for (const seg of sigHeader.split(",")) {
    const [k, v] = seg.split("=");
    if (k && v) parts[k.trim()] = v.trim();
  }
  const t = parts["t"];
  const v1 = parts["v1"];
  if (!t || !v1) return null;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(v1))) return null;
  } catch {
    return null;
  }
  return JSON.parse(rawBody);
}
