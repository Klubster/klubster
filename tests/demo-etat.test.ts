import { describe, it, expect } from "vitest";
import { creerEtatDemoInitial, reducteurDemo, type ActionDemo, type EtatDemo } from "@/lib/demo/etat";
import {
  ACTUALITES_INITIALES, ADHERENTS_INITIAUX, ADHESIONS_INITIALES, CAMPAGNES_INITIALES,
  COURS_INITIAUX, FORM_CONFIG_INITIALE, PAGE_CONFIG_INITIALE, PIECES_INITIALES,
  PRESENCES_INITIALES, REGLEMENTS_INITIAUX,
} from "@/lib/demo/donnees";

/**
 * L'état de la démonstration — indépendance, immuabilité, déterminisme.
 *
 * CE QUE CES TESTS PROUVENT, ET POURQUOI ILS SONT NÉCESSAIRES
 * Le réducteur est ÉCRIT comme une fonction pure. Rien dans le langage ne l'y oblige :
 * il pourrait muter un tableau imbriqué, écrire dans une constante importée, ou appeler
 * quelque chose qui a un effet de bord. La pureté est donc une intention — et ces tests
 * sont ce qui la transforme en garantie.
 *
 * Le risque n'est pas théorique. Si une seule branche mutait `donnees.ts`, la corruption
 * survivrait à la réinitialisation : le visiteur croirait repartir de zéro et
 * retrouverait son propre désordre, sans aucun moyen de s'en apercevoir.
 */

/** Photographie profonde, pour comparer AVANT et APRÈS sans partager de référence. */
const photo = (v: unknown) => JSON.stringify(v);

/**
 * Gèle l'objet et tout ce qu'il contient.
 *
 * POURQUOI CET OUTIL EN PLUS DE `photo()`
 * Comparer deux photographies ne voit qu'une mutation qui CHANGE une valeur. En
 * vérifiant que ces tests mordaient, j'ai écrit `pieces[0].statut = "recue"` sur une
 * pièce déjà « reçue » : aucune photo ne bougeait, les cinquante tests restaient verts,
 * et le réducteur mutait pourtant son entrée. Le gel attrape la mutation elle-même, pas
 * son résultat — une affectation sur un objet gelé lève en mode strict, que la valeur
 * change ou non.
 *
 * Les modules ES sont en mode strict par défaut : l'erreur est levée, pas ignorée.
 */
function deepFreeze<T>(objet: T): T {
  if (objet && typeof objet === "object" && !Object.isFrozen(objet)) {
    Object.freeze(objet);
    Object.values(objet).forEach(deepFreeze);
  }
  return objet;
}

const SOURCES = {
  adherents: ADHERENTS_INITIAUX,
  adhesions: ADHESIONS_INITIALES,
  reglements: REGLEMENTS_INITIAUX,
  pieces: PIECES_INITIALES,
  cours: COURS_INITIAUX,
  campagnes: CAMPAGNES_INITIALES,
  actualites: ACTUALITES_INITIALES,
  presences: PRESENCES_INITIALES,
  form: FORM_CONFIG_INITIALE,
  site: PAGE_CONFIG_INITIALE,
};

/** Un échantillon d'actions couvrant chaque famille de mutation. */
const ACTIONS: ActionDemo[] = [
  { type: "adherent/modifier", id: "a01", prenom: "Zoé", nom: "Test", email: "z@example.com", telephone: "06" },
  { type: "adherent/ajouter", prenom: "Nouveau", nom: "Venu", email: "n@example.com", telephone: "", coursId: "c1", mode: "cheque" },
  { type: "adherent/anonymiser", id: "a02" },
  { type: "reglement/ajouter", adhesionId: "ad02", montantCentimes: 5000, mode: "especes", note: null },
  { type: "remboursement/simuler", adhesionId: "ad01", montantCentimes: null },
  { type: "piece/basculer", id: "a03-certificat" },
  { type: "presence/marquer", adherentId: "a05" },
  { type: "cheques/remettre", ids: ["r-acompte-1"] },
  { type: "campagne/ajouter", objet: "Essai", corps: "Bonjour", groupeLibelle: "Tous les adhérents", emails: ["a@example.com"] },
  { type: "cours/ajouter", nom: "Yoga du matin", tarifCentimes: 20000 },
  { type: "cours/modifier", id: "c1", nom: "Hatha", publicCible: "", tarifCentimes: 30000, placesMax: 20, creneaux: [] },
  { type: "actualite/publier", titre: "Titre", texte: "Texte", publieLe: "2026-10-20", aUneImage: false },
  { type: "actualite/supprimer", id: "n2" },
  { type: "form/page-ajouter" },
  { type: "form/champ-ajouter", pageId: "pg1" },
  { type: "form/champ-deplacer", pageId: "pg1", champId: "ch2", sens: -1 },
  { type: "site/deplacer", cle: "cours", sens: 1 },
  { type: "site/retirer", cle: "planning" },
  { type: "site/chapitre-ajouter", typeChapitre: "citation", titre: "", texte: "Une phrase" },
];

