// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense } from "react";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { render, screen } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoHub from "@/app/demo/page";
import DemoAdherents from "@/app/demo/adherents/page";
import DemoFiche from "@/app/demo/adherents/[id]/page";
import DemoNouveau from "@/app/demo/adherents/nouveau/page";
import DemoImport from "@/app/demo/adherents/import/page";
import DemoControle from "@/app/demo/controle/page";
import DemoPaiements from "@/app/demo/paiements/page";
import DemoRelances from "@/app/demo/paiements/relances/page";
import DemoRemise from "@/app/demo/paiements/remise/page";
import DemoMessages from "@/app/demo/messages/page";
import DemoCampagne from "@/app/demo/messages/[id]/page";
import DemoActualites from "@/app/demo/actualites/page";
import DemoActualite from "@/app/demo/actualites/[id]/page";
import DemoInscriptions from "@/app/demo/inscriptions/page";
import DemoApercu from "@/app/demo/inscriptions/apercu/page";
import DemoSite from "@/app/demo/site/page";
import DemoCours from "@/app/demo/cours/page";
import DemoPiece from "@/app/demo/piece/[id]/page";
import { CLUB } from "@/lib/demo/donnees";
import { creerEtatDemoInitial } from "@/lib/demo/etat";

/**
 * ACCESSIBILITÉ DE LA DÉMONSTRATION — LES DIX-HUIT ROUTES.
 *
 * POURQUOI LES DIX-HUIT, ET PAS LES SEPT DERNIÈRES ÉCRITES
 * Une couverture partielle sous un titre général est pire qu'aucune couverture : elle
 * fait passer pour vérifié ce qui ne l'est pas. La première version de ce fichier ne
 * montait que les écrans des lots 4 à 8 — ceux que je venais d'écrire — et laissait de
 * côté les adhérents, le contrôle et les trois écrans de trésorerie, c'est-à-dire les
 * plus anciens et donc les moins relus.
 *
 * QUATRE EXIGENCES, ET LEUR RAISON D'ÊTRE
 *
 * 1. TOUT CE QUI SE CLIQUE A UN NOM. Un `<button>` dont le contenu est « ✕ » ou « ↑ » ne
 *    dit rien à une lecture d'écran, et un écran d'édition en aligne une dizaine. Le nom
 *    doit en plus être DISCRIMINANT quand plusieurs contrôles font la même chose : huit
 *    boutons « Retirer ce chapitre » ne permettent pas de savoir lequel agit sur quoi.
 * 2. TOUT CHAMP A UNE ÉTIQUETTE. Un `placeholder` n'en est pas une : il disparaît à la
 *    saisie, et n'est pas lu par tous les lecteurs d'écran.
 * 3. LA COULEUR NE PORTE JAMAIS SEULE UNE INFORMATION. Un statut coloré doit être écrit.
 * 4. LA COULEUR DU CLUB NE PORTE PAS DE TEXTE. `#6B7F5E` mesure environ 3,6:1 sur le
 *    papier — sous le 4,5:1 exigé en AA. C'est un défaut du produit réel, consigné dans
 *    `docs/defauts-a-corriger.md` ; la démonstration ne le reproduit pas.
 *
 * CE QUE CES TESTS NE FONT PAS, ET IL FAUT LE DIRE : mesurer une hauteur rendue.
 * `happy-dom` n'applique pas Tailwind et ne fait aucune mise en page — toute mesure y
 * serait une mesure de rien. Ils vérifient donc les DÉCISIONS DE CLASSE qui produisent
 * ces hauteurs. La mesure réelle est faite au navigateur, à trois largeurs, et consignée
 * dans `docs/reprise-demo-interactive.md`.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo",
}));

/** Promesse déjà résolue : `use(params)` la lit sans suspendre, même sous horloge figée. */
function paramsResolus(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  p.status = "fulfilled";
  p.value = { id };
  return p;
}

const BASE = creerEtatDemoInitial();
const UN_ADHERENT = BASE.adherents[0].id;
const UNE_CAMPAGNE = BASE.campagnes[0].id;
const UNE_ACTUALITE = BASE.actualites[0].id;
const UNE_PIECE = BASE.pieces[0].id;

/** Une page dynamique se monte sous `<Suspense>`, avec ses paramètres déjà résolus. */
const dyn = (Composant: React.ComponentType<{ params: Promise<{ id: string }> }>, id: string) => (
  <Suspense fallback={null}>
    <Composant params={paramsResolus(id)} />
  </Suspense>
);

/**
 * LES DIX-HUIT ROUTES. Toute route ajoutée sous `/demo` doit entrer ici — un test plus
 * bas compare cette liste au contenu réel de `src/app/demo`, pour qu'un oubli se voie.
 */
