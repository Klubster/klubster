"use client";

// Bouton « Activer les notifications » pour la console (/admin). Abonne l'appareil au
// Web Push. Sur iPhone/iPad, le push n'existe QUE si l'app est installée à l'écran
// d'accueil (iOS 16.4+) — le bouton n'apparaît donc réellement utile que dans la PWA.
import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush } from "@/app/admin/push-actions";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "hidden" | "off" | "on" | "denied" | "busy";

export default function PushSetup() {
  const [state, setState] = useState<State>("hidden");

  useEffect(() => {
    if (!VAPID) return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return;
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready
      .then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "on" : "off");
      })
      .catch(() => setState("off"));
  }, []);

  async function enable() {
    setState("busy");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await subscribePush({ endpoint: json.endpoint, keys: json.keys }, navigator.userAgent.slice(0, 80));
      setState("on");
    } catch {
      setState("off");
    }
  }

  async function disable() {
    setState("busy");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      setState("on");
    }
  }

  if (state === "hidden") return null;
  if (state === "denied") return <span className="mono text-[11px] text-ink-faint">Notifs bloquées (réglages)</span>;
  if (state === "on")
    return (
      <button onClick={disable} className="mono border border-brand-dark px-2.5 py-1 text-[11px] text-brand-dark hover:bg-brand-dark hover:text-white">
        🔔 Notifs activées
      </button>
    );
  return (
    <button onClick={enable} disabled={state === "busy"} className="mono border border-line px-2.5 py-1 text-[11px] hover:border-ink disabled:opacity-40">
      Activer les notifications
    </button>
  );
}
