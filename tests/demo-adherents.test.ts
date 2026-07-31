import { describe, it, expect } from "vitest";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { chiffresDuClub, listerAdherents, nettoyerRecherche, paginer, PAR_PAGE } from "@/lib/demo/selecteurs";
import { COURS_INITIAUX } from "@/lib/demo/donnees";

/**
 * Les adhérents — tarif, liste, renouvellement.
 *
 * POURQUOI CES TESTS AVANT L'INTERFACE
 * Parce qu'une donnée financière fausse se cache derrière des écrans corrects. La
 * démonstration ajoutait « + 18 € d'adhésion à l'association » à chaque cotisation : un
 * forfait qui sonne juste, que beaucoup de clubs pratiquent, et que Klubster ne fait
 * pas. Tous les montants, tous les restes dus et tous les totaux en auraient été
 * décalés — sans qu'aucun test visuel ne s'en aperçoive.
 */

const etatInitial = () => creerEtatDemoInitial();

const ajouter = (etat: EtatDemo, coursId: string, prenom = "Zoé", nom = "Nouvelle") =>
  reducteurDemo(etat, {
    type: "adherent/ajouter",
    prenom,
    nom,
    email: `${prenom.toLowerCase()}@example.com`,
    telephone: "",
    coursId,
    mode: "cheque",
  });

describe("le tarif d’une adhésion est celui du cours, sans supplément", () => {
  it.each(COURS_INITIAUX.map((c) => [c.nom, c.id, c.tarif_centimes] as const))(
    "%s : le montant vaut exactement %s centimes",
    (_nom, coursId, tarif) => {
      const apres = ajouter(etatInitial(), coursId);
      const nouvelle = apres.adhesions[apres.adhesions.length - 1];
      expect(nouvelle.montant_centimes).toBe(tarif);
    }
  );

  it("aucun forfait d’association n’est ajouté nulle part", () => {
    // Le montant de toute adhésion existante doit correspondre au tarif de son cours.
    const etat = etatInitial();
    for (const a of etat.adhesions) {
      if (!a.cours_id) continue;
      const cours = etat.cours.find((c) => c.id === a.cours_id);
      expect(a.montant_centimes).toBe(cours?.tarif_centimes);
    }
  });

  it("l’adhésion naît « en attente », avec le mode choisi et la date du jour", () => {
    const apres = ajouter(etatInitial(), "c1");
    const nouvelle = apres.adhesions[apres.adhesions.length - 1];
    expect(nouvelle.statut).toBe("en_attente");
    expect(nouvelle.mode_paiement).toBe("cheque");
    expect(nouvelle.created_at).toBe("2026-10-20");
  });
});

describe("un ajout sans cours crée l’adhérent, et rien d’autre", () => {
  it("l’adhérent existe, sans aucune adhésion", () => {
    const avant = etatInitial();
    const apres = reducteurDemo(avant, {
      type: "adherent/ajouter",
      prenom: "Sans",
      nom: "Cours",
      email: "sans.cours@example.com",
      telephone: "",
      coursId: "",
      mode: "cheque",
    });

    expect(apres.adherents).toHaveLength(avant.adherents.length + 1);
    // `ajouterAdherent` enveloppe toute la création dans `if (coursId)`.
    expect(apres.adhesions).toHaveLength(avant.adhesions.length);

    const nouvel = apres.adherents[apres.adherents.length - 1];
    expect(apres.adhesions.some((a) => a.adherent_id === nouvel.id)).toBe(false);
  });

  it("il apparaît dans la liste, en « Sans adhésion »", () => {
    const apres = reducteurDemo(etatInitial(), {
      type: "adherent/ajouter",
      prenom: "Sans",
      nom: "Cours",
      email: "",
      telephone: "",
      coursId: "",
      mode: "cheque",
    });
    const ligne = listerAdherents(apres).find((l) => l.adherent.nom === "Cours");
    expect(ligne).toBeTruthy();
    expect(ligne?.adhesion).toBeNull();
    expect(ligne?.nomCours).toBeNull();
  });
});

