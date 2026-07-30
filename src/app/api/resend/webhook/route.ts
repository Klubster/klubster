import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

/**
 * Webhook Resend — états d'acheminement des messages de club.
 *
 * CE QU'IL TRAITE : sent, delivered, delivery_delayed, bounced, failed, complained,
 * suppressed. PAS les ouvertures ni les clics : ils ne sont pas activés, et ne le seront
 * pas (voir docs/audit-messages-2026-07-30.md — pixel de traçage, art. 82, réglage au
 * niveau du domaine qui traçerait aussi les questionnaires de santé).
 *
 * SIGNATURE — vérifiée à la main sur le CORPS BRUT, comme le webhook Stripe du projet.
 * Resend signe avec Svix : le message signé est `${svix-id}.${svix-timestamp}.${corps}`,
 * et l'en-tête `svix-signature` contient une ou plusieurs signatures `v1,<base64>`. Le
 * secret est au format `whsec_<base64>` ; c'est sa partie décodée qui sert de clé.
 *
 * IDEMPOTENCE — portée par `svix-id`, stable entre deux tentatives de livraison. Le bail
 * atomique `claim_resend_event` reprend le motif éprouvé de `claim_stripe_event`.
 *
 * ORDRE D'ARRIVÉE — sans importance : chaque événement pose son propre horodatage et le
 * statut visible est dérivé par gravité. Un `delivered` arrivant après un `bounced` ne
 * peut pas faire régresser la ligne.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOLERANCE_SECONDES = 5 * 60;

function signatureValide(corps: string, headers: Headers, secret: string): boolean {
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;

  // Fenêtre temporelle : sans elle, une requête interceptée resterait rejouable.
  const t = Number(timestamp);
  if (!Number.isFinite(t) || Math.abs(Date.now() / 1000 - t) > TOLERANCE_SECONDES) return false;

  const brut = secret.startsWith("whsec_") ? secret.slice(6) : secret;
  let cle: Buffer;
  try {
    cle = Buffer.from(brut, "base64");
  } catch {
    return false;
  }

  const attendue = createHmac("sha256", cle).update(`${id}.${timestamp}.${corps}`).digest("base64");
  const attendueBuf = Buffer.from(attendue);

  // Svix peut envoyer plusieurs signatures (rotation de secret) : une seule doit valoir.
  return signatures.split(" ").some((paire) => {
    const [version, valeur] = paire.split(",");
    if (version !== "v1" || !valeur) return false;
    const recue = Buffer.from(valeur);
    return recue.length === attendueBuf.length && timingSafeEqual(recue, attendueBuf);
  });
}

type EvenementResend = {
  type?: string;
  data?: { email_id?: string; reason?: string; bounce?: { message?: string } };
};

export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret || !url || !service) {
    console.error("resend/webhook: configuration incomplète");
    return NextResponse.json({ recu: false }, { status: 500 });
  }

  const corps = await req.text();
  if (!signatureValide(corps, req.headers, secret)) {
    // Volontairement muet : ne pas indiquer à un appelant non signé ce qui a échoué.
    return NextResponse.json({ recu: false }, { status: 401 });
  }

  const svixId = req.headers.get("svix-id")!;
  let ev: EvenementResend;
  try {
    ev = JSON.parse(corps) as EvenementResend;
  } catch {
    return NextResponse.json({ recu: true }, { status: 200 }); // illisible : ne pas faire rejouer
  }

  const type = ev.type ?? "inconnu";
  const emailId = ev.data?.email_id;

  const supabase = createClient(url, service, { auth: { persistSession: false } });

  const { data: bail, error: eBail } = await supabase.rpc("claim_resend_event", {
    p_svix_id: svixId,
    p_type: type,
  });
  if (eBail) {
    console.error("resend/webhook: bail impossible", eBail.message);
    return NextResponse.json({ recu: false }, { status: 500 }); // 500 → Svix rejouera
  }
  // Déjà traité, ou en cours ailleurs : on acquitte sans retraiter.
  if (bail !== "nouveau") return NextResponse.json({ recu: true }, { status: 200 });

  try {
    if (emailId) {
      const raison = ev.data?.reason ?? ev.data?.bounce?.message ?? null;
      // Un identifiant inconnu n'est PAS une erreur : Resend achemine aussi les emails
      // transactionnels et les relances, qui ne sont pas des campagnes.
      await supabase.rpc("appliquer_evenement_resend", {
        p_provider_message_id: emailId,
        p_type: type,
        p_erreur: raison,
      });
    }

    await supabase
      .from("resend_events")
      .update({ statut: "traite", traite_le: new Date().toISOString() })
      .eq("svix_id", svixId);

    return NextResponse.json({ recu: true }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "erreur inconnue";
    // Jamais l'adresse en clair dans les journaux techniques : seul l'identifiant Resend.
    console.error("resend/webhook: traitement", type, emailId ?? "sans id", message);
    await supabase
      .from("resend_events")
      .update({ statut: "echoue", derniere_erreur: message.slice(0, 500) })
      .eq("svix_id", svixId);
    return NextResponse.json({ recu: false }, { status: 500 });
  }
}
