// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { Suspense } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoFicheAdherent from "@/app/demo/adherents/[id]/page";
import DemoAdherents from "@/app/demo/adherents/page";
import { creerEtatDemoInitial, reducteurDemo } from "@/lib/demo/etat";

/**
 * Les SAISIES LOCALES — ce qui est tapé mais pas encore enregistré.
 *
 * POURQUOI ELLES MÉRITENT LEUR PROPRE FICHIER
 * Elles ne vivent pas dans le réducteur. Aucun test sur l'état ne peut donc rien en
 * dire, et c'est exactement là que se cachait le défaut : « RÉINITIALISER » remettait
 * les données à zéro et laissait le formulaire tel quel.
 *
 * Le cas qui le montre : Lina est enregistrée « Lina », on tape « Mathilde » sans
 * enregistrer, on réinitialise. L'état contient « Lina » avant ET après — les clés des
 * sous-composants ne changent pas, le champ reste sur « Mathilde », et le bouton semble
 * n'avoir rien fait.
 *
 * Deux exigences opposées, et c'est ce qui rend le sujet piégeux :
 *   — une action ordinaire (cocher une pièce) ne doit PAS effacer la saisie ;
 *   — « RÉINITIALISER » doit l'effacer.
 * Une `key` trop large casse la première, une `key` trop étroite casse la seconde.
 */

/**
 * La fiche lit ses paramètres par `use(params)`, qui SUSPEND au premier rendu — c'est
 * ainsi que Next passe les paramètres de route depuis React 19. Sans frontière
 * `Suspense` ni attente, le test ne voyait qu'un `<div />` vide et concluait que les
 * champs n'existaient pas. Le composant allait bien ; c'est le test qui regardait trop
 * tôt.
 */
/**
 * Une promesse DÉJÀ marquée résolue, telle que `use()` la lit sans suspendre.
 *
 * React attache `status` et `value` aux promesses qu'il a vues passer ; une promesse
 * fraîche suspend le rendu et, dans un test, l'arbre restait vide — je cherchais des
 * champs qui n'avaient jamais été rendus. Poser ces deux propriétés à la main est le
 * motif documenté pour une valeur déjà connue, et il rend le test synchrone.
 */
function paramsResolus(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  p.status = "fulfilled";
  p.value = { id };
  return p;
}

const fiche = (id: string) =>
  render(
    <DemoLayout>
      <Suspense fallback={null}>
        <DemoFicheAdherent params={paramsResolus(id)} />
      </Suspense>
    </DemoLayout>
  );

