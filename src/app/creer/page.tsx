import { getUser } from "@/lib/auth";
import CreerWizard from "./CreerWizard";

export const dynamic = "force-dynamic";

// Plus de mur de connexion à l'entrée : le visiteur qui clique « Créer mon association »
// commence par construire son club (template, nom, couleurs…). Le compte n'est demandé
// qu'au moment où il devient nécessaire — juste avant la publication. Un visiteur qui a
// déjà choisi son template et tapé le nom de son club a investi ; il finira son compte.
// (Avant : redirect("/connexion?next=/creer") — le point de friction n°1 du funnel.)
export default async function CreerPage() {
  const user = await getUser();
  return <CreerWizard connecte={Boolean(user)} />;
}
