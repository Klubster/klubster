// Service worker de Klubster, servi depuis la racine (portée « / », donc valable pour
// tous les clubs). Il est écrit pour une seule chose : rendre les mises à jour INVISIBLES.
//
// Trois principes tiennent ce fichier :
//
//   1. skipWaiting + clients.claim → une nouvelle version prend la main IMMÉDIATEMENT,
//      sans rester coincée dans l'état « en attente » qui, ailleurs, oblige l'utilisateur
//      à fermer toutes ses fenêtres avant de voir la mise à jour.
//   2. Navigations en « réseau d'abord » → tant qu'il y a du réseau, l'utilisateur voit
//      toujours la dernière version. Le cache ne sert que de repli hors-ligne.
//   3. Seuls les fichiers statiques hachés par Next (immuables) sont mis en cache
//      durablement. On ne met JAMAIS en cache une page de données ni une réponse
//      personnelle : impossible de servir un dossier périmé comme s'il était à jour.
//
// La VERSION est l'empreinte du déploiement : à chaque publication, le corps de ce fichier
// change, le navigateur détecte la différence, active la nouvelle version et recharge la
// page en silence. Servi en `no-cache` pour que cette détection soit immédiate.

export const dynamic = "force-dynamic";

// Empreinte figée au build (voir next.config.mjs) : elle change à chaque déploiement,
// ce qui déclenche la détection et l'activation silencieuse de la nouvelle version.
const VERSION = process.env.KLUBSTER_BUILD ?? "dev";

export async function GET() {
  const js = `
const VERSION = ${JSON.stringify(VERSION)};
const CACHE = "klubster-" + VERSION;

self.addEventListener("install", () => {
  // La nouvelle version n'attend pas la fermeture des onglets pour s'installer.
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    // On efface les caches des versions précédentes pour ne pas laisser traîner d'anciens fichiers.
    const cles = await caches.keys();
    await Promise.all(
      cles.filter((k) => k.startsWith("klubster-") && k !== CACHE).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation vers une page : TOUJOURS le réseau, jamais le cache. Ces pages portent des
  // données personnelles (dossier, cockpit, trésorerie) : on ne les met pas en cache, pour
  // ne jamais risquer d'afficher hors-ligne le dossier figé de quelqu'un sur un appareil
  // partagé. En cas de coupure réseau, un message sobre plutôt qu'une page périmée.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => new Response(
        "<!doctype html><meta charset=utf-8><title>Hors ligne</title>" +
        "<div style='font-family:sans-serif;padding:2rem;text-align:center'>" +
        "<h1>Vous êtes hors ligne</h1><p>Reconnectez-vous pour retrouver votre espace.</p></div>",
        { headers: { "content-type": "text/html; charset=utf-8" }, status: 503 }
      ))
    );
    return;
  }

  // Fichiers statiques hachés par Next (immuables) : cache d'abord, chargement instantané.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith((async () => {
      const enCache = await caches.match(req);
      if (enCache) return enCache;
      const reponse = await fetch(req);
      const cache = await caches.open(CACHE);
      cache.put(req, reponse.clone());
      return reponse;
    })());
    return;
  }

  // Tout le reste (données, réponses personnelles, API) : on ne touche pas, le navigateur
  // va directement au réseau. Rien de personnel n'est mis en cache, donc rien de périmé.
});
`;

  return new Response(js, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      // Le service worker ne doit jamais être servi depuis un cache : sans quoi la
      // détection d'une nouvelle version prendrait du retard.
      "cache-control": "no-cache, no-store, must-revalidate",
      "service-worker-allowed": "/",
    },
  });
}
