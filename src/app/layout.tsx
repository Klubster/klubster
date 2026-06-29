import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Klubster — votre association entièrement en ligne",
  description:
    "Le logiciel créé par un président d'association, pour les présidents d'association. Site, inscriptions, paiements et adhérents — en ligne en moins de 20 minutes.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter (corps) + Space Mono (titres/labels/chiffres) — voir DESIGN_SYSTEM */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
