import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Webhook Resend — idempotence, désordre, et non-régression d'état.
 *
 * La logique vit en SQL (`appliquer_evenement_resend`), parce que c'est le seul endroit
 * où l'atomicité est garantie. On la vérifie donc sur le texte de la migration : chaque
 * transition doit être gardée par « l'horodatage est encore nul », et le statut visible
 * doit être DÉRIVÉ, jamais écrasé.
 */

const SQL = readFileSync(join(process.cwd(), "supabase/migrations/0024_campagnes_messages.sql"), "utf8");
const ROUTE = readFileSync(join(process.cwd(), "src/app/api/resend/webhook/route.ts"), "utf8");

const FN = SQL.match(/create or replace function public\.appliquer_evenement_resend[\s\S]*?\n\$\$;/)?.[0] ?? "";

describe("idempotence des événements", () => {
  it.each([
    ["email.delivered", "delivered_at"],
    ["email.delivery_delayed", "delayed_at"],
    ["email.bounced", "bounced_at"],
    ["email.failed", "failed_at"],
    ["email.complained", "complained_at"],
    ["email.suppressed", "suppressed_at"],
    ["email.sent", "accepted_at"],
  ])("%s n’agit que si %s est encore nul — un rejeu n’incrémente rien", (type, colonne) => {
    const branche = FN.match(new RegExp(`p_type = '${type.replace(".", "\\.")}' and v_rec\\.${colonne} is null`));
    expect(branche, `garde manquante pour ${type}`).toBeTruthy();
  });

  it("le bail d’événement reprend le motif atomique éprouvé de Stripe", () => {
    expect(SQL).toMatch(/insert into resend_events[\s\S]*?on conflict \(svix_id\) do update/);
    // Une seule instruction : deux livraisons concurrentes ne peuvent pas passer toutes deux.
    expect(SQL).toMatch(/claim_resend_event/);
  });

  it("l’identité d’un événement vient de svix-id, stable entre deux tentatives", () => {
    expect(ROUTE).toMatch(/svix-id/);
    expect(ROUTE).toMatch(/p_svix_id/);
  });

  it("un événement déjà traité est acquitté sans être rejoué", () => {
    expect(ROUTE).toMatch(/bail !== "nouveau"[\s\S]*?status: 200/);
  });
});

describe("désordre et non-régression", () => {
  it("le statut visible est dérivé par gravité, jamais écrasé par le dernier arrivé", () => {
    const derive = FN.match(/update message_recipients set statut = case[\s\S]*?end\b/)?.[0] ?? "";
    // L'ordre des branches EST la règle de précédence : une plainte ou un rejet prime
    // sur une distribution, même si la distribution est arrivée après.
    const ordre = ["complained_at", "bounced_at", "failed_at", "suppressed_at", "delivered_at", "delayed_at", "accepted_at"];
    const positions = ordre.map((c) => derive.indexOf(c));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("un identifiant fournisseur inconnu ne modifie rien et n’est pas une erreur", () => {
    expect(FN).toMatch(/if not found then return false; end if;/);
  });

  it("l’unicité de provider_message_id empêche deux destinataires de revendiquer le même envoi", () => {
    expect(SQL).toMatch(/create unique index[\s\S]*?message_recipients \(provider_message_id\)/);
  });
});

describe("signature et journaux", () => {
  it("la signature est vérifiée sur le corps brut, avant tout traitement", () => {
    expect(ROUTE).toMatch(/const corps = await req\.text\(\)/);
    expect(ROUTE).toMatch(/signatureValide\(corps, req\.headers, secret\)/);
    // Le rejet doit précéder toute écriture en base. On vise l'APPEL de la RPC, pas la
    // mention du nom dans le commentaire de tête — qui vient forcément plus tôt.
    expect(ROUTE.indexOf("signatureValide(corps")).toBeLessThan(ROUTE.indexOf('rpc("claim_resend_event"'));
  });

  it("la fenêtre temporelle interdit le rejeu d’une requête interceptée", () => {
    expect(ROUTE).toMatch(/TOLERANCE_SECONDES/);
  });

  it("la comparaison de signature est à temps constant", () => {
    expect(ROUTE).toMatch(/timingSafeEqual/);
  });

  it("aucune adresse en clair dans les journaux techniques", () => {
    const logs = ROUTE.match(/console\.error\([^)]*\)/g) ?? [];
    for (const l of logs) {
      expect(l).not.toMatch(/email\b(?!_id)/);
      expect(l).not.toMatch(/destinataire/);
    }
    // Seul l'identifiant Resend est journalisé.
    expect(ROUTE).toMatch(/emailId \?\? "sans id"/);
  });
});

describe("clé d’idempotence à l’envoi", () => {
  it("chaque lot porte sa propre clé, pour qu’un nouvel essai ne renvoie pas les précédents", () => {
    const resend = readFileSync(join(process.cwd(), "src/lib/resend.ts"), "utf8");
    expect(resend).toMatch(/"Idempotency-Key": `message-campaign\/\$\{opts\.campaignId\}\/batch\/\$\{opts\.numeroLot\}`/);
  });

  it("les étiquettes Resend portent la campagne, le destinataire et l’organisation", () => {
    const resend = readFileSync(join(process.cwd(), "src/lib/resend.ts"), "utf8");
    for (const t of ["category", "campaign_id", "recipient_id", "organisation_id"]) {
      expect(resend).toMatch(new RegExp(`name: "${t}"`));
    }
  });
});

describe("pagination du détail", () => {
  it("les destinataires sont paginés par range(), pas chargés d’un bloc", () => {
    const page = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/communication/[id]/page.tsx"), "utf8");
    expect(page).toMatch(/\.range\(debut, debut \+ PAR_PAGE - 1\)/);
    expect(page).toMatch(/count: "exact"/);
    // 50 par page : sous la limite PostgREST de 1 000, et tenable sur un téléphone.
    expect(page).toMatch(/PAR_PAGE = 50/);
  });

  it("le détail exige la permission messages, pas la seule appartenance au club", () => {
    const page = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/communication/[id]/page.tsx"), "utf8");
    expect(page).toMatch(/verifierPermission\(asso, "messages"\)/);
    // Seconde barrière explicite en plus de la RLS.
    expect(page).toMatch(/\.eq\("organisation_id", org\.id\)/);
  });

  it("l’historique de la page principale n’est chargé qu’avec la permission", () => {
    const page = readFileSync(join(process.cwd(), "src/app/[asso]/cockpit/communication/page.tsx"), "utf8");
    expect(page).toMatch(/peutVoirHistorique/);
    expect(page).toMatch(/verifierPermission\(params\.asso, "messages"\)/);
  });
});
