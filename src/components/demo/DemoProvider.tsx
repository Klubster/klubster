"use client";

import { createContext, useContext, useMemo, useReducer } from "react";
import { creerEtatDemoInitial, reducteurDemo, type ActionDemo, type EtatDemo } from "@/lib/demo/etat";

/**
 * Le porteur de l'état simulé, monté une fois dans le layout de `/demo`.
 *
 * POURQUOI DANS LE LAYOUT
 * Un layout Next ne se remonte pas quand on navigue entre ses pages filles. L'état
 * survit donc au passage d'Adhérents à Paiements : le visiteur qui encaisse un chèque le
 * retrouve dans la liste des chèques à remettre, et c'est précisément ce qui fait
 * comprendre le produit. Un état par page aurait donné sept démonstrations sans lien.
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
  // constant en second argument aurait partagé ses tableaux entre le module et l'état —
  // et deux onglets ouverts sur /demo auraient partagé les mêmes.
  const [etat, envoyer] = useReducer(reducteurDemo, undefined, creerEtatDemoInitial);
  const valeur = useMemo(() => ({ etat, envoyer }), [etat]);
  return <DemoContext.Provider value={valeur}>{children}</DemoContext.Provider>;
}

export function useDemo(): Contexte {
  const ctx = useContext(DemoContext);
  // Une erreur explicite plutôt qu'un `undefined` qui casserait trente lignes plus loin.
  if (!ctx) throw new Error("useDemo doit être utilisé à l’intérieur de <DemoProvider>.");
  return ctx;
}
