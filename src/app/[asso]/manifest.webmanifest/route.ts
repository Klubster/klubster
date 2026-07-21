// Manifest PWA dynamique : une « app » par club, à ses couleurs.
// L'adhérent installe SON club sur son téléphone et ouvre sa carte d'un tap.
import { getOrganisationBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) return new Response("Introuvable", { status: 404 });

  const noir = org.theme_mode === "noir";
  const manifest = {
    name: org.nom,
    short_name: org.nom.length > 12 ? org.nom.slice(0, 12).trimEnd() : org.nom,
    id: `/${org.slug}`,
    start_url: `/${org.slug}/espace`,
    scope: `/${org.slug}`,
    display: "standalone",
    background_color: noir ? "#131312" : "#FCFCFA",
    theme_color: org.couleur_primaire ?? "#111111",
    description: `${org.nom} — carte de membre, dossier et inscriptions.`,
    icons: [
      { src: `/${org.slug}/icone?taille=192`, sizes: "192x192", type: "image/png" },
      { src: `/${org.slug}/icone?taille=512`, sizes: "512x512", type: "image/png" },
      { src: `/${org.slug}/icone?taille=512&maskable=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
