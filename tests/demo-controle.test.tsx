// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoControle from "@/app/demo/controle/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { chercherPourControle, verifierAdherentDemo } from "@/lib/demo/selecteurs";

/**
 * LE CONTRÔLE — l'écran qu'on tient d'une main, debout, quelqu'un devant soi.
 *
 * CE QUI PEUT Y MENTIR SANS RIEN CASSER
 * Le verdict. « À jour » et « Complet » sont deux affirmations sur une personne réelle,
 * et la RPC les calcule d'une façon précise qu'on croit connaître de mémoire :
 *
 *   — `cours` et `regle` sortent de la MÊME adhésion, la plus récente. Pas d'un
 *     « au moins une payée », pas d'un « toutes payées » ;
 *   — sans adhésion du tout, c'est « Non réglé », pas « À jour » ;
 *   — le compte de pièces ignore le caractère obligatoire.
 *
 * Les tests ci-dessous fixent ces trois règles sur des cas construits à la main, puis
 * vérifient l'écran sur les données du club.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/controle",
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
      <DemoControle />
      <Sonde />
    </DemoLayout>
  );

const clic = (t: string | RegExp) => act(() => screen.getByText(t).click());
const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const scan = () => clic("SIMULER UN SCAN →");
const taper = (v: string) =>
  act(() => {
    const el = document.getElementById("q-controle") as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Le calcul du verdict ————————————————————————————————————————————————————

describe("le verdict, tel que la RPC le calcule", () => {
  const base = creerEtatDemoInitial();

  it("lit le cours et le règlement sur la MÊME adhésion, la plus récente", () => {
    const etat: EtatDemo = {
      ...base,
      adherents: [{ id: "x", prenom: "Zoé", nom: "Vasseur", email: null, telephone: null, created_at: "2025-09-01", date_naissance: null, infos: {} }],
      pieces: [],
      presences: [],
      adhesions: [
        { ...base.adhesions[0], id: "v1", adherent_id: "x", cours_id: "c1", saison: "2025-2026", statut: "paye", created_at: "2025-09-01" },
        { ...base.adhesions[0], id: "v2", adherent_id: "x", cours_id: "c3", saison: "2026-2027", statut: "en_attente", created_at: "2026-09-01" },
      ],
    };
    const v = verifierAdherentDemo(etat, "x")!;
    // L'an dernier était soldé ; cette année ne l'est pas. C'est cette année qui compte.
    expect(v.regle).toBe(false);
    expect(v.cours).toBe("Judo benjamins");
  });

  it("dit « non réglé » d’un adhérent sans aucune adhésion", () => {
    const etat: EtatDemo = {
      ...base,
      adherents: [{ id: "y", prenom: "Sans", nom: "Adhesion", email: null, telephone: null, created_at: "2026-09-01", date_naissance: null, infos: {} }],
      adhesions: [],
      pieces: [],
      presences: [],
    };
    const v = verifierAdherentDemo(etat, "y")!;
    // `coalesce(…, false)` : l'absence de réponse n'est pas une réponse favorable.
    expect(v.regle).toBe(false);
    expect(v.cours).toBeNull();
  });

  it("départage deux adhésions du même jour par leur identifiant", () => {
    const memeJour = (id: string, cours: string, statut: "paye" | "en_attente") => ({
      ...base.adhesions[0],
      id,
      adherent_id: "z",
      cours_id: cours,
      saison: "2026-2027",
      statut,
      created_at: "2026-09-01",
    });
    const etat: EtatDemo = {
      ...base,
      adherents: [{ id: "z", prenom: "Ex", nom: "Aequo", email: null, telephone: null, created_at: "2026-09-01", date_naissance: null, infos: {} }],
      // Écrites dans le désordre : sans second critère de tri, le résultat dépendrait
      // de l'ordre du tableau, c'est-à-dire du hasard.
      adhesions: [memeJour("ad-b", "c2", "paye"), memeJour("ad-a", "c1", "en_attente")],
      pieces: [],
      presences: [],
    };
    expect(verifierAdherentDemo(etat, "z")!.cours).toBe("Éveil judo");
  });

  it("renvoie null sur un identifiant inconnu", () => {
    expect(verifierAdherentDemo(base, "carte-dun-autre-club")).toBeNull();
  });
});

// ——— La recherche du scanner ————————————————————————————————————————————————

describe("la recherche du scanner", () => {
  const base = creerEtatDemoInitial();

  it("ne répond pas à moins de deux caractères", () => {
    // Le serveur renvoie une liste vide, pas tout le club : c'est une garde, pas un
    // détail de confort.
    expect(chercherPourControle(base, "B")).toEqual([]);
    expect(chercherPourControle(base, " ")).toEqual([]);
    expect(chercherPourControle(base, "Be").length).toBeGreaterThan(0);
  });

  it("cherche dans le nom comme dans le prénom, sans casse", () => {
    expect(chercherPourControle(base, "BERTHIER")[0].prenom).toBe("Lina");
    expect(chercherPourControle(base, "lina")[0].nom).toBe("Berthier");
  });

  it("écarte les caractères d’injection avant de chercher", () => {
    // `%`, `_` et l'apostrophe sont retirés côté serveur avant d'entrer dans un `ilike`.
    expect(chercherPourControle(base, "Berthier%")[0].nom).toBe("Berthier");
    expect(chercherPourControle(base, "'; drop--").length).toBe(0);
  });

  it("ne rend jamais plus de douze noms", () => {
    // « e » seul serait trop court ; deux lettres très communes suffisent à déborder.
    const large = chercherPourControle(base, "er");
    expect(large.length).toBeLessThanOrEqual(12);
  });
});

// ——— L'écran ——————————————————————————————————————————————————————————————————

describe("l’écran de contrôle", () => {
  it("n’affiche aucun verdict avant qu’on ait présenté quelqu’un", () => {
    monter();
    expect(screen.queryByText("RÈGLEMENT")).toBeNull();
    expect(screen.queryByText("Adhérent introuvable.")).toBeNull();
    expect(screen.getByText("SIMULER UN SCAN →")).toBeTruthy();
    expect(screen.getByLabelText(/OU RECHERCHER/)).toBeTruthy();
  });

  it("n’ouvre pas la caméra et le dit", () => {
    monter();
    expect(screen.getByText(/La caméra n’est pas ouverte ici/)).toBeTruthy();
  });

  it("présente d’abord un dossier en règle", () => {
    monter();
    scan();
    expect(screen.getByText("Lina Berthier")).toBeTruthy();
    expect(screen.getByText("Judo poussins")).toBeTruthy();
    expect(screen.getByText("✓ À jour")).toBeTruthy();
    expect(screen.getByText("✓ Complet")).toBeTruthy();
  });

  it("présente ensuite une cotisation en attente, puis un dossier incomplet", () => {
    monter();
    scan();
    scan();
    expect(screen.getByText("Adam Nguyen")).toBeTruthy();
    expect(screen.getByText("✕ Non réglé")).toBeTruthy();
    expect(screen.getByText("✓ Complet")).toBeTruthy();

    scan();
    expect(screen.getByText("Jules Leclerc")).toBeTruthy();
    expect(screen.getByText("✕ 1 pièce(s) manquante(s)")).toBeTruthy();
    expect(screen.getByText("✓ À jour")).toBeTruthy();
  });

  it("finit par la carte d’un autre club, avec le seul message d’erreur du produit", () => {
    monter();
    scan();
    scan();
    scan();
    scan();
    expect(screen.getByText("Adhérent introuvable.")).toBeTruthy();
    // Aucun verdict ne subsiste à côté de l'erreur.
    expect(screen.queryByText("RÈGLEMENT")).toBeNull();
  });

  it("recommence la rotation au tour suivant", () => {
    monter();
    for (let i = 0; i < 4; i++) scan();
    scan();
    expect(screen.getByText("Lina Berthier")).toBeTruthy();
  });

  it("trouve quelqu’un par son nom et affiche le même verdict", () => {
    monter();
    taper("leclerc");
    clic("Jules Leclerc");
    expect(screen.getByText("✕ 1 pièce(s) manquante(s)")).toBeTruthy();
    // La liste s'est refermée et le champ est vide, comme dans le produit.
    expect((document.getElementById("q-controle") as HTMLInputElement).value).toBe("");
  });

  it("dit clairement qu’un nom ne correspond à personne", () => {
    monter();
    taper("zzzz");
    expect(screen.getByText("Aucun adhérent ne porte ce nom.")).toBeTruthy();
  });

  it("garde les deux modes disponibles en même temps", () => {
    monter();
    scan();
    // Le champ de recherche n'a pas disparu derrière le verdict.
    expect(screen.getByLabelText(/OU RECHERCHER/)).toBeTruthy();
    expect(screen.getByText("SIMULER UN SCAN →")).toBeTruthy();
  });
});

// ——— La présence ——————————————————————————————————————————————————————————————

/**
 * TROIS PERSONNES SONT DÉJÀ PASSÉES CE SOIR — a01, a11 et a22 (`PRESENCES_INITIALES`).
 *
 * Je l'avais oublié en écrivant ces tests, et je comptais les présences à partir de
 * zéro. C'est le club qui avait raison : un cockpit ouvert à 19 h a déjà des gens dans
 * la salle. La première carte de la rotation, Lina Berthier, est donc DÉJÀ présente —
 * ce qui donne gratuitement la démonstration de l'état « déjà pointé ». Les gestes se
 * testent sur la deuxième carte, Adam Nguyen, qui ne l'est pas.
 */
