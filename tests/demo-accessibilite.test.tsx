// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoHub from "@/app/demo/page";
import DemoMessages from "@/app/demo/messages/page";
import DemoActualites from "@/app/demo/actualites/page";
import DemoInscriptions from "@/app/demo/inscriptions/page";
import DemoApercu from "@/app/demo/inscriptions/apercu/page";
import DemoSite from "@/app/demo/site/page";
import DemoCours from "@/app/demo/cours/page";
import { CLUB } from "@/lib/demo/donnees";

/**
 * ACCESSIBILITÉ DE LA DÉMONSTRATION.
 *
 * TROIS EXIGENCES, ET LEUR RAISON D'ÊTRE
 *
 * 1. TOUT CE QUI SE CLIQUE A UN NOM. Un `<button>` dont le contenu est « ✕ » ou « ↑ » ne
 *    dit rien à une lecture d'écran, et un écran d'édition en aligne une dizaine. Le
 *    nom doit en plus être DISCRIMINANT : huit boutons « Retirer ce chapitre » ne
 *    permettent pas de savoir lequel agit sur quoi.
 * 2. TOUT CHAMP A UNE ÉTIQUETTE. Un `placeholder` n'en est pas une : il disparaît à la
 *    saisie, et n'est pas lu par tous les lecteurs d'écran.
 * 3. LA COULEUR DU CLUB NE PORTE PAS DE TEXTE. `#6B7F5E` mesure environ 3,6:1 sur le
 *    papier — sous le 4,5:1 exigé en AA. C'est un défaut du produit réel, consigné dans
 *    `docs/defauts-a-corriger.md` ; la démonstration ne le reproduit pas.
 *
 * CE QUE CES TESTS NE FONT PAS : mesurer un contraste calculé, ni une cible tactile
 * réelle. `happy-dom` n'applique pas Tailwind et ne fait aucune mise en page — toute
 * mesure y serait une mesure de rien. Ils vérifient donc les DÉCISIONS de code qui
 * produisent ces propriétés, et le lot 10 les complète par une passe au navigateur.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo",
}));

const ECRANS: [string, React.ReactNode][] = [
  ["/demo", <DemoHub key="hub" />],
  ["/demo/messages", <DemoMessages key="msg" />],
  ["/demo/actualites", <DemoActualites key="act" />],
  ["/demo/inscriptions", <DemoInscriptions key="ins" />],
  ["/demo/inscriptions/apercu", <DemoApercu key="ape" />],
  ["/demo/site", <DemoSite key="site" />],
  ["/demo/cours", <DemoCours key="cours" />],
];

/** Le nom accessible d'un élément, dans l'ordre où l'assistance le cherche. */
function nomAccessible(el: Element): string {
  const aria = el.getAttribute("aria-label");
  if (aria?.trim()) return aria.trim();
  const parId = el.getAttribute("aria-labelledby");
  if (parId) {
    const cible = document.getElementById(parId);
    if (cible?.textContent?.trim()) return cible.textContent.trim();
  }
  const id = el.getAttribute("id");
  if (id) {
    const label = document.querySelector(`label[for="${id}"]`);
    if (label?.textContent?.trim()) return label.textContent.trim();
  }
  const enveloppe = el.closest("label");
  if (enveloppe?.textContent?.trim()) return enveloppe.textContent.trim();
  return (el.textContent ?? "").trim();
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("chaque écran de la démonstration", () => {
  for (const [route, ecran] of ECRANS) {
    it(`${route} — tout ce qui se clique porte un nom`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      const sansNom = Array.from(document.querySelectorAll("button, a[href]"))
        .filter((el) => nomAccessible(el).length === 0)
        .map((el) => el.outerHTML.slice(0, 120));
      expect(sansNom).toEqual([]);
    });

    it(`${route} — tout champ de saisie porte une étiquette`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      const sansEtiquette = Array.from(document.querySelectorAll("input, select, textarea"))
        .filter((el) => el.getAttribute("type") !== "hidden")
        .filter((el) => nomAccessible(el).length === 0)
        .map((el) => el.outerHTML.slice(0, 160));
      expect(sansEtiquette).toEqual([]);
    });
  }
});

