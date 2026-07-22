import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Rejouabilité de `planifierEcheances` (4e audit).
 *
 * Stripe redélivre `checkout.session.completed` dès qu'une étape du traitement échoue.
 * La fonction doit donc pouvoir repasser sur un abonnement déjà traité sans recréer
 * d'échéancier — et surtout ne JAMAIS sortir en silence quand le prix de la phase est
 * introuvable : l'abonnement resterait sans borne, prélevé au-delà des mensualités
 * convenues.
 *
 * On simule l'API Stripe en remplaçant `fetch` : chaque scénario scripte les réponses
 * et vérifie exactement quels appels sont partis.
 */

// La clé est lue à l'import du module : on la pose avant.
process.env.STRIPE_SECRET_KEY_TEST = "sk_test_fake";
process.env.STRIPE_MODE = "test";
const { planifierEcheances } = await import("@/lib/stripe");

type Appel = { method: string; url: string; body: string };

function scripterStripe(reponses: Record<string, unknown>): Appel[] {
  const appels: Appel[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    appels.push({ method, url: String(url), body: String(init?.body ?? "") });
    const chemin = String(url).replace("https://api.stripe.com/v1", "");
    const cle = `${method} ${chemin}`;
    if (!(cle in reponses)) throw new Error(`Appel Stripe non scripté : ${cle}`);
    return { ok: true, json: async () => reponses[cle] } as Response;
  });
  return appels;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("planifierEcheances — rejouable, jamais silencieuse", () => {
  it("cas nominal : crée l'échéancier puis le borne à N mensualités avec annulation", async () => {
    const appels = scripterStripe({
      "GET /subscriptions/sub_1": { schedule: null },
      "POST /subscription_schedules": {
        id: "sched_1",
        phases: [{ start_date: 1750000000, items: [{ price: "price_1", quantity: 1 }] }],
      },
      "POST /subscription_schedules/sched_1": { id: "sched_1" },
    });

    await planifierEcheances("sub_1", "acct_1", 3);

    const borne = appels.find((a) => a.url.endsWith("/subscription_schedules/sched_1"));
    expect(borne).toBeDefined();
    expect(borne!.body).toContain("end_behavior=cancel");
    expect(borne!.body).toContain("iterations%5D=3");
  });

  it("rejeu après succès : un échéancier déjà borné n'est PAS recréé ni modifié", async () => {
    const appels = scripterStripe({
      "GET /subscriptions/sub_1": { schedule: "sched_1" },
      "GET /subscription_schedules/sched_1": { id: "sched_1", end_behavior: "cancel" },
    });

    await planifierEcheances("sub_1", "acct_1", 3);

    // Aucune écriture : ni création, ni mise à jour.
    expect(appels.filter((a) => a.method === "POST")).toHaveLength(0);
  });

  it("rejeu après panne à mi-chemin : l'échéancier existant est repris et borné", async () => {
    const appels = scripterStripe({
      "GET /subscriptions/sub_1": { schedule: { id: "sched_1" } },
      "GET /subscription_schedules/sched_1": {
        id: "sched_1",
        end_behavior: "release", // créé au passage précédent, jamais borné
        phases: [{ start_date: 1750000000, items: [{ price: "price_1", quantity: 1 }] }],
      },
      "POST /subscription_schedules/sched_1": { id: "sched_1" },
    });

    await planifierEcheances("sub_1", "acct_1", 6);

    // Pas de nouvelle création — on reprend sched_1 et on le borne.
    expect(appels.some((a) => a.method === "POST" && a.url.endsWith("/subscription_schedules"))).toBe(false);
    const borne = appels.find((a) => a.method === "POST" && a.url.endsWith("/subscription_schedules/sched_1"));
    expect(borne!.body).toContain("iterations%5D=6");
  });

  it("prix introuvable : LÈVE au lieu de laisser un abonnement sans borne", async () => {
    scripterStripe({
      "GET /subscriptions/sub_1": { schedule: null },
      "POST /subscription_schedules": { id: "sched_1", phases: [{ items: [{}] }] },
    });

    await expect(planifierEcheances("sub_1", "acct_1", 3)).rejects.toThrow(/non borné/);
  });
});
