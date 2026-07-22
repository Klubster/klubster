import type { Metadata, Viewport } from "next";
import { getOrganisationPubliqueBySlug } from "@/lib/queries";
import PWAUpdater from "@/components/site/PWAUpdater";

// PWA par club : chaque site de club est installable comme une app à son nom,
// avec son icône (initiale sur sa couleur) et son thème. Klubster s'efface.
export async function generateMetadata(props: { params: Promise<{ asso: string }> }): Promise<Metadata> {
  const params = await props.params;
  const org = await getOrganisationPubliqueBySlug(params.asso);
  if (!org) return {};
  return {
    manifest: `/${org.slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: org.nom,
      statusBarStyle: "black-translucent",
    },
    icons: {
      apple: `/${org.slug}/icone?taille=180`,
    },
  };
}

export async function generateViewport(props: { params: Promise<{ asso: string }> }): Promise<Viewport> {
  const params = await props.params;
  const org = await getOrganisationPubliqueBySlug(params.asso);
  return {
    themeColor: org?.couleur_primaire ?? "#111111",
  };
}

export default function AssoLayout({ children }: { children: React.ReactNode }) {
  // Les pages d'un club sont l'« app » installée par l'adhérent : on y enregistre le
  // service worker qui tient les mises à jour à jour, en silence.
  return (
    <>
      {children}
      <PWAUpdater />
    </>
  );
}
