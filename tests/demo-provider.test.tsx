// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, act } from "@testing-library/react";
import { useState } from "react";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";
import DemoLayout from "@/app/demo/layout";
import { chiffresDuClub } from "@/lib/demo/selecteurs";

/**
 * L'état survit-il vraiment au changement d'écran ?
 *
 * POURQUOI CETTE QUESTION MÉRITE UN TEST, ET PAS UNE PROMESSE
 * Toute la démonstration repose dessus : un chèque encaissé sur une fiche doit se
 * retrouver dans la remise, un adhérent ajouté doit faire monter le compteur du hub.
 * Si le provider était monté dans chaque page plutôt que dans le layout, chaque écran
 * repartirait de zéro — et la démonstration deviendrait sept démonstrations sans lien,
 * sans qu'aucune page prise isolément n'ait l'air cassée.
 *
 * C'est précisément le genre de défaut qu'on ne voit qu'en naviguant, et qu'on ne voit
 * plus quand on connaît le produit par cœur.
 *
 * COMMENT LA NAVIGATION EST SIMULÉE
 * Next remonte `{children}` quand la route change, mais PAS le layout. On reproduit
 * exactement cela : un `<DemoProvider>` stable, et un enfant qu'on remplace — avec une
 * `key` différente, pour forcer React à démonter l'ancien plutôt qu'à le réconcilier.
 * Si l'état vivait dans l'enfant, il disparaîtrait ; s'il vit dans le provider, il reste.
 */

function EcranAdherents() {
  const { etat, envoyer } = useDemo();
  return (
    <div>
      <p>adherents:{chiffresDuClub(etat).adherents}</p>
      <button
        onClick={() =>
          envoyer({
            type: "adherent/ajouter",
            prenom: "Zoé",
            nom: "Nouvelle",
            email: "zoe.nouvelle@example.com",
            telephone: "",
            coursId: "c1",
            mode: "cheque",
          })
        }
      >
        ajouter
      </button>
    </div>
  );
}

function EcranPaiements() {
  const { etat } = useDemo();
  const c = chiffresDuClub(etat);
  return (
    <p>
      paiements:{c.adherents}/attente:{c.enAttente}
    </p>
  );
}

/** La coque : le provider ne bouge pas, l'écran est remplacé. */
function Coque() {
  const [route, setRoute] = useState<"adherents" | "paiements">("adherents");
  return (
    <DemoProvider>
      <button onClick={() => setRoute("paiements")}>aller aux paiements</button>
      <button onClick={() => setRoute("adherents")}>revenir aux adhérents</button>
      {route === "adherents" ? <EcranAdherents key="a" /> : <EcranPaiements key="p" />}
    </DemoProvider>
  );
}

/** Le défaut qu'on cherche à exclure : un provider PAR ÉCRAN au lieu du layout. */
function CoqueFautive() {
  const [route, setRoute] = useState<"adherents" | "paiements">("adherents");
  return (
    <div>
      <button onClick={() => setRoute("paiements")}>aller aux paiements</button>
      <button onClick={() => setRoute("adherents")}>revenir aux adhérents</button>
      {route === "adherents" ? (
        <DemoProvider key="a">
          <EcranAdherents />
        </DemoProvider>
      ) : (
        <DemoProvider key="p">
          <EcranPaiements />
        </DemoProvider>
      )}
    </div>
  );
}

const clic = (texte: string) => act(() => screen.getByText(texte).click());

describe("l’état traverse les écrans", () => {
  it("un adhérent ajouté sur un écran est compté sur un autre", () => {
    render(<Coque />);
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:34");

    clic("ajouter");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");

    // Changement de route : l'enfant est démonté, le provider reste.
    clic("aller aux paiements");
    expect(screen.getByText(/^paiements:/).textContent).toContain("paiements:35");
  });

  it("l’adhésion créée est bien « en attente », et le compteur le voit d’un autre écran", () => {
    render(<Coque />);
    clic("aller aux paiements");
    const avant = Number(screen.getByText(/^paiements:/).textContent?.split("attente:")[1]);

    clic("revenir aux adhérents");
    clic("ajouter");
    clic("aller aux paiements");

    const apres = Number(screen.getByText(/^paiements:/).textContent?.split("attente:")[1]);
    expect(apres).toBe(avant + 1);
  });

  it("et ce test attrape bien le défaut qu’il vise", () => {
    // Preuve que les assertions ci-dessus ne sont pas décoratives : avec un provider
    // monté PAR ÉCRAN — l'erreur qu'on cherche à exclure — l'ajout est perdu au
    // changement de route. Si ce cas venait à passer, les trois tests précédents ne
    // vérifieraient plus rien.
    render(<CoqueFautive />);
    clic("ajouter");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");
    clic("aller aux paiements");
    expect(screen.getByText(/^paiements:/).textContent).toContain("paiements:34");
  });

  it("revenir sur l’écran de départ ne réinitialise rien", () => {
    render(<Coque />);
    clic("ajouter");
    clic("aller aux paiements");
    clic("revenir aux adhérents");
    // L'écran est neuf — il a été démonté puis remonté — mais l'état ne l'est pas.
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");
  });
});

