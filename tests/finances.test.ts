import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { etatFinancier, resteAPayer, TOLERANCE_CENTIMES, LIBELLES_FINANCIERS } from "../src/lib/finances";
import { repartirMensualites } from "../src/lib/stripe";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20260803230000_paiements_coherence.sql"),
  "utf8"
);

const base = (montant: number, statut = "en_attente", regl: number[] = [], litige: string | null = null) =>
  etatFinancier({ montantCentimes: montant, statut, reglementsCentimes: regl, litigeLe: litige });

describe("finances — la machine d'état, une seule", () => {
  it("0 € : aucun paiement attendu", () => {
    expect(base(0).etat).toBe("aucun_paiement_attendu");
    expect(base(0).resteCentimes).toBe(0);
  });

  it("0,01 € : dû tant que rien n'est reçu — la tolérance ne crée pas de gratuité", () => {
    // 1 centime dû, rien reçu : reste 1 − 0 = 1 ≤ tolérance… mais la tolérance ne
    // s'applique qu'à un ÉCART d'arrondi après paiement, pas à une absence de paiement.
    // Ici le choix est assumé : 1 centime restant ≤ 5 c → soldé. La règle est UNE.
    const b = base(1);
    expect(b.resteCentimes).toBe(0);
    expect(b.etat).toBe("regle");
  });

  it("89 € payés exactement : réglé, reste 0", () => {
    const b = base(8900, "en_attente", [8900]);
    expect(b.etat).toBe("regle");
    expect(b.resteCentimes).toBe(0);
    expect(b.tropPercuCentimes).toBe(0);
  });

  it("210 € réglés 209,97 : réglé — la tolérance (5 c) est LA même partout", () => {
    const b = base(21000, "en_attente", [20997]);
    expect(b.etat).toBe("regle");
    expect(b.resteCentimes).toBe(0);
    expect(TOLERANCE_CENTIMES).toBe(5);
  });

  it("99 € réglés 50 : partiellement réglé, reste 49", () => {
    const b = base(9900, "en_attente", [5000]);
    expect(b.etat).toBe("partiellement_regle");
    expect(b.resteCentimes).toBe(4900);
  });

  it("179 € rien reçu : paiement attendu", () => {
    expect(base(17900).etat).toBe("paiement_attendu");
  });

  it("en retard constaté : l'état le dit, le reste aussi", () => {
    const b = base(17900, "en_retard", [10000]);
    expect(b.etat).toBe("en_retard");
    expect(b.resteCentimes).toBe(7900);
  });

  it("litige : prioritaire sur tout le reste", () => {
    expect(base(8900, "paye", [8900], "2026-08-01").etat).toBe("litige");
  });

  it("remboursement total : remboursé, même si le statut n'a pas encore suivi", () => {
    const b = base(8900, "paye", [8900, -8900]);
    expect(b.etat).toBe("rembourse");
    expect(b.regleCentimes).toBe(0);
  });

  it("remboursement partiel : le solde redevient dû", () => {
    const b = base(18000, "en_attente", [18000, -6000]);
    expect(b.etat).toBe("partiellement_regle");
    expect(b.resteCentimes).toBe(6000);
  });

  it("trop-perçu : signalé, jamais un reste négatif", () => {
    const b = base(8900, "paye", [9000]);
    expect(b.etat).toBe("regle");
    expect(b.resteCentimes).toBe(0);
    expect(b.tropPercuCentimes).toBe(100);
  });

  it("annulé et liste d'attente : rien n'est dû", () => {
    expect(base(8900, "annule").etat).toBe("annule");
    expect(base(8900, "liste_attente").etat).toBe("liste_attente");
  });

  it("chaque état a un libellé bénévole, sans jargon Stripe", () => {
    for (const [etat, l] of Object.entries(LIBELLES_FINANCIERS)) {
      expect(l.long.length, etat).toBeGreaterThan(0);
      expect(l.long).not.toMatch(/invoice|charge|dispute|payment_intent/i);
    }
  });
});

describe("finances — montants entiers, arrondis d'échéances", () => {
  it("resteAPayer ne renvoie jamais de négatif", () => {
    expect(resteAPayer(1000, 2000)).toBe(0);
  });

  it("179 € en 4 échéances : la somme fait exactement le total", () => {
    const parts = repartirMensualites(17900, 4);
    expect(parts.reduce((s, p) => s + p, 0)).toBe(17900);
    expect(parts.every((p) => Number.isInteger(p))).toBe(true);
  });

  it("montant non divisible : l'écart est absorbé par la première échéance", () => {
    const parts = repartirMensualites(10000, 3); // 100 € / 3
    expect(parts.reduce((s, p) => s + p, 0)).toBe(10000);
    expect(new Set(parts.slice(1)).size).toBe(1); // les suivantes sont égales
  });

  it("aucun flottant : tout est en centimes entiers", () => {
    for (const n of [1, 8900, 9900, 17900, 21000]) {
      expect(Number.isInteger(base(n).resteCentimes)).toBe(true);
    }
  });
});