describe("la fabrique rend des objets indépendants", () => {
  it("deux appels ne partagent aucune référence", () => {
    const a = creerEtatDemoInitial();
    const b = creerEtatDemoInitial();
    expect(a).not.toBe(b);
    expect(a.adherents).not.toBe(b.adherents);
    expect(a.adherents[0]).not.toBe(b.adherents[0]);
    // Jusqu'aux objets de troisième niveau : un `[...tableau]` ne suffirait pas.
    expect(a.adherents[0].infos).not.toBe(b.adherents[0].infos);
    expect(a.cours[0].creneaux).not.toBe(b.cours[0].creneaux);
    expect(a.cours[0].creneaux[0]).not.toBe(b.cours[0].creneaux[0]);
    expect(a.campagnes[0].destinataires[0]).not.toBe(b.campagnes[0].destinataires[0]);
    expect(a.form.pages[0].champs[0]).not.toBe(b.form.pages[0].champs[0]);
    expect(a.site.ordre).not.toBe(b.site.ordre);
  });

  it("mais des valeurs identiques", () => {
    expect(photo(creerEtatDemoInitial())).toBe(photo(creerEtatDemoInitial()));
  });

  it("aucune référence n’est partagée avec les constantes de donnees.ts", () => {
    const e = creerEtatDemoInitial();
    expect(e.adherents).not.toBe(ADHERENTS_INITIAUX);
    expect(e.adherents[0]).not.toBe(ADHERENTS_INITIAUX[0]);
    expect(e.form.pages).not.toBe(FORM_CONFIG_INITIALE.pages);
    expect(e.site.custom).not.toBe(PAGE_CONFIG_INITIALE.custom);
  });

  it("modifier l’état d’un onglet ne touche pas celui d’un autre", () => {
    // Deux « onglets » : deux états issus de la même fabrique.
    const onglet1 = creerEtatDemoInitial();
    const onglet2 = creerEtatDemoInitial();
    const avant = photo(onglet2);
    reducteurDemo(onglet1, { type: "piece/basculer", id: "a01-certificat" });
    expect(photo(onglet2)).toBe(avant);
  });
});

describe("aucune action ne modifie l’état qu’elle reçoit", () => {
  it.each(ACTIONS.map((a) => [a.type, a] as const))(
    "%s ne peut pas écrire dans un état gelé",
    (_nom, action) => {
      // Le test le plus sévère du fichier : la moindre affectation lève, même si elle
      // réécrit la valeur déjà présente. C'est exactement la mutation que la comparaison
      // par photographie laissait passer.
      const etat = deepFreeze(creerEtatDemoInitial());
      expect(() => reducteurDemo(etat, action)).not.toThrow();
    }
  );

  it.each(ACTIONS.map((a) => [a.type, a] as const))("%s laisse l’ancien état intact", (_nom, action) => {
    const etat = creerEtatDemoInitial();
    const avant = photo(etat);
    reducteurDemo(etat, action);
    expect(photo(etat)).toBe(avant);
  });

  it("toute la séquence s’exécute sur des états gelés de bout en bout", () => {
    // Chaque état produit est gelé avant de servir d'entrée au suivant : aucune branche
    // ne peut donc écrire dans ce qu'elle reçoit, à aucun moment de la chaîne.
    let etat = deepFreeze(creerEtatDemoInitial());
    for (const action of ACTIONS) {
      etat = deepFreeze(reducteurDemo(etat, action));
    }
    expect(etat.adherents.length).toBeGreaterThan(0);
  });

  it("une chaîne d’actions ne corrompt jamais les états intermédiaires", () => {
    let etat: EtatDemo = creerEtatDemoInitial();
    const photos: string[] = [];
    const etats: EtatDemo[] = [];
    for (const action of ACTIONS) {
      photos.push(photo(etat));
      etats.push(etat);
      etat = reducteurDemo(etat, action);
    }
    // Chaque état traversé doit être resté exactement ce qu'il était.
    etats.forEach((e, i) => expect(photo(e)).toBe(photos[i]));
  });
});

