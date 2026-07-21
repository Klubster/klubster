import { redirect } from "next/navigation";
import { getUser, getProfile, destinationApresConnexion } from "@/lib/auth";
import CreerWizard from "./CreerWizard";

export const dynamic = "force-dynamic";

// Plus de mur de connexion à l'entrée : le visiteur qui clique « Créer mon association »
// commence par construire son club (template, nom, couleurs…). Le compte n'est demandé
// qu'au moment où il devient nécessaire — juste avant la publication. Un visiteur qui a
// déjà choisi son template et tapé le nom de son club a investi ; il finira son compte.
// (Avant : redirect("/connexion?next=/creer") — le point de friction n°1 du funnel.)
export default async function CreerPage() {
  const user = await getUser();

  // Un compte qui gère déjà une association n'a rien à faire ici : la base refuse de
  // toute façon d'en créer une seconde (migration 0002). Sans cette garde, l'assistant
  // s'ouvrait quand même et y restaurait le brouillon local, présentant à un président
  // un club fantôme portant un vieux nom de test — c'est ainsi qu'une association
  // parasite a fini publiée par erreur. On le renvoie vers son cockpit.
  if (user) {
    const profile = await getProfile();
    if (profile?.organisation_id) redirect(await destinationApresConnexion());
  }

  return <CreerWizard connecte={Boolean(user)} />;
}
