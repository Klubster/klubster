"use server";

import { verifierSuperAdmin } from "@/lib/admin";
import { saveSubscription, removeSubscription, type PushSub } from "@/lib/push";

// Abonnement/désabonnement d'un appareil aux notifications. Réservé au super_admin :
// sans cette garde, n'importe quel authentifié pourrait s'abonner et recevoir le contenu
// des messages des clubs.
export async function subscribePush(sub: PushSub, label?: string) {
  if (!(await verifierSuperAdmin())) return { ok: false };
  await saveSubscription(sub, label);
  return { ok: true };
}

export async function unsubscribePush(endpoint: string) {
  if (!(await verifierSuperAdmin())) return { ok: false };
  await removeSubscription(endpoint);
  return { ok: true };
}
