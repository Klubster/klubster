// Manifest PWA dynamique : une « app » par club, à ses couleurs.
// L'adhérent installe SON club sur son téléphone et ouvre sa carte d'un tap.
import { getOrganisationPubliqueBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request, props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationPubliqueBySlug(params.asso);
  if (!org) return new Response("Introuvable", { status: 404 });

  // Sur le domaine PROPRE d'un club, les URL visibles ne contiennent pas le slug
  // (`club.fr/espace`), alors que sur la plateforme elles le contiennent
  // (`klubster.fr/slug/espace`). La portée et l'URL de démarrage de la PWA doivent donc
  // s'adapter à l'hôte, sinon l'app installée depuis un domaine propre a une portée
  // erronée. On repère le domaine propre en comparant l'hôte au domaine du club.
  const host = (req.headers.get("host") ?? "").toLowerCase().replace(/^www\./, "");
  const surDomainePropre = !!org.domaine_custom && host === org.domaine_custom.toLowerCase();
  const base = surDomainePropre ? "" : `/${org.slug}`;

  const noir = org.theme_mode === "noir";
  const manifest = {
    name: org.nom,
    short_name: org.nom.length > 12 ? org.nom.slice(0, 12).trimEnd() : org.nom,
    id: base || "/",
    start_url: `${base}/espace`,
    scope: `${base}/`,
    display: "standalone",
    background_color: noir ? "#131312" : "#FCFCFA",
    theme_color: org.couleur_primaire ?? "#111111",
    description: `${org.nom} — carte de membre, dossier et inscriptions.`,
    icons: [
      { src: `${base}/icone?taille=192`, sizes: "192x192", type: "image/png" },
      { src: `${base}/icone?taille=512`, sizes: "512x512", type: "image/png" },
      { src: `${base}/icone?taille=512&maskable=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: { "content-type": "application/manifest+json" },
  });
}
