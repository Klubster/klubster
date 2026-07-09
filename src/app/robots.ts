import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Espaces privés et parcours transactionnels : aucun intérêt à être indexés.
        disallow: ["/admin", "/connexion", "/creer", "/api/", "/*/cockpit", "/*/espace"],
      },
    ],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
