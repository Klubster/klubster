import type { Metadata, Viewport } from "next";
import PWAUpdater from "@/components/site/PWAUpdater";

// La console est une PWA à part entière : son propre manifest (start_url /admin), son
// icône, et l'enregistrement du service worker (qui porte le push). Installable à l'écran
// d'accueil sur iPhone/iPad — préalable indispensable au Web Push sous iOS.
export const metadata: Metadata = {
  title: "Klubster — Console",
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Klubster Admin", statusBarStyle: "black-translucent" },
  icons: { apple: "/admin-icon.png", icon: "/admin-icon.png" },
};

export const viewport: Viewport = { themeColor: "#111111" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PWAUpdater />
    </>
  );
}
