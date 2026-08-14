// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoSite from "@/app/demo/site/page";
import DemoActualites from "@/app/demo/actualites/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { chapitresDuSite, liensNavSite, SECTIONS_STANDARD_DEMO } from "@/lib/demo/selecteurs";

/**
 * LA VITRINE ET SON MODE ÉDITION.
 *
 * LE PIÈGE CENTRAL, DÉJÀ PAYÉ EN PRODUCTION : retirer un chapitre standard ne le
 * supprime pas, il le MASQUE — et sans la liste `masquees`, la normalisation le
 * réintroduisait aussitôt. Un club ne pouvait alors pas retirer son planning, et le
 * geste semblait ne rien faire. Deux tests le gardent.
 *
 * LE SECOND : un chapitre retiré n'a plus d'ancre. La navigation et le bouton
 * « DÉCOUVRIR LES COURS » doivent disparaître avec lui, sinon le clic ne fait rien.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/site",
}));

let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => {
    vu = etat;
  }, [etat]);
  return null;
}

const monter = () =>
  render(
    <DemoLayout>
      <DemoSite />
      <Sonde />
    </DemoLayout>
  );

const clic = (nom: string | RegExp) => act(() => screen.getByRole("button", { name: nom }).click());
const poser = (el: HTMLElement, valeur: string, prototype: { prototype: object }) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— La composition de la page ————————————————————————————————————————————————

describe("la composition de la page", () => {
  const base = creerEtatDemoInitial();

  it("ajoute en fin d’ordre les chapitres personnalisés absents", () => {
    // Les deux chapitres du club ne figurent pas dans `ordre` : c'est la normalisation
    // qui les y met, et c'est ainsi qu'un chapitre neuf apparaît sans toucher à l'ordre.
    expect(base.site.ordre).not.toContain("cx1");
    const cles = chapitresDuSite(base).map((r) => r.cle);
    expect(cles.slice(0, 7)).toEqual([...SECTIONS_STANDARD_DEMO]);
    expect(cles.slice(7)).toEqual(["cx1", "cx2"]);
  });

  it("ne ressuscite PAS un chapitre masqué", () => {
    const apres = reducteurDemo(base, { type: "site/retirer", cle: "planning" });
    const cles = chapitresDuSite(apres).map((r) => r.cle);
    expect(cles).not.toContain("planning");
    // Les autres restent en place, dans le même ordre.
    expect(cles[0]).toBe("presentation");
    expect(cles).toContain("tarifs");
  });

  it("rend un chapitre masqué puis réaffiché", () => {
    const retire = reducteurDemo(base, { type: "site/retirer", cle: "tarifs" });
    const rendu = reducteurDemo(retire, { type: "site/reafficher", cle: "tarifs" });
    expect(chapitresDuSite(rendu).map((r) => r.cle)).toContain("tarifs");
  });

  it("retire « La vie du club » et les chapitres personnalisés de la navigation", () => {
    const liens = liensNavSite(base).map((l) => l.cle);
    expect(liens).not.toContain("actualites");
    expect(liens).not.toContain("cx1");
    // « infos » n'a pas de nom lisible dans le produit : il sort donc aussi de la nav.
    expect(liens).not.toContain("infos");
    expect(liens).toEqual(["presentation", "cours", "planning", "tarifs", "contact"]);
  });

  it("sort un chapitre retiré de la navigation", () => {
    const apres = reducteurDemo(base, { type: "site/retirer", cle: "cours" });
    expect(liensNavSite(apres).map((l) => l.cle)).not.toContain("cours");
  });

  it("ignore une clé inconnue et un doublon dans l’ordre", () => {
    const abime: EtatDemo = {
      ...base,
      site: { ...base.site, ordre: ["tarifs", "tarifs", "chapitre-fantome", "cours"] },
    };
    const cles = chapitresDuSite(abime).map((r) => r.cle);
    expect(cles).not.toContain("chapitre-fantome");
    expect(cles.filter((c) => c === "tarifs").length).toBe(1);
    expect(cles.slice(0, 2)).toEqual(["tarifs", "cours"]);
  });
});

// ——— L'écran ——————————————————————————————————————————————————————————————————

describe("le mode édition", () => {
  it("s’annonce et nomme les chapitres", () => {
    monter();
    expect(screen.getByText("Mode édition")).toBeTruthy();
    expect(screen.getByText(/Les zones encadrées sont déplaçables/)).toBeTruthy();
    expect(screen.getByText("En-tête")).toBeTruthy();
    for (const nom of ["Le club", "Cours", "Planning", "Tarifs", "La vie du club", "Contact"]) {
      expect(screen.getAllByText(nom).length).toBeGreaterThan(0);
    }
    // Deux chapitres personnalisés, tous deux étiquetés « Chapitre ».
    expect(screen.getAllByText("Chapitre").length).toBe(2);
  });

  it("désactive « Monter » sur le premier et « Descendre » sur le dernier", () => {
    monter();
    const monter1 = screen.getByRole("button", { name: /Remonter « Le club »/ }) as HTMLButtonElement;
    expect(monter1.disabled).toBe(true);
    const descendre1 = screen.getByRole("button", { name: /Descendre « Le club »/ }) as HTMLButtonElement;
    expect(descendre1.disabled).toBe(false);
  });

  it("déplace un chapitre", () => {
    monter();
    clic(/Descendre « Le club »/);
    expect(vu!.site.ordre.slice(0, 2)).toEqual(["cours", "presentation"]);
  });

  it("retire un chapitre standard, et l’offre en retour", () => {
    monter();
    expect(screen.queryByText("CHAPITRES RETIRÉS DE LA PAGE")).toBeNull();

    clic("Retirer « Planning »");
    expect(vu!.site.masquees).toEqual(["planning"]);
    expect(screen.getByText("CHAPITRES RETIRÉS DE LA PAGE")).toBeTruthy();
    expect(screen.getByText(/Rien n’est perdu/)).toBeTruthy();

    expect(screen.getByText("↺ Réafficher « Planning »")).toBeTruthy();
    clic(/Réafficher/);
    expect(vu!.site.masquees).toEqual([]);
    expect(screen.queryByText("CHAPITRES RETIRÉS DE LA PAGE")).toBeNull();
  });

  it("supprime un chapitre personnalisé — sans retour possible", () => {
    const base = creerEtatDemoInitial();
    monter();
    clic("Supprimer « Le mot du président »");
    expect(vu!.site.custom.length).toBe(base.site.custom.length - 1);
    // Un chapitre supprimé n'entre PAS dans les chapitres retirés : il n'existe plus.
    expect(vu!.site.masquees.length).toBe(0);
    expect(screen.queryByText("CHAPITRES RETIRÉS DE LA PAGE")).toBeNull();
  });

  it("fait disparaître « DÉCOUVRIR LES COURS » avec le chapitre Cours", () => {
    monter();
    expect(screen.getByText("DÉCOUVRIR LES COURS")).toBeTruthy();
    clic("Retirer « Cours »");
    expect(vu!.site.masquees).toContain("cours");
    expect(screen.queryByText("DÉCOUVRIR LES COURS")).toBeNull();
  });
});

describe("l’ajout d’un chapitre", () => {
  it("propose la bibliothèque, groupée par intention", () => {
    monter();
    for (const g of ["Présenter le club", "Recruter", "Faire vivre", "Inspirer"]) {
      expect(screen.getByText(g)).toBeTruthy();
    }
    expect(screen.getByText("Questions fréquentes")).toBeTruthy();
    expect(screen.getByText("Une citation, une photo, une signature.")).toBeTruthy();
  });

  it("ajoute un chapitre de texte, qui apparaît en fin de page", () => {
    const base = creerEtatDemoInitial();
    monter();
    clic("Grande citation Une phrase, pleine largeur, comme un manifeste.");
    poser(screen.getByLabelText("TITRE DU CHAPITRE"), "Ce qu’on vient chercher", window.HTMLInputElement);
    poser(screen.getByLabelText("TEXTE"), "Tomber, c’est déjà pratiquer.", window.HTMLTextAreaElement);
    clic(/SIMULER L’AJOUT DU CHAPITRE/);

    expect(vu!.site.custom.length).toBe(base.site.custom.length + 1);
    const dernier = vu!.site.custom.at(-1)!;
    expect(dernier.type).toBe("citation");
    expect(dernier.titre).toBe("Ce qu’on vient chercher");
    // Il est bien rendu, en dernière position.
    expect(chapitresDuSite(vu!).at(-1)!.cle).toBe(dernier.id);
    expect(screen.getByText(/Tomber, c’est déjà pratiquer/)).toBeTruthy();
  });

  it("refuse d’ajouter un chapitre sans texte", () => {
    monter();
    clic("Chiffres clés Année de création, licenciés, bénévoles…");
    const bouton = screen.getByRole("button", { name: /SIMULER L’AJOUT DU CHAPITRE/ }) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
  });

  it("dit franchement qu’un chapitre à photos ne s’ajoute pas ici", () => {
    monter();
    clic("Galerie photos Vos meilleures photos, en grille.");
    expect(screen.getByText(/La\s+démonstration ne dépose aucun fichier/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /SIMULER L’AJOUT DU CHAPITRE/ })).toBeNull();
    // Et aucun champ de fichier n'existe sur cet écran.
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});

describe("la vue publique", () => {
  it("retire la barre d’édition et les contrôles", () => {
    monter();
    clic(/TERMINER/);
    expect(screen.queryByText("Mode édition")).toBeNull();
    expect(screen.queryByText("En-tête")).toBeNull();
    expect(screen.queryByRole("button", { name: /Remonter/ })).toBeNull();
    expect(screen.queryByText("AJOUTER UN CHAPITRE")).toBeNull();
    expect(screen.getByText(/Voici ce que voient vos visiteurs/)).toBeTruthy();
  });

  it("cache « La vie du club » vide au public, mais le montre en édition", () => {
    // Les actualités se suppriment depuis leur atelier : on monte les deux écrans sur
    // le même provider, comme un visiteur qui passerait de l'un à l'autre.
    render(
      <DemoLayout>
        <DemoActualites />
        <DemoSite />
        <Sonde />
      </DemoLayout>
    );
    for (let i = 0; i < 3; i++) {
      const boutons = Array.from(document.querySelectorAll("button")).filter((b) => b.textContent === "Supprimer");
      act(() => boutons[0].click());
    }
    expect(vu!.actualites.length).toBe(0);

    // En édition, le chapitre reste visible avec l'invitation à le remplir.
    expect(screen.getAllByText("Dernières actualités.").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/reste invisible pour vos visiteurs tant qu’il est vide/).length).toBeGreaterThan(0);

    // Le public, lui, ne le voit plus du tout. On cible la SECTION du site : l'atelier
    // des actualités, monté à côté, garde son propre aperçu de vitrine.
    expect(document.querySelector("section#actualites")).not.toBeNull();
    act(() => screen.getByRole("button", { name: /TERMINER/ }).click());
    expect(document.querySelector("section#actualites")).toBeNull();
  });

  it("n’ouvre pas la messagerie du visiteur sur l’adresse du club fictif", () => {
    monter();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(screen.getByText("contact@example.com")).toBeTruthy();
  });
});