describe("le renouvellement de saison", () => {
  /** On vide la saison courante pour que le renouvellement ait quelque chose à faire. */
  function saisonPrecedente(): EtatDemo {
    const etat = etatInitial();
    return { ...etat, adhesions: etat.adhesions.map((a) => ({ ...a, saison: "2025-2026" })) };
  }

  it("crée une adhésion « en attente » pour chacun, avec son dernier cours", () => {
    const avant = saisonPrecedente();
    const apres = reducteurDemo(avant, { type: "saison/renouveler" });
    const creees = apres.adhesions.filter((a) => a.saison === "2026-2027");

    expect(creees.length).toBeGreaterThan(0);
    for (const a of creees) {
      expect(a.statut).toBe("en_attente");
      const derniere = avant.adhesions
        .filter((x) => x.adherent_id === a.adherent_id && x.cours_id)
        .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
      expect(a.cours_id).toBe(derniere.cours_id);
    }
  });

  it("ne recrée aucun adhérent", () => {
    const avant = saisonPrecedente();
    const apres = reducteurDemo(avant, { type: "saison/renouveler" });
    expect(apres.adherents).toHaveLength(avant.adherents.length);
  });

  it("un second clic ne crée AUCUN doublon", () => {
    // Le geste d'un président prudent. La RPC réelle est idempotente ; si la démo ne
    // l'était pas, elle doublerait l'effectif sous ses yeux.
    const avant = saisonPrecedente();
    const un = reducteurDemo(avant, { type: "saison/renouveler" });
    const deux = reducteurDemo(un, { type: "saison/renouveler" });

    expect(deux.adhesions).toHaveLength(un.adhesions.length);
    expect(deux.confirmation).toContain("Tout le monde a déjà une adhésion");
  });

  it("sur l’état initial, il n’y a rien à renouveler", () => {
    const apres = reducteurDemo(etatInitial(), { type: "saison/renouveler" });
    expect(apres.adhesions).toHaveLength(etatInitial().adhesions.length);
    expect(apres.confirmation).toContain("Tout le monde a déjà une adhésion");
  });

  it("un adhérent sans aucune adhésion passée n’en reçoit pas", () => {
    // Il n'y a pas de « dernier cours » à reprendre : on n'invente pas.
    const base = saisonPrecedente();
    const avecOrphelin = reducteurDemo(base, {
      type: "adherent/ajouter",
      prenom: "Sans",
      nom: "Historique",
      email: "",
      telephone: "",
      coursId: "",
      mode: "cheque",
    });
    const orphelin = avecOrphelin.adherents[avecOrphelin.adherents.length - 1];
    const apres = reducteurDemo(avecOrphelin, { type: "saison/renouveler" });
    expect(apres.adhesions.some((a) => a.adherent_id === orphelin.id)).toBe(false);
  });
});

