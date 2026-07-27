// Manifest de la console : /admin devient une app installable (« Ajouter à l'écran
// d'accueil »), condition nécessaire au Web Push sur iPhone/iPad.
export const dynamic = "force-static";

export async function GET() {
  const manifest = {
    name: "Klubster — Console",
    short_name: "Klubster Admin",
    start_url: "/admin",
    scope: "/admin",
    display: "standalone",
    background_color: "#FCFCFA",
    theme_color: "#111111",
    icons: [
      { src: "/admin-icon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/admin-icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/admin-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json; charset=utf-8" },
  });
}
