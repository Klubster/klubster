import type { Metadata } from "next";
import "./globals.css";

// RGPD — exécution des fonctions serveur en Europe (Paris). Les données ne sortent pas de l'UE.
export const preferredRegion = "cdg1";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";
const DESCRIPTION =
  "Inscriptions, paiements, communication, site web — Klubster réunit tout ce dont une association a besoin dans un seul outil, pensé pour les bénévoles. Prêt en moins de 30 minutes.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Klubster — Toute votre association, au même endroit",
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: SITE,
    siteName: "Klubster",
    title: "Klubster — Toute votre association, au même endroit",
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: "Klubster — Toute votre association, au même endroit",
    description: DESCRIPTION,
  },
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