describe("les écrans d’édition", () => {
  it("donne un nom DISCRIMINANT à chaque contrôle de chapitre", () => {
    render(
      <DemoLayout>
        <DemoSite />
      </DemoLayout>
    );
    // Sept chapitres au moins, donc autant de « Monter », « Descendre », « Retirer ».
    // Deux boutons ne doivent jamais porter le même nom : c'est ce qui distingue un
    // libellé utile d'un libellé décoratif.
    const noms = Array.from(document.querySelectorAll("section button")).map(nomAccessible);
    const doublons = noms.filter((n, i) => noms.indexOf(n) !== i);
    expect(doublons).toEqual([]);
  });

  it("distingue les champs de deux cours différents", () => {
    render(
      <DemoLayout>
        <DemoCours />
      </DemoLayout>
    );
    const tarifs = Array.from(document.querySelectorAll("input")).map(nomAccessible).filter((n) => n.startsWith("Tarif du cours"));
    expect(tarifs.length).toBe(6);
    expect(new Set(tarifs).size).toBe(6);
  });
});

// ——— La couleur du club ———————————————————————————————————————————————————————

describe("la couleur du club", () => {
  const RACINE = path.resolve(__dirname, "..");

  function sources(): string[] {
    const trouves: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier)) {
        const complet = path.join(dossier, entree);
        if (statSync(complet).isDirectory()) parcourir(complet);
        else if (/\.tsx$/.test(entree)) trouves.push(complet);
      }
    };
    parcourir(path.join(RACINE, "src/app/demo"));
    parcourir(path.join(RACINE, "src/components/demo"));
    return trouves;
  }

  it("ne porte jamais de texte ni de fond de bouton", () => {
    const fautes: string[] = [];
    for (const f of sources()) {
      const contenu = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, " ");
      // `color: CLUB.couleur` et `background: CLUB.couleur` sont les deux formes qui
      // posent la couleur brute sous du texte. `borderColor` et `color-mix` sont
      // permis : ce sont des accents non textuels.
      for (const m of contenu.matchAll(/\b(color|background)\s*:\s*CLUB\.couleur\b(?!Texte)/g)) {
        fautes.push(`${path.relative(RACINE, f)} → ${m[0]}`);
      }
      for (const m of contenu.matchAll(/couleur=\{CLUB\.couleur\}/g)) {
        fautes.push(`${path.relative(RACINE, f)} → ${m[0]}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("garde deux valeurs distinctes, et la seconde est plus sombre", () => {
    expect(CLUB.couleurTexte).not.toBe(CLUB.couleur);
    const luminance = (hex: string) => {
      const canaux = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const lin = canaux.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
    };
    const contraste = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

    const papier = luminance("#FCFCFA");
    const brute = luminance(CLUB.couleur);
    const sombre = luminance(CLUB.couleurTexte);

    // La couleur brute échoue sur le papier — c'est bien pour cela qu'il en faut une
    // seconde. Ce test tomberait si quelqu'un « corrigeait » la donnée du club plutôt
    // que son usage : ce n'est pas au club de choisir sa couleur en pensant au contraste.
    expect(contraste(brute, papier)).toBeLessThan(4.5);
    // L'assombrie passe AA sur le papier ET sous du texte blanc.
    expect(contraste(sombre, papier)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(sombre, luminance("#FFFFFF"))).toBeGreaterThanOrEqual(4.5);
  });
});

// ——— Le geste principal reste atteignable au pouce ————————————————————————————

describe("les cibles tactiles", () => {
  it("déclare 44 px sur les gestes de terrain", () => {
    // `BoutonSimuler` porte `py-4` et non une hauteur minimale : on vérifie que les
    // gestes secondaires — ceux qu'on ajoute vite et qu'on oublie de dimensionner —
    // déclarent bien `min-h-[44px]`.
    render(
      <DemoLayout>
        <DemoSite />
      </DemoLayout>
    );
    const petits = Array.from(document.querySelectorAll("section button, header a"))
      .filter((b) => !/min-h-\[44px\]/.test(b.className))
      .map((b) => nomAccessible(b));
    expect(petits).toEqual([]);
  });
});

// ——— Un repère de structure ———————————————————————————————————————————————————

describe("la structure des écrans", () => {
  for (const [route, ecran] of ECRANS) {
    it(`${route} — porte un seul titre de premier niveau`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      // Un `h1` unique : c'est le repère par lequel une lecture d'écran commence.
      expect(document.querySelectorAll("h1").length).toBe(1);
      expect(screen.getAllByRole("heading", { level: 1 })[0].textContent?.trim().length).toBeGreaterThan(0);
    });
  }
});
