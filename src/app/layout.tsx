import type { Metadata } from "next";
import "./globals.css";

// RGPD — exécution des fonctions serveur en Europe (Paris). Les données ne sortent pas de l'UE.
export const preferredRegion = "cdg1";

export const metadata: Metadata = {
  title: "Klubster — Toute votre association, au même endroit",
  description:
    "Inscriptions, adhérents, paiements, communication, site web — Klubster réunit tout ce dont une association sportive a besoin dans un seul outil, pensé pour les bénévoles. Créé par un président, pour les présidents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Space+Mono:wght@400;700&family=IBM+Plex+Mono:wght@500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
