/**
 * Vitrines qui appartiennent à Klubster, et non à un client.
 *
 * POURQUOI — la nav d'une vitrine se terminait par « Accueil Klubster », ajouté sans
 * condition à TOUS les clubs. Autrement dit : le site qu'une association paie 9 €/mois
 * affichait un lien vers son prestataire dans sa propre navigation. Ce n'est pas ce
 * qu'elle achète, et aucun club ne l'a demandé (relevé par Mathieu le 29/07/2026).
 *
 * Le lien garde du sens sur les vitrines qui SONT la démonstration de Klubster : on y
 * arrive depuis le site de marque, et repartir vers lui est naturel.
 *
 * Pourquoi une liste plutôt qu'un `slug === "usmboxe"` en dur dans la page : CLAUDE.md
 * l'interdit explicitement — « Si tu te retrouves à coder pour la boxe en dur, tu t'es
 * trompé de couche ». Ici le critère n'est pas le sport, c'est le statut de vitrine
 * de démonstration. Une ligne à ajouter le jour où le cockpit de démonstration aura
 * sa propre vitrine.
 */
export const VITRINES_KLUBSTER = new Set(["usmboxe"]);

export function estVitrineKlubster(slug: string): boolean {
  return VITRINES_KLUBSTER.has(slug);
}