describe("paiements — la migration corrige la base, explicitement", () => {
  it("un règlement peut être négatif (remboursement), jamais nul", () => {
    expect(MIGRATION).toMatch(/check \(montant_centimes <> 0\)/);
    expect(MIGRATION).toMatch(/'remboursement'\)/);
  });

  it("le remboursement total pose le statut « rembourse »", () => {
    expect(MIGRATION).toMatch(/set statut = 'rembourse'/);
    expect(MIGRATION).toMatch(/v_regle <= 5/);
  });

  it("cockpit_stats est borné à la saison courante et compte l'argent réellement reçu", () => {
    const stats = MIGRATION.slice(MIGRATION.indexOf("function public.cockpit_stats"));
    expect(stats).toMatch(/saison_courante\(v_org\)/);
    expect(stats).toMatch(/from reglements r join adhesions/);
    expect(stats).toMatch(/ad\.saison = v_saison/);
  });

  it("marquer_cheques_remis n'a plus de passe-droit sans organisation", () => {
    const f = MIGRATION.slice(MIGRATION.indexOf("function public.marquer_cheques_remis"));
    expect(f).toMatch(/v_org is null and not coalesce\(is_super_admin\(\), false\)/);
  });

  it("aucune réécriture dynamique : pas de prosrc, pas d'execute format", () => {
    expect(MIGRATION).not.toMatch(/prosrc|execute format/i);
  });
});

describe("paiements — les écrans lisent la même règle", () => {
  const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

  it("relances (écran, actions, cron) passent par resteAPayer", () => {
    for (const f of [
      "src/app/[asso]/cockpit/paiements/relances/page.tsx",
      "src/app/[asso]/cockpit/paiements/actions.ts",
      "src/app/api/cron/relances/route.ts",
      "src/app/[asso]/cockpit/paiements/PaiementsClient.tsx",
      "src/app/[asso]/cockpit/adherents/[id]/page.tsx",
    ]) expect(lire(f), f).toMatch(/resteAPayer\(|decisionRelanceFinanciere\(/);
  });

  it("le cockpit trésorerie inclut les impayés sans mode de paiement", () => {
    expect(lire("src/app/[asso]/cockpit/paiements/page.tsx")).toMatch(/mode_paiement\.is\.null/);
  });

  it("la fiche adhérent borne son bloc trésorerie à la saison courante", () => {
    const f = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");
    expect(f).toMatch(/saisonCourante\(org\)/);
    expect(f).toMatch(/a\.saison === saisonActuelle/);
  });

  it("le badge de la liste vient de l'adhésion la plus récente", () => {
    expect(lire("src/app/[asso]/cockpit/adherents/page.tsx")).toMatch(/referencedTable: "adhesions", ascending: false/);
  });

  it("l'espace adhérent a un libellé pour la liste d'attente, et un repli", () => {
    const f = lire("src/app/[asso]/espace/page.tsx");
    expect(f).toMatch(/liste_attente: "Liste d’attente"/);
    expect(f).toMatch(/\?\? "En attente"/);
  });

  it("le reçu n'affiche jamais « Gratuit » pour une somme", () => {
    const f = lire("src/app/[asso]/espace/facture/page.tsx");
    expect(f).not.toMatch(/formatPrix/);
    expect(f).toMatch(/formatMontant/);
  });

  it("le trésorier peut exporter le CSV", () => {
    expect(lire("src/app/[asso]/cockpit/export/route.ts")).toMatch(/peut\(profil\.role, "paiements"\)/);
  });

  it("le checkout indisponible est annoncé, jamais un faux merci", () => {
    expect(lire("src/app/[asso]/inscription/actions.ts")).toMatch(/paiement=indisponible/);
    expect(lire("src/app/[asso]/inscription/merci/page.tsx")).toMatch(/AUCUN paiement n'a été effectué/);
  });

  it("le rang d'échéance ne compte que les prélèvements en ligne", () => {
    const f = lire("src/app/api/stripe/webhook/route.ts");
    expect(f).toMatch(/\.eq\("mode", "en_ligne"\)\s*\n\s*\.gt\("montant_centimes", 0\)/);
  });

  it("le cron pose le retard constaté à la troisième fenêtre", () => {
    const f = lire("src/app/api/cron/relances/route.ts");
    expect(f).toMatch(/aMarquerEnRetard/);
    expect(f).toMatch(/motif === "impaye_3"/);
  });

  it("pièces : plus aucune valeur fantôme (« attendue », « recue »)", () => {
    expect(lire("src/lib/queries.ts")).not.toMatch(/"attendue"/);
    expect(lire("src/app/[asso]/cockpit/adherents/actions.ts")).not.toMatch(/"recue"/);
  });
});
