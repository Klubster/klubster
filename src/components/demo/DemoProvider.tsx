"use client";

import { createContext, Fragment, useCallback, useContext, useMemo, useReducer } from "react";
import { creerEtatDemoInitial, reducteurDemo, type ActionDemo, type EtatDemo } from "@/lib/demo/etat";

/**
 * Le porteur de l'état simulé, monté une fois dans le layout de `/demo`.
 *
 * POURQUOI DANS LE LAYOUT
 * Un layout Next ne se remonte pas quand on navigue entre ses pages filles. L'état
 * survit donc au passage d'Adhérents à Paiements : le visiteur qui encaisse un chèque le
 * retrouve dans la remise, et c'est ce qui fait comprendre le produit. Un état par page
 * aurait donné sept démonstrations sans lien.
 *
 * POURQUOI UNE GÉNÉRATION DE RÉINITIALISATION
 * Remettre l'état métier à zéro ne suffisait pas. Les écrans gardent des SAISIES LOCALES
 * — un prénom tapé sans être enregistré, une recherche non appliquée, un montant modifié,
 * un panneau de remboursement ouvert. Elles ne vivent pas dans le réducteur, donc elles
 * survivaient à « RÉINITIALISER ».
 *
 * Le cas qui le montre : Marion est enregistrée « Marion », le visiteur tape
 * « Mathilde » sans enregistrer, puis réinitialise. L'état contient « Marion » avant et
 * après — les clés des sous-composants ne changent donc pas, et le champ reste sur
 * « Mathilde ». Le bouton semble n'avoir rien fait.
 *
 * La génération incrémente à chaque réinitialisation et sert de clé autour des enfants :
 * tout l'arbre est démonté et remonté, donc TOUTES les saisies locales disparaissent —
 * y compris celles des écrans qu'on n'a pas encore écrits.
 *
 * Les actions ordinaires, elles, ne la touchent pas : cocher une pièce ne fait pas
 * perdre un formulaire à moitié rempli.
 *
 * CE QU'IL NE FAIT PAS
 * Il n'écrit nulle part. Pas de `localStorage`, pas de `sessionStorage`, pas de cookie,
 * pas d'IndexedDB, pas de requête réseau. Fermer l'onglet ou recharger la page suffit à
 * tout effacer, sans que rien n'ait jamais quitté la mémoire du navigateur.
 */

type Contexte = { etat: EtatDemo; envoyer: (a: ActionDemo) => void };

const DemoContext = createContext<Contexte | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Initialisation PARESSEUSE, par la fabrique : le troisième argument de `useReducer`
  // n'est appelé qu'au premier rendu, et il rend des structures neuves. Passer un objet
  // constant en second argument aurait partagé ses tableaux entre le module et l'état.
  const [etat, dispatch] = useReducer(reducteurDemo, undefined, creerEtatDemoInitial);
  const [generation, incrementerGeneration] = useReducer((n: number) => n + 1, 0);

  const envoyer = useCallback((action: ActionDemo) => {
    if (action.type === "reinitialiser") incrementerGeneration();
    dispatch(action);
  }, []);

  const valeur = useMemo(() => ({ etat, envoyer }), [etat, envoyer]);

  return (
    <DemoContext.Provider value={valeur}>
      <Fragment key={generation}>{children}</Fragment>
    </DemoContext.Provider>
  );
}

export function useDemo(): Contexte {
  const ctx = useContext(DemoContext);
  // Une erreur explicite plutôt qu'un `undefined` qui casserait trente lignes plus loin.
  if (!ctx) throw new Error("useDemo doit être utilisé à l’intérieur de <DemoProvider>.");
  return ctx;
}