describe("aucune action ne modifie les données sources", () => {
  it.each(ACTIONS.map((a) => [a.type, a] as const))("%s laisse donnees.ts intact", (_nom, action) => {
    const avant = photo(SOURCES);
    reducteurDemo(creerEtatDemoInitial(), action);
    expect(photo(SOURCES)).toBe(avant);
  });

  it("même après toute la séquence", () => {
    const avant = photo(SOURCES);
    let etat = creerEtatDemoInitial();
    for (const action of ACTIONS) etat = reducteurDemo(etat, action);
    expect(photo(SOURCES)).toBe(avant);
  });
});

describe("la réinitialisation restaure tout, avec des références neuves", () => {
  it("les valeurs reviennent exactement à l’état de départ", () => {
    let etat = creerEtatDemoInitial();
    const depart = photo(etat);
    for (const action of ACTIONS) etat = reducteurDemo(etat, action);
    expect(photo(etat)).not.toBe(depart);

    const remis = reducteurDemo(etat, { type: "reinitialiser" });
    expect(photo(remis)).toBe(depart);
  });

  it("et les références sont neuves, pas celles de l’état sale", () => {
    let etat = creerEtatDemoInitial();
    for (const action of ACTIONS) etat = reducteurDemo(etat, action);
    const remis = reducteurDemo(etat, { type: "reinitialiser" });
    expect(remis).not.toBe(etat);
    expect(remis.adherents).not.toBe(etat.adherents);
    expect(remis.adherents).not.toBe(ADHERENTS_INITIAUX);
    expect(remis.form.pages).not.toBe(etat.form.pages);
  });

  it("réinitialiser un état déjà propre rend tout de même un objet DIFFÉRENT", () => {
    // Sinon React, qui compare par identité, ne re-rendrait pas — le visiteur cliquerait
    // sur « RÉINITIALISER » et croirait le bouton cassé.
    const etat = creerEtatDemoInitial();
    const remis = reducteurDemo(etat, { type: "reinitialiser" });
    expect(remis).not.toBe(etat);
    expect(photo(remis)).toBe(photo(etat));
  });

  it("le compteur d’identifiants repart de zéro", () => {
    let etat = creerEtatDemoInitial();
    etat = reducteurDemo(etat, { type: "cours/ajouter", nom: "A", tarifCentimes: 100 });
    etat = reducteurDemo(etat, { type: "cours/ajouter", nom: "B", tarifCentimes: 100 });
    expect(etat.compteur).toBeGreaterThan(0);
    expect(reducteurDemo(etat, { type: "reinitialiser" }).compteur).toBe(0);
  });
});

describe("le temps et les identifiants sont déterministes", () => {
  it("deux exécutions identiques produisent exactement le même état", () => {
    // C'est ce qui permet à une capture d'écran de prouver quelque chose, et ce qui
    // évite qu'un rendu serveur diverge du rendu client.
    const jouer = () => {
      let etat = creerEtatDemoInitial();
      for (const action of ACTIONS) etat = reducteurDemo(etat, action);
      return photo(etat);
    };
    expect(jouer()).toBe(jouer());
  });

  it("le réducteur n’appelle ni Date.now ni Math.random", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const source = readFileSync(join(process.cwd(), "src/lib/demo/etat.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/Date\.now\(/);
    expect(source).not.toMatch(/Math\.random\(/);
    expect(source).not.toMatch(/new Date\(\)/);
  });
});
