import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { palierPourEffectif, PALIERS, bornerEcheances, repartirMensualites, verifyWebhook } from "@/lib/stripe";

/**
 * Tarification, échéances et signature des webhooks : ce qui se compte en euros.
 * Une erreur de palier facture le mauvais prix à un club ; une signature mal vérifiée
 * laisse un tiers écrire de faux règlements dans sa trésorerie.
 */

describe("palierPourEffectif — les bornes, là où ça se joue", () => {
  it("un club sans adhérent est au premier palier", () => {
    expect(palierPourEffectif(0)).toBe("starter");
  });
  it("300 adhérents : encore starter", () => {
    expect(palierPourEffectif(300)).toBe("starter");
  });
  it("301 adhérents : on bascule sur club", () => {
    expect(palierPourEffectif(301)).toBe("club");
  });
  it("500 adhérents : encore club", () => {
    expect(palierPourEffectif(500)).toBe("club");
  });
  it("501 adhérents : club_plus", () => {
    expect(palierPourEffectif(501)).toBe("club_plus");
  });
  it("les prix annoncés sur le site sont ceux du code", () => {
    // 9 / 19 / 29 € : le site les affiche en clair, ils ne doivent pas diverger.
    expect(PALIERS.starter.prixCentimes).toBe(900);
    expect(PALIERS.club.prixCentimes).toBe(1900);
    expect(PALIERS.club_plus.prixCentimes).toBe(2900);
  });
});

describe("bornerEcheances", () => {
  it("garde une valeur normale", () => {
    expect(bornerEcheances(3)).toBe(3);
    expect(bornerEcheances("8")).toBe(8);
  });
  it("plafonne à 12", () => {
    expect(bornerEcheances(99)).toBe(12);
  });
  it("plancher à 1", () => {
    expect(bornerEcheances(0)).toBe(1);
    expect(bornerEcheances(-5)).toBe(1);
  });
  it("retombe sur 1 devant une saisie absurde", () => {
    expect(bornerEcheances("abc")).toBe(1);
    expect(bornerEcheances(null)).toBe(1);
    expect(bornerEcheances(undefined)).toBe(1);
  });
});

/** Fabrique un en-tête de signature Stripe valide pour un corps donné. */
function signer(corps: string, secret: string, horodatage = Math.floor(Date.now() / 1000)) {
  const v1 = crypto.createHmac("sha256", secret).update(`${horodatage}.${corps}`).digest("hex");
  return `t=${horodatage},v1=${v1}`;
}

describe("verifyWebhook — signature Stripe", () => {
  const secret = "whsec_test_secret";
  const corps = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", livemode: false, data: { object: {} } });

  it("accepte une signature valide et renvoie l'événement", () => {
    const evt = verifyWebhook(corps, signer(corps, secret), secret);
    expect(evt?.id).toBe("evt_1");
  });

  it("refuse un corps modifié après signature", () => {
    // Le cas qui compte : quelqu'un rejoue une requête en changeant le montant.
    const sig = signer(corps, secret);
    const falsifie = corps.replace("evt_1", "evt_pirate");
    expect(verifyWebhook(falsifie, sig, secret)).toBeNull();
  });

  it("refuse un secret différent", () => {
    expect(verifyWebhook(corps, signer(corps, "whsec_autre"), secret)).toBeNull();
  });

  it("refuse une signature trop ancienne", () => {
    // Au-delà de la tolérance, un payload capté resterait rejouable indéfiniment.
    const vieux = Math.floor(Date.now() / 1000) - 3600;
    expect(verifyWebhook(corps, signer(corps, secret, vieux), secret)).toBeNull();
  });

  it("refuse une signature datée du futur lointain", () => {
    const futur = Math.floor(Date.now() / 1000) + 3600;
    expect(verifyWebhook(corps, signer(corps, secret, futur), secret)).toBeNull();
  });

  it("refuse un en-tête absent ou incomplet", () => {
    expect(verifyWebhook(corps, null, secret)).toBeNull();
    expect(verifyWebhook(corps, "t=123", secret)).toBeNull();
    expect(verifyWebhook(corps, "v1=abc", secret)).toBeNull();
    expect(verifyWebhook(corps, "n'importe quoi", secret)).toBeNull();
  });

  it("conserve livemode, qui départage test et production", () => {
    const enLive = JSON.stringify({ id: "evt_2", type: "invoice.paid", livemode: true, data: { object: {} } });
    const evt = verifyWebhook(enLive, signer(enLive, secret), secret);
    expect(evt?.livemode).toBe(true);
  });
});

describe("repartirMensualites — le paiement en plusieurs fois", () => {
  it("découpe un montant divisible en parts égales", () => {
    expect(repartirMensualites(30000, 3)).toEqual([10000, 10000, 10000]);
  });

  it("la somme des mensualités fait exactement le montant dû", () => {
    // 100 € en 3 fois : 33,33 ne tombe pas juste. Le club doit malgré tout
    // encaisser 100,00 € et pas 99,99 €.
    const parts = repartirMensualites(10000, 3);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(10000);
  });

  it("le reliquat est absorbé par la première échéance", () => {
    expect(repartirMensualites(10000, 3)).toEqual([3334, 3333, 3333]);
  });

  it("une seule échéance rend le montant entier", () => {
    expect(repartirMensualites(15500, 1)).toEqual([15500]);
  });

  it("un nombre d'échéances aberrant est borné avant le découpage", () => {
    expect(repartirMensualites(12000, 99)).toHaveLength(12);
    expect(repartirMensualites(12000, 0)).toEqual([12000]);
  });
});
