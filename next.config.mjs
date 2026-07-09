/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
    ],
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
