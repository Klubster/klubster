/**
 * Longueur minimale d'un mot de passe.
 *
 * Une seule source de vérité : les textes affichés aux bénévoles et les validations
 * serveur ne doivent jamais se contredire. Rien n'est plus décourageant qu'un formulaire
 * qui annonce « 6 caractères minimum » puis refuse un mot de passe de 6 caractères.
 *
 * ⚠️ Cette valeur doit rester alignée sur le réglage Supabase :
 * Authentication → Sign In / Providers → Email → Minimum password length.
 */
export const LONGUEUR_MIN_MDP = 8;
