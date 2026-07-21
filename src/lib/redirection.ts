/**
 * Destination de redirection après authentification.
 *
 * `next` vient de l'URL : sans contrôle, `?next=https://exemple-malveillant.fr`
 * renverrait l'utilisateur fraîchement authentifié vers un site tiers — redirection
 * ouverte, donc hameçonnage crédible puisque le visiteur vient de saisir son mot de
 * passe sur le vrai site.
 *
 * On n'accepte qu'un chemin interne : commence par « / », jamais par « // » (URL
 * relative au protocole) ni par « /\ » (que certains navigateurs normalisent en « // »).
 *
 * Sorti d'un fichier « use server » pour être testable : ces quelques lignes protègent
 * le moment le plus sensible du parcours, elles méritent des tests qui les couvrent.
 */
export function destinationSure(next: string | undefined | null, defaut = "/creer"): string {
  if (!next || !next.startsWith("/")) return defaut;
  if (next.startsWith("//") || next.startsWith("/\\")) return defaut;
  return next;
}