const champ = (label: string) => screen.getByLabelText(label) as HTMLInputElement;
const taper = (label: string, valeur: string) =>
  act(() => {
    const el = champ(label);
    // `happy-dom` déclenche bien l'événement React via le setter natif.
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const clic = (texte: string | RegExp) => act(() => screen.getByText(texte).click());
const premiereRecue = () => act(() => screen.getAllByText("✓ Reçue")[0].click());

describe("une saisie non enregistrée survit aux autres actions", () => {
  it("cocher une pièce n’efface pas le prénom en cours de frappe", async () => {
    fiche("a01");
    expect(champ("PRÉNOM *").value).toBe("Lina");

    taper("PRÉNOM *", "Mathilde");
    expect(champ("PRÉNOM *").value).toBe("Mathilde");

    // Une action sans rapport, sur la même fiche.
    // Lina a DEUX pièces reçues : on vise la première, sans ambiguïté.
    premiereRecue();
    expect(champ("PRÉNOM *").value).toBe("Mathilde");
  });

  it("l’email en cours de frappe survit lui aussi", async () => {
    fiche("a01");
    taper("EMAIL", "brouillon@example.com");
    // Lina a DEUX pièces reçues : on vise la première, sans ambiguïté.
    premiereRecue();
    expect(champ("EMAIL").value).toBe("brouillon@example.com");
  });
});

describe("RÉINITIALISER efface aussi les saisies locales", () => {
  it("le prénom tapé sans enregistrer disparaît", async () => {
    fiche("a01");
    taper("PRÉNOM *", "Mathilde");
    expect(champ("PRÉNOM *").value).toBe("Mathilde");

    // C'est LE cas qui échouait : l'état vaut « Lina » avant comme après, donc la clé
    // des coordonnées ne bouge pas. Seule une génération de réinitialisation, portée par
    // le provider, remonte l'arbre entier.
    clic("RÉINITIALISER");
    expect(champ("PRÉNOM *").value).toBe("Lina");
  });

  it("une pièce cochée revient à son état initial, et le champ avec", async () => {
    fiche("a01");
    taper("EMAIL", "brouillon@example.com");
    // Lina a DEUX pièces reçues : on vise la première, sans ambiguïté.
    premiereRecue();
    expect(screen.getAllByText("○ Manquante").length).toBeGreaterThan(0);

    clic("RÉINITIALISER");
    expect(champ("EMAIL").value).toBe("sophie.berthier@example.com");
    expect(screen.queryByText("○ Manquante")).toBeNull();
  });
});

describe("la recherche saisie mais non appliquée", () => {
  const liste = () =>
    render(
      <DemoLayout>
        <DemoAdherents />
      </DemoLayout>
    );

  it("n’est pas appliquée tant qu’on n’a pas cliqué sur CHERCHER", () => {
    liste();
    const titre = () => document.querySelector("h1")?.textContent ?? "";
    expect(titre()).toContain("34 adhérents");

    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    // Toujours 34 : le produit cherche au clic, pas à la frappe.
    expect(titre()).toContain("34 adhérents");

    clic("CHERCHER");
    expect(titre()).toContain("1 adhérent");
  });

  it("disparaît après RÉINITIALISER", () => {
    liste();
    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    expect(champ("Rechercher un adhérent par nom, prénom ou email").value).toBe("Berthier");

    clic("RÉINITIALISER");
    expect(champ("Rechercher un adhérent par nom, prénom ou email").value).toBe("");
  });

  it("une recherche appliquée est également annulée", () => {
    liste();
    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    clic("CHERCHER");
    expect(document.querySelector("h1")?.textContent).toContain("1 adhérent");

    clic("RÉINITIALISER");
    expect(document.querySelector("h1")?.textContent).toContain("34 adhérents");
  });
});

describe("le nettoyage des champs, comme les Server Actions", () => {
  const etat = () => creerEtatDemoInitial();

  it("l’ajout retire les espaces périphériques", () => {
    const apres = reducteurDemo(etat(), {
      type: "adherent/ajouter",
      prenom: "  Lina  ",
      nom: "\tBerthier\n",
      email: "  m@example.com ",
      telephone: " 06 11 22 33 44 ",
      coursId: "c1",
      mode: "cheque",
    });
    const nouvel = apres.adherents[apres.adherents.length - 1];
    expect(nouvel.prenom).toBe("Lina");
    expect(nouvel.nom).toBe("Berthier");
    expect(nouvel.email).toBe("m@example.com");
    expect(nouvel.telephone).toBe("06 11 22 33 44");
  });

  it("un champ facultatif fait d’espaces devient null, pas une chaîne", () => {
    // Le piège : « ␣␣␣ » est une chaîne non vide. Sans `trim()` avant le test, cet
    // adhérent aurait compté parmi les « destinataires avec un email » du composeur —
    // et rien ne lui serait jamais parti.
    const apres = reducteurDemo(etat(), {
      type: "adherent/ajouter",
      prenom: "Sans",
      nom: "Adresse",
      email: "   ",
      telephone: "  ",
      coursId: "",
      mode: "cheque",
    });
    const nouvel = apres.adherents[apres.adherents.length - 1];
    expect(nouvel.email).toBeNull();
    expect(nouvel.telephone).toBeNull();
  });

  it("la modification applique les mêmes règles", () => {
    const apres = reducteurDemo(etat(), {
      type: "adherent/modifier",
      id: "a01",
      prenom: "  Lina  ",
      nom: " Berthier ",
      email: "  ",
      telephone: " 06 00 00 00 00 ",
    });
    const a = apres.adherents.find((x) => x.id === "a01");
    expect(a?.prenom).toBe("Lina");
    expect(a?.nom).toBe("Berthier");
    expect(a?.email).toBeNull();
    expect(a?.telephone).toBe("06 00 00 00 00");
  });

  it("l’import nettoie aussi", () => {
    // Ce test ne prouve QUE la valeur finale créée. Les quatre suivants portent sur ce
    // qu'il ne voyait pas : la validation et la détection des doublons, qui comparaient
    // des valeurs brutes.
    const apres = reducteurDemo(etat(), {
      type: "adherent/importer",
      lignes: [{ prenom: " Camille ", nom: " Aubert ", email: "  ", telephone: " 06 ", coursId: "c1" }],
    });
    const nouvel = apres.adherents[apres.adherents.length - 1];
    expect(nouvel.prenom).toBe("Camille");
    expect(nouvel.email).toBeNull();
    expect(nouvel.telephone).toBe("06");
  });

  it("un prénom ou un nom fait d’espaces est ignoré", () => {
    // Il passait la validation — « ␣␣ » est une chaîne non vide — puis devenait vide à
    // la création. On importait donc un adhérent sans nom, cliquable et muet.
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [
        { prenom: "   ", nom: "Martin", email: "a@example.com", telephone: "", coursId: null },
        { prenom: "Paul", nom: "\t\n", email: "b@example.com", telephone: "", coursId: null },
      ],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length);
  });

  it("un email existant avec espaces et casse différente est reconnu", () => {
    // « ␣SOPHIE.BERTHIER@EXAMPLE.COM␣ » est le même que celui du dossier de Lina — sa
    // mère l'a saisi à l'inscription. Comparé brut,
    // il ne l'était pas — et le club se retrouvait avec deux fiches pour une personne.
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [
        { prenom: "Lina", nom: "Berthier", email: "  SOPHIE.BERTHIER@EXAMPLE.COM  ", telephone: "", coursId: null },
      ],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length);
  });

  it("un doublon prénom + nom SANS email est ignoré, même entouré d’espaces", () => {
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [{ prenom: "  Lina  ", nom: " Berthier ", email: "", telephone: "", coursId: null }],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length);
  });

  it("deux homonymes avec deux emails distincts sont ACCEPTÉS", () => {
    // La règle du serveur : avec un email, c'est l'email qui fait le doublon. Un club a
    // ses deux Marie Martin, et refuser la seconde aurait été un bug silencieux — la
    // ligne disparaissait du décompte sans que personne ne sache laquelle.
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [
        { prenom: "Marie", nom: "Martin", email: "marie.martin@example.com", telephone: "", coursId: null },
        { prenom: "Marie", nom: "Martin", email: "m.martin@example.com", telephone: "", coursId: null },
      ],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length + 2);
  });

  it("mais deux homonymes SANS email ne comptent que pour un", () => {
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [
        { prenom: "Marie", nom: "Martin", email: "", telephone: "", coursId: null },
        { prenom: " marie ", nom: " MARTIN ", email: "", telephone: "", coursId: null },
      ],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length + 1);
  });

  it("un même email deux fois DANS LE FICHIER ne passe qu’une fois", () => {
    const avant = etat();
    const apres = reducteurDemo(avant, {
      type: "adherent/importer",
      lignes: [
        { prenom: "Camille", nom: "Aubert", email: "camille@example.com", telephone: "", coursId: null },
        { prenom: "Camille", nom: "Aubert", email: " CAMILLE@example.com ", telephone: "", coursId: null },
      ],
    });
    expect(apres.adherents).toHaveLength(avant.adherents.length + 1);
  });

  it("la troncature s’applique APRÈS le trim", () => {
    // Sinon « ␣␣␣ + 80 caractères » aurait perdu trois lettres au profit d'espaces.
    const long = "x".repeat(100);
    const apres = reducteurDemo(etat(), {
      type: "adherent/ajouter",
      prenom: `   ${long}`,
      nom: "Test",
      email: "",
      telephone: "",
      coursId: "",
      mode: "cheque",
    });
    expect(apres.adherents[apres.adherents.length - 1].prenom).toBe("x".repeat(80));
  });
});
