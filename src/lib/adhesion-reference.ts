/**
 * L'adhésion de référence d'un adhérent — la règle, écrite une fois.
 *
 * POURQUOI CE FICHIER EXISTE
 * La règle vit dans une RPC Postgres (`verifier_adherent`, migration `0028`), là où elle
 * doit être : c'est la base qui répond au contrôle. Mais le dépôt n'a pas de harnais
 * Postgres, et une règle métier qu'aucun test n'exerce finit par dériver.
 *
 * Ce module est donc la MÊME règle, en TypeScript, exercée par `tests/adhesion-reference.test.ts`.
 * Il n'est pas une reformulation approximative : les quatre critères sont dans le même
 * ordre et avec les mêmes valeurs que le `order by` de la migration, et un test compare
 * le texte du fichier SQL à cette liste pour que les deux ne puissent pas diverger en
 * silence.
 *
 * LA RÈGLE, dans l'ordre :
 *   1. la SAISON COURANTE d'abord — une adhésion de l'an dernier ne dit rien de ce soir ;
 *   2. une adhésion ACTIVE d'abord (`en_attente`, `paye`, `en_retard`) — `liste_attente`,
 *      `annule` et `rembourse` ne donnent aucun droit d'entrer ;
 *   3. la plus RÉCENTE (`created_at` décroissant) ;
 *   4. l'IDENTIFIANT décroissant, UNIQUEMENT pour rendre l'ordre total. Un uuid ne porte
 *      aucun sens chronologique : il ne tranche rien de métier, il garantit seulement que
 *      deux appels rendent la même ligne.
 *
 * `cours` ET `regle` viennent de CETTE adhésion, jamais de deux adhésions différentes.
 * C'est le défaut principal que `0028` corrige : la version précédente posait deux
 * sous-requêtes indépendantes, et pouvait afficher le cours de l'une avec le règlement
 * de l'autre.
 */

/** Les statuts qui décrivent une inscription vivante, dans l'ordre du `check` en base. */
export const STATUTS_ACTIFS = ["en_attente", "paye", "en_retard"] as const;

export type AdhesionReference = {
  id: string;
  saison: string | null;
  statut: string | null;
  cours_id: string | null;
  /** `date` en base — d'où les ex æquo que le quatrième critère départage. */
  created_at: string;
};

/**
 * Choisit l'adhésion de référence parmi celles d'UNE personne.
 *
 * Rend `null` si la liste est vide : le contrôle affiche alors « non réglé », jamais
 * « à jour ». C'est le `coalesce(…, false)` de la RPC, et c'est le bon défaut — sans
 * adhésion, personne n'a payé.
 */
export function adhesionDeReference<T extends AdhesionReference>(
  adhesions: readonly T[],
  saisonCourante: string
): T | null {
  if (adhesions.length === 0) return null;

  const rang = (a: T): [number, number, string, string] => [
    a.saison === saisonCourante ? 0 : 1,
    (STATUTS_ACTIFS as readonly string[]).includes(a.statut ?? "") ? 0 : 1,
    a.created_at,
    a.id,
  ];

  // `slice()` : trier ne doit pas réordonner le tableau de l'appelant — une liste
  // d'adhésions vient souvent d'un état React, où muter est une faute.
  return adhesions.slice().sort((x, y) => {
    const [sx, ax, cx, ix] = rang(x);
    const [sy, ay, cy, iy] = rang(y);
    if (sx !== sy) return sx - sy;
    if (ax !== ay) return ax - ay;
    if (cx !== cy) return cx < cy ? 1 : -1;   // created_at décroissant
    return ix < iy ? 1 : -1;                   // id décroissant
  })[0];
}

/**
 * Ce que le contrôle affiche, dérivé de la SEULE adhésion de référence.
 *
 * `regle` n'est vrai que pour `paye`. Ni `en_attente`, ni `en_retard`, ni une adhésion
 * remboursée ne valent règlement — et surtout, `regle` et `cours` décrivent forcément la
 * même inscription.
 */
export function verdictDuControle<T extends AdhesionReference>(
  adhesions: readonly T[],
  saisonCourante: string
): { coursId: string | null; regle: boolean; reference: T | null } {
  const ref = adhesionDeReference(adhesions, saisonCourante);
  return { coursId: ref?.cours_id ?? null, regle: ref?.statut === "paye", reference: ref };
}
