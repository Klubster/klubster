import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lire = (p: string) => readFileSync(p, "utf8");

/**
 * Chat public et chat cockpit — lot du 26/08/2026 (revue externe).
 *
 * Deux défauts corrigés : l'action publique du chat écrivait en service-role et
 * notifiait Telegram sans aucune garde ; et les trois chemins d'écriture du chat
 * ignoraient les erreurs Supabase avant d'annoncer un succès.
 *
 * Ces tests épinglent les DÉCISIONS structurelles (garde présent, erreur vérifiée
 * avant l'annonce). Les seuils et l'arithmétique du limiteur restent testés là où
 * ils vivent — voir tests/paiement-partage.test.ts pour la doctrine : dès qu'il y
 * a un calcul, on teste des valeurs, pas du texte.
 */

/** Corps d'une fonction exportée — sans les imports du haut de fichier, qui
 *  faussaient les comparaisons d'ordre. */
function corpsDe(source: string, nom: string): string {
  const debut = source.indexOf(`export async function ${nom}`);
  if (debut < 0) throw new Error(`fonction ${nom} introuvable`);
  const suite = source.indexOf("\nexport ", debut + 1);
  return source.slice(debut, suite < 0 ? undefined : suite);
}

const SITE = lire("src/app/(marketing)/chat-site-actions.ts");
const COCKPIT = lire("src/app/[asso]/cockpit/chat-actions.ts");
const REPLY = lire("src/app/api/chat/reply/route.ts");
const CLIENT = lire("src/components/site/ChatSite.tsx");
const ANTIABUS = lire("src/lib/antiabus.ts");

describe("chat public — un robot ne remplit plus la base ni le téléphone", () => {
  it("le garde anti-abus est appelé AVANT toute écriture et toute notification", () => {
    expect(SITE).toMatch(/verifierMessageChatPublic\(\{ visiteurId, nouvelleConversation: !existante \}\)/);
    const envoi = corpsDe(SITE, "envoyerMessageVisiteur");
    const posGarde = envoi.indexOf("verifierMessageChatPublic");
    const posInsert = envoi.indexOf('.from("site_chat_messages")');
    const posTelegram = envoi.indexOf("envoyerTelegram");
    expect(posGarde).toBeGreaterThan(-1);
    expect(posGarde).toBeLessThan(posInsert);
    expect(posGarde).toBeLessThan(posTelegram);
  });

  it("la limitation porte sur l'IP autant que sur le visiteur — un robot change d'identifiant, pas d'adresse", () => {
    expect(ANTIABUS).toMatch(/chat-ip:\$\{adresse\}/);
    expect(ANTIABUS).toMatch(/chat-visiteur:\$\{opts\.visiteurId\}/);
    expect(ANTIABUS).toMatch(/chat-ouverture:\$\{adresse\}/);
  });

  it("les notifications sont espacées par conversation et plafonnées globalement", () => {
    expect(SITE).toMatch(/notificationChatAutorisee\(`v:\$\{id\}`, 5 \* 60 \* 1000\)/);
    expect(ANTIABUS).toMatch(/notif-chat:global-heure/);
  });

  it("le message reste enregistré même quand l'alerte se tait", () => {
    // La notification est conditionnée, jamais l'écriture : l'insert précède le if.
    const envoi = corpsDe(SITE, "envoyerMessageVisiteur");
    expect(envoi.indexOf('.from("site_chat_messages")')).toBeLessThan(envoi.indexOf("notificationChatAutorisee"));
  });
});

describe("un échec d'écriture ne ressemble plus jamais à un succès", () => {
  it("chat public : message non enregistré → ok:false, et rien n'est notifié", () => {
    const envoi = corpsDe(SITE, "envoyerMessageVisiteur");
    expect(envoi).toMatch(/if \(eMsg \|\| !msg\) \{[\s\S]*?return \{ ok: false, raison: "echec" \};/);
    expect(envoi.indexOf("if (eMsg || !msg)")).toBeLessThan(envoi.indexOf("envoyerTelegram"));
  });

  it("chat public : une lecture de fil en échec ne se déguise pas en fil vide", () => {
    expect(SITE).toMatch(/chat site : lecture du fil/);
  });

  it("chat cockpit : le message est écrit AVANT d'alerter l'éditeur", () => {
    const envoi = corpsDe(COCKPIT, "envoyerMessageClub");
    expect(envoi).toMatch(/if \(eMsg \|\| !msg\) \{[\s\S]*?return \{ ok: false \};/);
    const posGarde = envoi.indexOf("if (eMsg || !msg)");
    expect(posGarde).toBeLessThan(envoi.indexOf("sendToAll"));
    expect(posGarde).toBeLessThan(envoi.indexOf("envoyerTelegram"));
  });

  it("réponse depuis Telegram : une écriture refusée renvoie 500 au bot, jamais ok", () => {
    // Deux chemins (visiteur et club) : chacun doit rendre l'échec visible.
    const cinqCents = REPLY.match(/status: 500/g) ?? [];
    expect(cinqCents.length).toBeGreaterThanOrEqual(3); // no_admin + les deux écritures
    expect(REPLY).toMatch(/ecriture_refusee/);
  });

  it("côté visiteur : un envoi refusé retire le message optimiste et rend la saisie", () => {
    expect(CLIENT).toMatch(/m\.filter\(\(x\) => x\.id !== optimiste\.id\)/);
    expect(CLIENT).toMatch(/setTexte\(corps\)/);
    expect(CLIENT).toMatch(/Trop de messages d’affilée/);
  });
});
