// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense, useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoActualites from "@/app/demo/actualites/page";
import DemoActualite from "@/app/demo/actualites/[id]/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { actualitesVitrine, dateSureDemo, resumeActu } from "@/lib/demo/selecteurs";
import { AUJOURDHUI } from "@/lib/demo/donnees";

/**
 * LES ACTUALITÉS — deux gestes, et pas un de plus.
 *
 * CE QUE CES TESTS EMPÊCHENT DE RÉINVENTER
 *
 * 1. L'ÉDITION. Le produit n'en a pas (« Pas d'édition en v1 : supprimer puis republier
 *    fait le travail »), et c'est la fonction qu'on ajoute par réflexe. Un test cherche
 *    donc explicitement son absence, plutôt que d'espérer que personne n'y pense.
 * 2. LE BROUILLON. La présence d'une DATE DE PUBLICATION donne envie de croire à une
 *    planification : il n'y en a pas. Une actualité datée du mois prochain est visible
 *    tout de suite.
 * 3. L'ÉTAT VIDE de la liste. Le produit rend `null` ; afficher « Aucune actualité »
 *    serait une divergence, et la règle générale du projet l'interdit sur le public.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/actualites",
}));

let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => {
    vu = etat;
  }, [etat]);
  return null;
}

const monter = (ecran: React.ReactNode) =>
  render(
    <DemoLayout>
      {ecran}
      <Sonde />
    </DemoLayout>
  );

const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

function paramsResolus(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  p.status = "fulfilled";
  p.value = { id };
  return p;
}

const poser = (el: HTMLElement, valeur: string, prototype: { prototype: object }) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

const taperTitre = (v: string) => poser(screen.getByLabelText("TITRE"), v, window.HTMLInputElement);
const taperTexte = (v: string) => poser(screen.getByLabelText("TEXTE"), v, window.HTMLTextAreaElement);
const taperDate = (v: string) =>
  poser(screen.getByLabelText("DATE DE PUBLICATION"), v, window.HTMLInputElement);

const boutonPublier = () =>
  screen.getByRole("button", { name: /SIMULER LA PUBLICATION/ }) as HTMLButtonElement;

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Les calculs ——————————————————————————————————————————————————————————————

describe("la date de publication", () => {
  it("accepte une date calendaire réelle", () => {
    expect(dateSureDemo("2026-09-04", AUJOURDHUI)).toBe("2026-09-04");
  });

  it("refuse un 31 février, qui glisserait en mars côté base", () => {
    expect(dateSureDemo("2026-02-31", AUJOURDHUI)).toBe(AUJOURDHUI);
  });

  it("retombe sur aujourd’hui quand le champ est vide ou mal formé", () => {
    expect(dateSureDemo("", AUJOURDHUI)).toBe(AUJOURDHUI);
    expect(dateSureDemo("04/09/2026", AUJOURDHUI)).toBe(AUJOURDHUI);
    expect(dateSureDemo("2026-13-01", AUJOURDHUI)).toBe(AUJOURDHUI);
  });
});

describe("le résumé affiché sur la vitrine", () => {
  it("laisse un texte court intact", () => {
    expect(resumeActu("Trois mots.")).toBe("Trois mots.");
  });

  it("coupe au dernier espace au-delà de 140 caractères", () => {
    const long = "mot ".repeat(60).trim();
    const r = resumeActu(long);
    expect(r.endsWith("…")).toBe(true);
    expect(r.length).toBeLessThanOrEqual(141);
    expect(r).not.toContain("  ");
  });

  it("coupe net quand aucun espace ne tombe après le 60e caractère", () => {
    // Le seuil de 60 existe pour ça : sans lui, ce texte se réduirait à « a… ».
    const r = resumeActu(`a ${"b".repeat(200)}`);
    expect(r.length).toBe(141);
  });
});

describe("ce que la vitrine retient", () => {
  it("n’en montre que trois, les plus récentes d’abord", () => {
    const base = creerEtatDemoInitial();
    const apres = reducteurDemo(base, {
      type: "actualite/publier",
      titre: "Portes ouvertes",
      texte: "Venez essayer.",
      publieLe: AUJOURDHUI,
      aUneImage: false,
    });
    const v = actualitesVitrine(apres);
    expect(v.length).toBe(3);
    expect(v[0].titre).toBe("Portes ouvertes");
    // Le fil complet, lui, en garde quatre : le cockpit demande cinquante.
    expect(apres.actualites.length).toBe(4);
  });

  it("place en tête la plus récente à date égale", () => {
    const base = creerEtatDemoInitial();
    const meme = base.actualites[0].publie_le;
    const apres = reducteurDemo(base, {
      type: "actualite/publier",
      titre: "Même jour",
      texte: "Publiée après.",
      publieLe: meme,
      aUneImage: false,
    });
    expect(actualitesVitrine(apres)[0].titre).toBe("Même jour");
  });
});

// ——— L'atelier ————————————————————————————————————————————————————————————————

describe("l’atelier", () => {
  it("porte les textes du produit", () => {
    monter(<DemoActualites />);
    expect(screen.getByText("Vos actualités.")).toBeTruthy();
    expect(screen.getByText(/Chaque actualité a sa page sur votre site/)).toBeTruthy();
    expect(screen.getByText("JPG ou PNG, format paysage conseillé.")).toBeTruthy();
    expect((screen.getByLabelText("TITRE") as HTMLInputElement).placeholder).toBe(
      "Reprise des cours le 4 septembre"
    );
    expect((screen.getByLabelText("TEXTE") as HTMLTextAreaElement).placeholder).toContain(
      "Une ligne vide sépare deux paragraphes."
    );
  });

  it("borne le titre à 120 caractères dans le champ lui-même", () => {
    monter(<DemoActualites />);
    expect((screen.getByLabelText("TITRE") as HTMLInputElement).maxLength).toBe(120);
  });

  it("part sur la date du jour", () => {
    monter(<DemoActualites />);
    expect((screen.getByLabelText("DATE DE PUBLICATION") as HTMLInputElement).value).toBe(AUJOURDHUI);
  });

  it("exige un titre ET un texte", () => {
    monter(<DemoActualites />);
    expect(boutonPublier().disabled).toBe(true);
    taperTitre("Stage de novembre");
    expect(boutonPublier().disabled).toBe(true);
    taperTexte("   ");
    expect(boutonPublier().disabled).toBe(true);
    taperTexte("Une journée entière.");
    expect(boutonPublier().disabled).toBe(false);
  });

  it("publie, vide le formulaire et confirme", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoActualites />);
    taperTitre("Portes ouvertes le 5 décembre");
    taperTexte("Premier paragraphe.\n\nSecond paragraphe.");
    act(() => boutonPublier().click());

    avancer(449);
    expect(vu!.actualites.length).toBe(base.actualites.length);
    avancer(1);

    expect(vu!.actualites.length).toBe(base.actualites.length + 1);
    expect(vu!.actualites[0].titre).toBe("Portes ouvertes le 5 décembre");
    expect(vu!.actualites[0].publie_le).toBe(AUJOURDHUI);
    expect(vu!.actualites[0].aUneImage).toBe(false);
    expect((screen.getByLabelText("TITRE") as HTMLInputElement).value).toBe("");
    expect((screen.getByLabelText("TEXTE") as HTMLTextAreaElement).value).toBe("");
    expect(screen.getByText(/Actualité publiée dans la simulation/)).toBeTruthy();
  });

  it("corrige une date impossible plutôt que de l’enregistrer", () => {
    monter(<DemoActualites />);
    taperTitre("Assemblée générale");
    taperTexte("Le bureau vous attend.");
    taperDate("2026-02-31");
    act(() => boutonPublier().click());
    avancer(450);
    expect(vu!.actualites[0].publie_le).toBe(AUJOURDHUI);
  });

  it("garde une date future sans rien planifier — elle est publiée tout de suite", () => {
    monter(<DemoActualites />);
    taperTitre("Galette des rois");
    taperTexte("Le 11 janvier, après le cours.");
    taperDate("2027-01-11");
    act(() => boutonPublier().click());
    avancer(450);
    expect(vu!.actualites[0].publie_le).toBe("2027-01-11");
    // Et elle est bien EN TÊTE de la vitrine, donc visible : aucune planification.
    expect(actualitesVitrine(vu!)[0].titre).toBe("Galette des rois");
    // Trois fois à l'écran : dans le fil du cockpit, « À la une », et la carte du
    // chapitre « La vie du club ». C'est ce que dit le chapô, vérifié.
    expect(screen.getAllByText("Galette des rois").length).toBe(3);
  });

  it("supprime une actualité de la liste et de la vitrine", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoActualites />);
    const cible = base.actualites[0];
    expect(screen.getAllByText(cible.titre).length).toBeGreaterThan(0);

    const lignes = Array.from(document.querySelectorAll("button")).filter(
      (b) => b.textContent === "Supprimer"
    );
    expect(lignes.length).toBe(base.actualites.length);
    act(() => lignes[0].click());

    expect(vu!.actualites.some((a) => a.id === cible.id)).toBe(false);
    expect(screen.queryByText(cible.titre)).toBeNull();
  });

  it("n’offre ni édition, ni brouillon, ni réordonnancement, ni planification", () => {
    monter(<DemoActualites />);
    const gestes = Array.from(document.querySelectorAll("button, a")).map((e) => e.textContent ?? "");
    for (const interdit of [/modifier/i, /éditer/i, /brouillon/i, /monter/i, /descendre/i, /programmer/i, /planifier/i, /épingl/i]) {
      expect(gestes.some((t) => interdit.test(t))).toBe(false);
    }
    // Deux gestes seulement, sur chaque ligne : voir la page, supprimer. On part du lien
    // de la première ligne plutôt que d'une classe — l'en-tête du layout en partage.
    const ligne = document.querySelector('a[href^="/demo/actualites/"]')!.closest("div.border-b")!;
    const actions = Array.from(ligne.querySelectorAll("a, button")).map((e) => (e.textContent ?? "").trim());
    expect(actions).toEqual(["VOIR LA PAGE →", "Supprimer"]);
  });

  it("marque l’image comme simulée quand un fichier est désigné", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoActualites />);
    // Aucun octet n'est lu : seul le nom du fichier sert, et seulement à l'affichage.
    const champ = document.getElementById("da-image") as HTMLInputElement;
    const fichier = new File(["x"], "portes-ouvertes.jpg", { type: "image/jpeg" });
    Object.defineProperty(champ, "files", { value: [fichier], configurable: true });
    act(() => champ.dispatchEvent(new Event("change", { bubbles: true })));
    expect(screen.getByText(/il n’est ni lu ni envoyé/)).toBeTruthy();

    taperTitre("Portes ouvertes");
    taperTexte("Venez essayer.");
    act(() => boutonPublier().click());
    avancer(450);
    expect(vu!.actualites[0].aUneImage).toBe(true);
    expect(vu!.actualites.length).toBe(base.actualites.length + 1);
  });
});

describe("l’aperçu de la vitrine", () => {
  it("met la plus récente « À la une » et suit une publication", () => {
    monter(<DemoActualites />);
    const une = () => document.querySelector('[class*="À LA UNE"], .mono')!;
    expect(screen.getByText("À LA UNE")).toBeTruthy();

    taperTitre("Le dojo ferme lundi");
    taperTexte("Reprise mardi.");
    act(() => boutonPublier().click());
    avancer(450);

    // « À la une » a changé sous les yeux du visiteur.
    const bloc = screen.getByText("À LA UNE").closest("div")!;
    expect(bloc.textContent).toContain("Le dojo ferme lundi");
    expect(une()).toBeTruthy();
  });

  it("annonce le chapitre invisible quand plus rien n’est publié", () => {
    monter(<DemoActualites />);
    for (let i = 0; i < 3; i++) {
      const boutons = Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === "Supprimer");
      act(() => boutons[0].click());
    }
    expect(vu!.actualites.length).toBe(0);
    expect(screen.queryByText("À LA UNE")).toBeNull();
    expect(screen.getByText(/reste invisible pour vos visiteurs tant qu’il est vide/)).toBeTruthy();
    // La liste « DÉJÀ PUBLIÉES » disparaît : le produit n'a pas d'état vide.
    expect(screen.queryByText("DÉJÀ PUBLIÉES")).toBeNull();
  });
});

// ——— La page publique ————————————————————————————————————————————————————————

describe("la page publique d’une actualité", () => {
  const page = (id: string) =>
    monter(
      <Suspense fallback={null}>
        <DemoActualite params={paramsResolus(id)} />
      </Suspense>
    );

  it("sépare les paragraphes sur une ligne vide", () => {
    const base = creerEtatDemoInitial();
    const actu = base.actualites.find((a) => a.texte.includes("\n\n"))!;
    page(actu.id);
    const paragraphes = Array.from(document.querySelectorAll("article p.whitespace-pre-line"));
    expect(paragraphes.length).toBe(actu.texte.split(/\n{2,}/).length);
    expect(paragraphes.length).toBeGreaterThan(1);
  });

  it("porte le nom du club et non celui de Klubster", () => {
    const base = creerEtatDemoInitial();
    page(base.actualites[1].id);
    expect(screen.getByText(/← Judo Club des Peupliers/)).toBeTruthy();
    expect(screen.getByText(base.actualites[1].titre)).toBeTruthy();
  });

  it("ne casse pas sur une actualité supprimée", () => {
    page("n-inexistante");
    expect(screen.getByText(/n’existe pas dans la simulation/)).toBeTruthy();
  });
});
