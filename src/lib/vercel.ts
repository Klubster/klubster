// API Vercel (REST) — rattacher les domaines propres des clubs au projet klubster.
// Nécessite VERCEL_TOKEN (env). Projet et équipe sont fixes.
const API = "https://api.vercel.com";
const PROJET = "klubster";
const EQUIPE = "team_7wbZpSm6nWIvcMCVC0Q50iHe"; // klubsters-projects
const TOKEN = process.env.VERCEL_TOKEN;

export function vercelConfigured(): boolean {
  return !!TOKEN;
}

export interface StatutDomaine {
  attache: boolean;   // le domaine est rattaché au projet Vercel
  verifie: boolean;   // Vercel a validé la configuration DNS
  erreur?: string;
}

async function appel(method: "GET" | "POST" | "DELETE", chemin: string, body?: unknown) {
  const res = await fetch(`${API}${chemin}?teamId=${EQUIPE}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, json };
}

// Rattache le domaine au projet (idempotent : "déjà présent" = succès).
export async function attacherDomaine(domaine: string): Promise<{ ok: boolean; erreur?: string }> {
  if (!TOKEN) return { ok: false, erreur: "VERCEL_TOKEN manquante." };
  const res = await appel("POST", `/v10/projects/${PROJET}/domains`, { name: domaine });
  if (res.ok) return { ok: true };
  const err = res.json?.error as { code?: string; message?: string } | undefined;
  if (err?.code === "domain_already_in_use" || err?.code === "duplicate_domain") return { ok: true };
  return { ok: false, erreur: err?.message ?? `Erreur Vercel (${res.status}).` };
}

export async function statutDomaine(domaine: string): Promise<StatutDomaine> {
  if (!TOKEN) return { attache: false, verifie: false, erreur: "VERCEL_TOKEN manquante." };
  const info = await appel("GET", `/v9/projects/${PROJET}/domains/${encodeURIComponent(domaine)}`);
  if (!info.ok) return { attache: false, verifie: false };
  const config = await appel("GET", `/v6/domains/${encodeURIComponent(domaine)}/config`);
  const malConfigure = (config.json?.misconfigured as boolean | undefined) ?? true;
  return { attache: true, verifie: !malConfigure };
}

export async function detacherDomaine(domaine: string): Promise<{ ok: boolean }> {
  if (!TOKEN) return { ok: false };
  const res = await appel("DELETE", `/v9/projects/${PROJET}/domains/${encodeURIComponent(domaine)}`);
  return { ok: res.ok };
}
