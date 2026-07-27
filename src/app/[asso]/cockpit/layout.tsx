import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import ChatCockpit from "@/components/site/ChatCockpit";

// Layout du cockpit : rend les pages telles quelles, et greffe la bulle « Écrire à Mathieu »
// pour les membres du club (jamais pour un adhérent, qui a son propre espace). Les pages
// gardent déjà leurs propres accès ; ici on décide seulement de l'affichage du widget.
export default async function CockpitLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ asso: string }>;
}) {
  const { asso } = await params;
  const org = await getOrganisationBySlug(asso);
  const profile = await getProfile();
  const membre =
    !!org &&
    !!profile &&
    (profile.organisation_id === org.id || profile.role === "super_admin") &&
    profile.role !== "adherent";

  return (
    <>
      {children}
      {membre ? <ChatCockpit slug={asso} /> : null}
    </>
  );
}