describe("la liste — recherche, filtre, tri, pagination", () => {
  it("34 adhérents : 25 sur la première page, 9 sur la seconde", () => {
    const lignes = listerAdherents(etatInitial());
    expect(lignes).toHaveLength(34);
    expect(paginer(lignes, 1).tranche).toHaveLength(PAR_PAGE);
    expect(paginer(lignes, 2).tranche).toHaveLength(9);
    expect(paginer(lignes, 2).pages).toBe(2);
  });

  it("le tri est FIXE par nom croissant", () => {
    const noms = listerAdherents(etatInitial()).map((l) => l.adherent.nom);
    expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, "fr")));
  });

  it("le filtre s’applique AVANT la pagination, jamais l’inverse", () => {
    // L'ordre compte : filtrer après aurait rendu des pages incomplètes, et la
    // dernière page aurait pu être vide sans que le compteur le dise.
    const etat = etatInitial();
    const filtrees = listerAdherents(etat, { statut: "paye" });
    const page1 = paginer(filtrees, 1);

    expect(filtrees.length).toBeLessThan(etat.adherents.length);
    expect(page1.tranche.every((l) => l.adhesion?.statut === "paye")).toBe(true);
    expect(page1.pages).toBe(Math.ceil(filtrees.length / PAR_PAGE));
  });

  it("chaque valeur de filtre ne rend que son statut", () => {
    const etat = etatInitial();
    for (const statut of ["paye", "en_attente", "en_retard", "liste_attente"]) {
      const lignes = listerAdherents(etat, { statut });
      expect(lignes.length).toBeGreaterThan(0);
      expect(lignes.every((l) => l.adhesion?.statut === statut)).toBe(true);
    }
  });

  it("la recherche porte sur le nom, le prénom et l’email", () => {
    const etat = etatInitial();
    expect(listerAdherents(etat, { q: "Berthier" })[0]?.adherent.prenom).toBe("Marion");
    expect(listerAdherents(etat, { q: "marion" })[0]?.adherent.nom).toBe("Berthier");
    expect(listerAdherents(etat, { q: "s.nguyen@example.com" })[0]?.adherent.nom).toBe("Nguyen");
  });

  it("un adhérent sans email reste trouvable par son nom", () => {
    // Michel Chevalier n'a pas d'adresse : la recherche concatène `email ?? ""`, et une
    // valeur nulle mal gérée l'aurait fait disparaître de tous les résultats.
    const trouve = listerAdherents(etatInitial(), { q: "Chevalier" });
    expect(trouve).toHaveLength(1);
    expect(trouve[0].adherent.email).toBeNull();
  });

  it("les caractères que PostgREST n’aime pas sont nettoyés", () => {
    // Virgules et parenthèses ont un sens dans la syntaxe de filtre de PostgREST : le
    // serveur réel les retire avant de construire la requête.
    expect(nettoyerRecherche("Berthier, (Marion)")).toBe("berthier marion");
    expect(nettoyerRecherche("O'Neil*&%")).toBe("oneil");
    expect(nettoyerRecherche("Émilie")).toBe("émilie");
    // Ce qui reste utile est conservé : arobase, point, tiret.
    expect(nettoyerRecherche("s.nguyen@example.com")).toBe("s.nguyen@example.com");
    expect(nettoyerRecherche("Jean-Paul")).toBe("jean-paul");
  });

  it("la ponctuation est retirée, et la recherche fonctionne quand même", () => {
    // La cible est « prénom nom email », en minuscules. Le nettoyage retire la
    // ponctuation sans casser la recherche.
    expect(listerAdherents(etatInitial(), { q: "Berthier)" })).toHaveLength(1);
    expect(listerAdherents(etatInitial(), { q: "(Marion*)" })).toHaveLength(1);
    expect(listerAdherents(etatInitial(), { q: "Nguyen;" })).toHaveLength(1);
  });

  it("les espaces laissés par la ponctuation ne cassent pas la correspondance", () => {
    // « Berthier, (Marion) » devient « berthier marion ». La cible de Marion Berthier
    // est « marion berthier marion.berthier@example.com » : elle CONTIENT bien
    // « berthier marion », à cheval sur le nom et le début de l'email.
    //
    // Ma première version de ce test affirmait le contraire — zéro résultat — et c'est
    // l'assertion qui était fausse, pas le code. Je le note parce que la correspondance
    // est fortuite : elle tient à la façon dont l'adresse est construite, et un autre
    // adhérent ne l'aurait pas eue.
    const trouve = listerAdherents(etatInitial(), { q: "Berthier, (Marion)" });
    expect(trouve).toHaveLength(1);
    expect(trouve[0].adherent.nom).toBe("Berthier");

    // Chez quelqu'un dont l'adresse ne reprend pas le nom, la même forme ne trouve rien.
    expect(listerAdherents(etatInitial(), { q: "Chevalier, (Michel)" })).toHaveLength(0);
  });

  it("une page hors bornes retombe sur la dernière", () => {
    const lignes = listerAdherents(etatInitial());
    expect(paginer(lignes, 99).page).toBe(2);
    expect(paginer(lignes, 0).page).toBe(1);
  });
});

describe("modifier une fiche ne touche qu’à la fiche", () => {
  it("le cours et l’adhésion restent intacts", () => {
    const avant = etatInitial();
    const adhesionAvant = avant.adhesions.find((a) => a.adherent_id === "a01");

    const apres = reducteurDemo(avant, {
      type: "adherent/modifier",
      id: "a01",
      prenom: "Marion-Claire",
      nom: "Berthier-Dupont",
      email: "nouvelle@example.com",
      telephone: "06 00 00 00 00",
    });

    const adhesionApres = apres.adhesions.find((a) => a.adherent_id === "a01");
    expect(adhesionApres).toEqual(adhesionAvant);
    expect(apres.adherents.find((a) => a.id === "a01")?.prenom).toBe("Marion-Claire");
  });

  it("les règlements ne bougent pas non plus", () => {
    const avant = etatInitial();
    const apres = reducteurDemo(avant, {
      type: "adherent/modifier",
      id: "a01",
      prenom: "X",
      nom: "Y",
      email: "",
      telephone: "",
    });
    expect(apres.reglements).toEqual(avant.reglements);
  });
});

describe("le hub voit l’ajout", () => {
  it("nouvelles7j passe de 0 à 1", () => {
    const avant = etatInitial();
    expect(chiffresDuClub(avant).nouvelles7j).toBe(0);
    expect(chiffresDuClub(ajouter(avant, "c1")).nouvelles7j).toBe(1);
  });

  it("un ajout sans cours ne compte PAS comme une inscription", () => {
    // La carte compte des adhésions, pas des adhérents.
    const apres = reducteurDemo(etatInitial(), {
      type: "adherent/ajouter",
      prenom: "Sans",
      nom: "Cours",
      email: "",
      telephone: "",
      coursId: "",
      mode: "cheque",
    });
    expect(chiffresDuClub(apres).nouvelles7j).toBe(0);
    expect(chiffresDuClub(apres).adherents).toBe(35);
  });
});
