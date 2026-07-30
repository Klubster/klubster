import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Second facteur du super-administrateur.
 *
 * POURQUOI — la console `/admin` voit tous les clubs, tous les dossiers, tous les
 * montants et les réglages de la plateforme. Un mot de passe seul y donnait accès.
 * C'était le dernier point ouvert des quatre audits de sécurité.
 *
 * CE QUI A ÉTÉ CHOISI, ET POURQUOI PAS AUTRE CHOSE
 * Supabase Auth ne gère que deux types de facteurs : TOTP (code à six chiffres) et SMS.
 * Il n'y a PAS de WebAuthn, donc pas de passkey : Face ID ne peut pas être un facteur
 * Supabase. La demande (« un code à six chiffres, et Face ID ou Touch ID en plus ») est
 * satisfaite autrement, sans écrire une ligne de cryptographie : le code TOTP se range
 * dans le trousseau iCloud, se synchronise entre iPhone, iPad et Mac, et son
 * remplissage automatique est déverrouillé par Face ID ou Touch ID. Le facteur reste
 * standard ; la biométrie garde le coffre qui le contient.
 *
 * Réimplémenter un facteur à la main sur un produit qui manipule des données de santé
 * et des mineurs a été écarté délibérément.
 *
 * PORTÉE — la règle ci-dessous n'exige le second facteur QUE des comptes qui en ont
 * effectivement enrôlé un. Le super-administrateur étant le seul inscrit, les onze
 * comptes de présidents ne sont pas touchés. C'est le motif « opt-in » recommandé par
 * Supabase, et c'est ce qui rend le déploiement sans risque pour les clubs.
 *
 * EN CAS DE PERTE — pas de porte dérobée dans Klubster. Le facteur se supprime depuis
 * le tableau de bord Supabase, lui-même protégé par sa propre double authentification.
 * C'est volontaire : une trappe de secours applicative serait exactement le contournement
 * que ce facteur cherche à empêcher.
 */

export type EtatMfa = {
  /** Niveau d'assurance de la session en cours : `aal1` (mot de passe) ou `aal2` (mot de passe + facteur). */
  niveau: string | null;
  /** Niveau que la session POURRAIT atteindre. `aal2` signifie qu'un facteur vérifié attend d'être présenté. */
  niveauPossible: string | null;
  /** Le compte a-t-il au moins un facteur TOTP vérifié ? */
  facteurVerifie: boolean;
  /** Un facteur commencé mais jamais confirmé — l'enrôlement a été interrompu. */
  facteurEnAttente: boolean;
  /** La session satisfait-elle l'exigence ? Vrai aussi quand aucun facteur n'est enrôlé. */
  satisfait: boolean;
};

export async function etatMfa(): Promise<EtatMfa> {
  const supabase = await createSupabaseServerClient();

  const [{ data: niveaux }, { data: facteurs }] = await Promise.all([
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.mfa.listFactors(),
  ]);

  const totp = facteurs?.totp ?? [];
  const facteurVerifie = totp.some((f) => f.status === "verified");
  const facteurEnAttente = totp.some((f) => f.status !== "verified");
  const niveau = niveaux?.currentLevel ?? null;

  return {
    niveau,
    niveauPossible: niveaux?.nextLevel ?? null,
    facteurVerifie,
    facteurEnAttente,
    // Sans facteur enrôlé, rien à exiger : on ne verrouille pas un compte hors de sa
    // propre console au motif qu'il n'a pas encore configuré son téléphone.
    satisfait: !facteurVerifie || niveau === "aal2",
  };
}
