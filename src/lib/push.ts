// Web Push (notifications de l'éditeur). Repris du cockpit dcidda. Émission via `web-push`
// et VAPID ; stockage des abonnements dans push_subscriptions (service-role uniquement).
// Env requis : NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto).
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@klubster.fr";
  if (!pub || !priv) throw new Error("VAPID manquant");
  webpush.setVapidDetails(subject, pub, priv);
  configured = true;
}

// Client service-role : la route/l'action n'a pas toujours de session, et push_subscriptions
// est fermée à la clé anon.
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type PushSub = { endpoint: string; keys: { p256dh: string; auth: string } };
export type PushPayload = { title: string; body: string; url?: string };

export async function saveSubscription(sub: PushSub, label?: string) {
  const sb = admin();
  if (!sb) return;
  await sb.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      p256dh: sub.keys.p256dh,
      auth: sub.keys.auth,
      label: label ?? null,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
}

export async function removeSubscription(endpoint: string) {
  const sb = admin();
  if (!sb) return;
  await sb.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

export async function sendToAll(payload: PushPayload) {
  const sb = admin();
  if (!sb) return { sent: 0, pruned: 0, total: 0 };
  try {
    configure();
  } catch {
    return { sent: 0, pruned: 0, total: 0 };
  }
  const { data } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth");
  const subs = (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
  let sent = 0;
  let pruned = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent++;
      } catch (e: unknown) {
        const code = (e as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
          pruned++;
        }
      }
    }),
  );
  return { sent, pruned, total: subs.length };
}
