// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoAujourdhui from "@/app/demo/page";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";

/**
 * Le hub : rail fidèle, chiffres vivants.
 *
 * DEUX CHOSES SE JOUENT ICI
 *
 * 1. LA FIDÉLITÉ DU RAIL. La première démonstration inventait une entrée `ADHÉRENTS` et
 *    oubliait `06 ACTUALITÉS`. Personne ne l'avait vu pendant des semaines, parce qu'un
 *    rail plausible ne se relit pas. Ces tests comparent les sept entrées une par une.
 *
 * 2. LES CHIFFRES VIVANTS. Un hub dont les compteurs sont écrits en dur meurt au premier
 *    geste : le visiteur ajoute un adhérent, rien ne bouge, et il comprend qu'il regarde
 *    une image. On vérifie donc qu'ils changent — c'est la différence entre une
 *    simulation et une maquette.
 */

const hub = () =>
  render(
    <DemoLayout>
      <DemoAujourdhui />
    </DemoLayout>
  );

describe("le rail — sept entrées, celles du produit", () => {
  const ATTENDUES = [
    ["01", "AUJOURD’HUI", "/demo"],
    ["02", "INSCRIPTIONS", "/demo/inscriptions"],
    ["03", "CONTRÔLE", "/demo/controle"],
    ["04", "PAIEMENTS", "/demo/paiements"],
    ["05", "MESSAGES", "/demo/messages"],
    ["06", "ACTUALITÉS", "/demo/actualites"],
    ["07", "SITE", "/demo/site"],
  ] as const;

  it("les sept, dans l’ordre, avec leur numéro", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    const liens = Array.from(rail.querySelectorAll("a"));
    expect(liens).toHaveLength(7);
    liens.forEach((lien, i) => {
      const [n, label, href] = ATTENDUES[i];
      expect(lien.textContent).toContain(`${n} ${label}`);
      expect(lien.getAttribute("href")).toBe(href);
    });
  });

  it("aucune entrée ADHÉRENTS — elle n’existe pas dans le rail réel", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.textContent).not.toMatch(/ADHÉRENTS/);
  });

  it("ACTUALITÉS est bien présente — la première version l’oubliait", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.textContent).toContain("06 ACTUALITÉS");
  });

  it("l’entrée courante est signalée aux lecteurs d’écran, pas seulement en gras", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    const actifs = rail.querySelectorAll('a[aria-current="page"]');
    expect(actifs).toHaveLength(1);
    expect(actifs[0].getAttribute("href")).toBe("/demo");
  });

  it("chaque entrée atteint la cible tactile de 44 px", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    for (const lien of Array.from(rail.querySelectorAll("a"))) {
      expect(lien.className).toContain("min-h-[44px]");
    }
  });

  it("le rail défile horizontalement sur mobile et devient colonne au-delà", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.className).toContain("overflow-x-auto");
    expect(rail.className).toContain("md:block");
  });
});

describe("ADHÉRENTS s’atteint par un geste, pas par le rail", () => {
  it("le geste « Gérer les adhérents » mène à /demo/adherents", () => {
    hub();
    const lien = screen.getByText("Gérer les adhérents").closest("a");
    expect(lien?.getAttribute("href")).toBe("/demo/adherents");
  });

  it("les gestes pointent vers de vraies routes de démonstration", () => {
    hub();
    for (const [titre, href] of [
      ["Cours et tarifs", "/demo/cours"],
      ["Envoyer un message", "/demo/messages"],
      ["Encaisser une cotisation", "/demo/paiements"],
      ["Faire l'appel", "/demo/controle"],
      ["Publier une actualité", "/demo/actualites"],
      ["Modifier le site", "/demo/site"],
      ["Formulaire d'inscription", "/demo/inscriptions"],
      ["Importer vos adhérents", "/demo/adherents/import"],
    ] as const) {
      expect(screen.getByText(titre).closest("a")?.getAttribute("href")).toBe(href);
    }
  });
});