const ECRANS: [string, React.ReactNode][] = [
  ["/demo", <DemoHub key="hub" />],
  ["/demo/adherents", <DemoAdherents key="adh" />],
  ["/demo/adherents/[id]", dyn(DemoFiche, UN_ADHERENT)],
  ["/demo/adherents/nouveau", <DemoNouveau key="new" />],
  ["/demo/adherents/import", <DemoImport key="imp" />],
  ["/demo/controle", <DemoControle key="ctl" />],
  ["/demo/paiements", <DemoPaiements key="pai" />],
  ["/demo/paiements/relances", <DemoRelances key="rel" />],
  ["/demo/paiements/remise", <DemoRemise key="rem" />],
  ["/demo/messages", <DemoMessages key="msg" />],
  ["/demo/messages/[id]", dyn(DemoCampagne, UNE_CAMPAGNE)],
  ["/demo/actualites", <DemoActualites key="act" />],
  ["/demo/actualites/[id]", dyn(DemoActualite, UNE_ACTUALITE)],
  ["/demo/inscriptions", <DemoInscriptions key="ins" />],
  ["/demo/inscriptions/apercu", <DemoApercu key="ape" />],
  ["/demo/site", <DemoSite key="site" />],
  ["/demo/cours", <DemoCours key="cours" />],
  ["/demo/piece/[id]", dyn(DemoPiece, UNE_PIECE)],
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
  const titre = el.getAttribute("title");
  if (titre?.trim()) return titre.trim();
  return (el.textContent ?? "").trim();
}

/**
 * Une cible tactile suffisante, telle que le CODE la déclare.
 *
 * `min-h-[44px]` est la déclaration explicite. `py-3` (12 px × 2 + une ligne de 20 px
 * ≈ 44 px), `py-3.5` et `py-4` y arrivent par le rembourrage. On accepte donc l'un ou
 * l'autre — et rien d'autre : `py-2` sur un bouton de 11 px donne une cible de 30 px, à
 * viser du pouce au bord d'un tapis.
 */
const CIBLE_SUFFISANTE = /min-h-\[44px\]|(?:^|\s)py-(?:3|3\.5|4)(?:\s|$)/;

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

// ——— Les dix-huit écrans ——————————————————————————————————————————————————————

describe("chaque écran de la démonstration", () => {
  for (const [route, ecran] of ECRANS) {
    it(`${route} — porte un seul titre de premier niveau`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      expect(document.querySelectorAll("h1").length).toBe(1);
      expect(screen.getAllByRole("heading", { level: 1 })[0].textContent?.trim().length).toBeGreaterThan(0);
    });

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

    it(`${route} — deux contrôles ne portent jamais le même nom`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      // Le layout répète volontairement des liens (bandeau, en-tête) : on ne compare
      // que ce qui vit DANS l'écran, c'est-à-dire dans son `<main>`.
      const principal = document.querySelector("main");
      if (!principal) return;
      const noms = Array.from(principal.querySelectorAll("button, a[href]")).map(nomAccessible);
      const doublons = [...new Set(noms.filter((n, i) => noms.indexOf(n) !== i))];
      expect(doublons).toEqual([]);
    });

    it(`${route} — déclare une cible tactile suffisante partout`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      const principal = document.querySelector("main");
      if (!principal) return;
      const petits = Array.from(principal.querySelectorAll("button, a[href]"))
        .filter((el) => !CIBLE_SUFFISANTE.test(el.className))
        .map((el) => `${nomAccessible(el)} → ${el.className}`);
      expect(petits).toEqual([]);
    });

    it(`${route} — aucune information ne repose sur la seule couleur`, () => {
      render(<DemoLayout>{ecran}</DemoLayout>);
      // Un élément coloré sans texte ne dit rien à qui ne distingue pas les couleurs.
      // Les éléments purement décoratifs s'en excluent en portant `aria-hidden`.
      const muets = Array.from(document.querySelectorAll("[style*='color'], .text-danger, .text-warning, .text-brand-dark"))
        .filter((el) => el.getAttribute("aria-hidden") !== "true")
        .filter((el) => (el.textContent ?? "").trim().length === 0)
        .map((el) => el.outerHTML.slice(0, 120));
      expect(muets).toEqual([]);
    });
  }
});

// ——— Le garde-fou de la liste elle-même ——————————————————————————————————————

describe("la liste des écrans", () => {
  it("couvre toutes les routes du dossier /demo", () => {
    // Un test d'accessibilité qui oublie une route ment par omission. On compte les
    // `page.tsx` sur le disque et on compare : ajouter un écran sans l'ajouter ici
    // fera tomber ce test, et non passer le suivant en silence.
    const racine = path.resolve(__dirname, "..", "src/app/demo");
    const pages: string[] = [];
    const parcourir = (dossier: string) => {
      for (const entree of readdirSync(dossier)) {
        const complet = path.join(dossier, entree);
        if (statSync(complet).isDirectory()) parcourir(complet);
        else if (entree === "page.tsx") {
          const rel = path.relative(racine, path.dirname(complet));
          pages.push(rel === "" ? "/demo" : `/demo/${rel.split(path.sep).join("/")}`);
        }
      }
    };
    parcourir(racine);
    expect(pages.sort()).toEqual(ECRANS.map(([r]) => r).sort());
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
      // `borderColor` et `color-mix` sont permis : ce sont des accents non textuels.
      for (const m of contenu.matchAll(/\b(color|background)\s*:\s*CLUB\.couleur\b(?!Texte)/g)) {
        fautes.push(`${path.relative(RACINE, f)} → ${m[0]}`);
      }
      for (const m of contenu.matchAll(/couleur=\{CLUB\.couleur\}/g)) {
        fautes.push(`${path.relative(RACINE, f)} → ${m[0]}`);
      }
    }
    expect(fautes).toEqual([]);
  });

  it("garde deux valeurs distinctes, et la seconde passe AA", () => {
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
    expect(contraste(sombre, papier)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(sombre, luminance("#FFFFFF"))).toBeGreaterThanOrEqual(4.5);
  });
});