const DEJA = 3;

describe("marquer la présence", () => {
  it("montre l’état « déjà pointé » sans qu’on ait rien à faire", () => {
    monter();
    scan(); // Lina Berthier, arrivée avant l'ouverture de l'écran
    expect(screen.getByText("✓ PRÉSENT AUJOURD’HUI")).toBeTruthy();
    expect(screen.queryByText("SIMULER LA PRÉSENCE →")).toBeNull();
  });

  it("n’écrit rien avant 450 ms", () => {
    monter();
    scan();
    scan(); // Adam Nguyen
    clic("SIMULER LA PRÉSENCE →");
    avancer(449);
    expect(vu!.presences.length).toBe(DEJA);
    avancer(1);
    expect(vu!.presences.length).toBe(DEJA + 1);
  });

  it("bascule l’encart sans qu’on ait à rescanner", () => {
    monter();
    scan();
    scan();
    clic("SIMULER LA PRÉSENCE →");
    avancer(450);
    expect(screen.getByText("✓ PRÉSENT AUJOURD’HUI")).toBeTruthy();
    expect(screen.queryByText("SIMULER LA PRÉSENCE →")).toBeNull();
  });

  it("se souvient de la présence quand on repasse la même carte", () => {
    monter();
    scan();
    scan();
    clic("SIMULER LA PRÉSENCE →");
    avancer(450);
    for (let i = 0; i < 4; i++) scan(); // un tour complet
    expect(screen.getByText("Adam Nguyen")).toBeTruthy();
    expect(screen.getByText("✓ PRÉSENT AUJOURD’HUI")).toBeTruthy();
  });

  it("ne compte pas deux fois la même personne", () => {
    // La RPC réelle est idempotente (`on conflict do nothing`) : rejouer le geste ne
    // doit pas gonfler la feuille d'appel.
    const base = creerEtatDemoInitial();
    const une = reducteurDemo(base, { type: "presence/marquer", adherentId: "a02" });
    const deux = reducteurDemo(une, { type: "presence/marquer", adherentId: "a02" });
    expect(une.presences.length).toBe(DEJA + 1);
    expect(deux.presences.length).toBe(DEJA + 1);
    // Et pointer quelqu'un qui l'est déjà ne change rien du tout.
    expect(reducteurDemo(base, { type: "presence/marquer", adherentId: "a01" })).toBe(base);
  });

  it("n’écrit une présence que pour la personne présentée", () => {
    monter();
    scan();
    scan(); // Adam Nguyen
    clic("SIMULER LA PRÉSENCE →");
    avancer(450);
    expect(vu!.presences.map((p) => p.adherent_id)).toEqual(["a01", "a11", "a22", "a02"]);
  });
});