describe("un rechargement remet tout à zéro", () => {
  it("remonter la coque entière recrée l’état initial", () => {
    // Recharger une page, c'est démonter TOUT l'arbre, provider compris. On le reproduit
    // en montant une seconde coque : rien ne doit avoir survécu du premier montage —
    // ni par un module partagé, ni par une constante mutée.
    const premier = render(<Coque />);
    clic("ajouter");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");
    premier.unmount();

    render(<Coque />);
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:34");
  });

  it("deux coques montées en parallèle n’ont pas le même état", () => {
    // Le défaut que la fabrique d'état corrige : deux instances qui partageraient
    // leurs tableaux se contamineraient l'une l'autre.
    const a = render(<Coque />);
    const b = render(<Coque />);
    const compteurs = () => screen.getAllByText(/^adherents:/).map((n) => n.textContent);
    expect(compteurs()).toEqual(["adherents:34", "adherents:34"]);

    // On agit sur la première seulement.
    act(() => screen.getAllByText("ajouter")[0].click());
    expect(compteurs()).toEqual(["adherents:35", "adherents:34"]);

    a.unmount();
    b.unmount();
  });
});

/**
 * ——— LE TEST QUI VERROUILLE VRAIMENT ———————————————————————————————————————————
 *
 * Tout ce qui précède monte une `Coque` écrite ici même, qui contient elle-même le bon
 * placement du provider. Ces tests prouvent donc qu'un provider bien placé fait ce qu'on
 * attend — pas que l'application le place bien. Déplacer demain `DemoProvider` hors de
 * `src/app/demo/layout.tsx` ne les aurait pas fait tomber.
 *
 * Ceux qui suivent importent le VRAI layout. `rerender` avec un enfant différent
 * reproduit ce que fait Next à un changement de route : le layout reste monté, l'enfant
 * est remplacé.
 */
describe("le vrai layout de /demo", () => {
  it("conserve l’état d’un écran à l’autre", () => {
    const vue = render(
      <DemoLayout>
        <EcranAdherents />
      </DemoLayout>
    );
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:34");

    clic("ajouter");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");

    vue.rerender(
      <DemoLayout>
        <EcranPaiements />
      </DemoLayout>
    );
    expect(screen.getByText(/^paiements:/).textContent).toContain("paiements:35");

    // Démontage complet = rechargement de la page. Rien ne doit survivre.
    vue.unmount();

    render(
      <DemoLayout>
        <EcranAdherents />
      </DemoLayout>
    );
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:34");
  });

  it("porte le bandeau permanent et son bouton de réinitialisation", () => {
    render(
      <DemoLayout>
        <EcranAdherents />
      </DemoLayout>
    );
    expect(screen.getByText(/CLUB FICTIF · AUCUNE DONNÉE RÉELLE/)).toBeTruthy();
    expect(screen.getByText("RÉINITIALISER")).toBeTruthy();
  });

  it("la réinitialisation du bandeau agit sur l’état de l’écran", () => {
    // Le bandeau vit dans le layout, l'écran dans les enfants : la preuve qu'ils
    // partagent bien le même état est que le bouton de l'un modifie l'autre.
    render(
      <DemoLayout>
        <EcranAdherents />
      </DemoLayout>
    );
    clic("ajouter");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:35");
    clic("RÉINITIALISER");
    expect(screen.getByText(/^adherents:/).textContent).toBe("adherents:34");
  });
});

describe("le fichier du layout, lu tel quel", () => {
  const SOURCE = readFileSync(join(process.cwd(), "src/app/demo/layout.tsx"), "utf8");
  const sansCommentaires = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("monte DemoProvider", () => {
    expect(sansCommentaires).toMatch(/import \{ DemoProvider \}/);
    expect(sansCommentaires).toMatch(/<DemoProvider>/);
  });

  it("n’importe aucun rail ni navigation numérotée", () => {
    // Le rail appartient à `/demo/page.tsx`, comme dans le vrai cockpit où il est
    // défini dans `cockpit/page.tsx`. Ici, il suivrait le visiteur sur toutes les
    // sous-pages — et aucune d'elles n'en a dans le produit.
    expect(sansCommentaires).not.toMatch(/NavDemo|RailDemo|<nav\b/);
    expect(sansCommentaires).not.toMatch(/AUJOURD’HUI|INSCRIPTIONS|CONTRÔLE/);
  });
});

describe("le bouton de réinitialisation ramène l’état de départ", () => {
  function AvecReset() {
    const { etat, envoyer } = useDemo();
    return (
      <div>
        <p>total:{chiffresDuClub(etat).adherents}</p>
        <button
          onClick={() =>
            envoyer({
              type: "adherent/ajouter",
              prenom: "A",
              nom: "B",
              email: "",
              telephone: "",
              coursId: "c1",
              mode: "cheque",
            })
          }
        >
          ajouter un
        </button>
        <button onClick={() => envoyer({ type: "reinitialiser" })}>réinitialiser</button>
      </div>
    );
  }

  it("après plusieurs ajouts, tout revient", () => {
    render(
      <DemoProvider>
        <AvecReset />
      </DemoProvider>
    );
    clic("ajouter un");
    clic("ajouter un");
    expect(screen.getByText(/^total:/).textContent).toBe("total:36");

    clic("réinitialiser");
    expect(screen.getByText(/^total:/).textContent).toBe("total:34");
  });

  it("réinitialiser deux fois de suite ne casse rien", () => {
    // Le cas qui aurait échoué avec une constante partagée : le second clic renvoyait
    // le même objet, React ne re-rendait pas, et le bouton semblait mort.
    render(
      <DemoProvider>
        <AvecReset />
      </DemoProvider>
    );
    clic("réinitialiser");
    clic("réinitialiser");
    expect(screen.getByText(/^total:/).textContent).toBe("total:34");
  });
});
