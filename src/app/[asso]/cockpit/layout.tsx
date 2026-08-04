import { redirect } from "next/navigation";
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

  // Un compte connecté SANS club qui ouvre une URL de cockpit tombait sur une 404 sèche
  // ou revoyait le formulaire de connexion : impasse constatée en exerçant l'onboarding.
  // On l'envoie vers un écran qui explique et propose la suite — sans rien révéler du
  // club visé par l'URL. Les pages du cockpit gardent leurs propres contrôles d'accès.
  if (profile && !profile.organisation_id && profile.role !== "super_admin") {
    redirect("/sans-club");
  }
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
