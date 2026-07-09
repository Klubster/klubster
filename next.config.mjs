/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
    // Next ne sert que du WebP par défaut. En AVIF, le hero passe de 401 Ko (JPEG source)
    // à ~133 Ko — sans toucher aux photos, donc sans risque pour la direction artistique.
    // L'ordre compte : le navigateur reçoit le premier format qu'il sait lire.
    formats: ["image/avif", "image/webp"],
    // Les photos sont plein cadre : inutile de conserver des variantes minuscules.
    deviceSizes: [640, 828, 1080, 1280, 1920, 2048],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  experimental: {
    serverActions: {
      // Next plafonne le corps d'une Server Action à 1 Mo par défaut. Les photos des
      // chapitres (jusqu'à 5 Mo côté validation) n'atteignaient donc JAMAIS le serveur :
      // l'ajout échouait avant d'exécuter la moindre ligne, sans aucune trace.
      // Vercel plafonne la requête à 4,5 Mo — on reste juste en dessous.
      bodySizeLimit: "4mb",
    },
  },
};
export default nextConfig;
