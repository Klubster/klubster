import type { Metadata } from "next";
import { Inter, Space_Mono, IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

// Polices auto-hébergées par Next (aucune requête vers Google depuis le navigateur du
// visiteur — cohérent avec la politique de confidentialité — et plus de FOUT).
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--kb-inter" });
const spaceMono = Space_Mono({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--kb-space-mono" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--kb-plex-mono" });
// Titres : sans grotesque, compagnon direct de Space Mono. Donne du caractère aux
// h1/h2/h3 sans toucher au corps de lecture (qui reste sur Inter).
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], display: "swap", variable: "--kb-space-grotesk" });

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
    <html lang="fr" className={`${inter.variable} ${spaceMono.variable} ${plexMono.variable} ${spaceGrotesk.variable}`}>
      {/* Les données structurées de Klubster ne vivent pas ici non plus : posées dans le
          layout racine, elles décrivaient CHAQUE page comme le logiciel Klubster — y
          compris la vitrine d'un club, qui se retrouvait à se déclarer application
          professionnelle en même temps que club sportif. Elles sont dans (marketing). */}
      {/* La mesure d'audience ne vit PAS ici : elle est montée dans le layout du groupe
          (marketing), pour être démontée dès qu'on entre dans l'espace d'un club. */}
      <body>{children}</body>
    </html>
  );
}