/** Un enfant qui agit, monté à côté du hub dans le même provider. */
function Leviers() {
  const { envoyer } = useDemo();
  return (
    <>
      <button
        onClick={() =>
          envoyer({
            type: "adherent/ajouter",
            prenom: "Zoé",
            nom: "Nouvelle",
            email: "zoe@example.com",
            telephone: "",
            coursId: "c1",
            mode: "cheque",
          })
        }
      >
        ajouter-adherent
      </button>
      <button onClick={() => envoyer({ type: "piece/basculer", id: "a03-certificat" })}>recevoir-piece</button>
      <button
        onClick={() => envoyer({ type: "reglement/ajouter", adhesionId: "ad04", montantCentimes: 31300, mode: "cheque", note: null })}
      >
        encaisser
      </button>
    </>
  );
}

const avecLeviers = () =>
  render(
    <DemoProvider>
      <DemoAujourdhui />
      <Leviers />
    </DemoProvider>
  );

const clic = (t: string) => act(() => screen.getByText(t).click());
const compteur = (label: RegExp) => screen.getByText(label).previousElementSibling?.textContent;

describe("les chiffres du hub bougent quand on agit", () => {
  it("ajouter un adhérent augmente l’effectif et les dossiers à terminer", () => {
    avecLeviers();
    expect(screen.getByText(/34 adhérents cette saison/)).toBeTruthy();
    const avant = Number(compteur(/DOSSIERS? À TERMINER/));

    clic("ajouter-adherent");

    expect(screen.getByText(/35 adhérents cette saison/)).toBeTruthy();
    // La nouvelle adhésion naît « en attente » : la carte le voit.
    expect(Number(compteur(/DOSSIERS? À TERMINER/))).toBe(avant + 1);
  });

  it("recevoir une pièce fait baisser les dossiers incomplets", () => {
    avecLeviers();
    const avant = Number(compteur(/DOSSIERS? INCOMPLETS?/));
    expect(avant).toBeGreaterThan(0);

    clic("recevoir-piece");
    expect(Number(compteur(/DOSSIERS? INCOMPLETS?/))).toBe(avant - 1);
  });

  it("encaisser un impayé fait baisser les cotisations à relancer", () => {
    avecLeviers();
    const avant = Number(compteur(/COTISATIONS? À RELANCER/));
    expect(avant).toBeGreaterThan(0);

    clic("encaisser");
    expect(Number(compteur(/COTISATIONS? À RELANCER/))).toBe(avant - 1);
  });

  it("la phrase d’état suit, elle aussi", () => {
    avecLeviers();
    const titre = () => document.querySelector("h1")?.textContent ?? "";
    const avant = Number(titre().match(/^(\d+)/)?.[1]);
    clic("recevoir-piece");
    expect(Number(titre().match(/^(\d+)/)?.[1])).toBe(avant - 1);
  });

  it("le total encaissé du rail suit un encaissement", () => {
    avecLeviers();
    const rail = () => screen.getByRole("navigation", { name: "Sections du cockpit" }).textContent ?? "";
    const avant = rail();
    clic("encaisser");
    expect(rail()).not.toBe(avant);
  });
});

describe("aucun chiffre écrit en dur dans le hub", () => {
  const SOURCE = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("les compteurs viennent des sélecteurs", () => {
    expect(SOURCE).toMatch(/chiffresDuClub\(etat\)/);
  });

  it("aucun nombre à deux chiffres ou plus dans un libellé de carte", () => {
    // Le piège du CLAUDE.md : « 312 adhérents cette saison » écrit en dur, qui devient
    // faux dès le lendemain. Ici, il rendrait surtout la démonstration morte.
    const cartes = SOURCE.match(/<Carte[\s\S]*?\/>/g) ?? [];
    expect(cartes.length).toBeGreaterThan(0);
    for (const c of cartes) {
      expect(c).toMatch(/n=\{String\(c\./);
      expect(c).not.toMatch(/n="\d+"/);
    }
  });
});

describe("le rail n’est rendu que par /demo", () => {
  it("le hub l’importe", () => {
    const source = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
    expect(source).toMatch(/import RailDemo from "\.\/RailDemo"/);
  });

  it("le layout ne l’importe pas", () => {
    const source = readFileSync(join(process.cwd(), "src/app/demo/layout.tsx"), "utf8");
    expect(source).not.toMatch(/RailDemo/);
  });

  it("monter le layout sans le hub ne montre aucun rail", () => {
    render(
      <DemoLayout>
        <p>une sous-page</p>
      </DemoLayout>
    );
    expect(screen.queryByRole("navigation", { name: "Sections du cockpit" })).toBeNull();
  });
});
