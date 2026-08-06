// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoImport from "@/app/demo/adherents/import/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, type EtatDemo } from "@/lib/demo/etat";
import { COLONNES_EXPORT, NOM_FICHIER_EXPORT, construireCsvAdherents } from "@/lib/demo/csv";

/**
 * L'IMPORT ET L'EXPORT — les deux gestes qui font entrer et sortir des fiches.
 *
 * POURQUOI CET ÉCRAN MÉRITE SES PROPRES TESTS
 * C'est le seul de la démonstration qui lit un fichier. Trois choses peuvent y mentir
 * sans que rien ne casse :
 *
 *   1. la DÉTECTION des colonnes — un fichier réel ne s'appelle jamais « Email » mais
 *      « Adresse email », ni « Téléphone » mais « Portable » ;
 *   2. le COMPTE-RENDU — c'est le seul endroit où le visiteur apprend qu'on a ignoré
 *      quelque chose ; un chiffre faux ici ruine la confiance que l'écran cherche à
 *      construire ;
 *   3. le SORT DES LIGNES IMPARFAITES — le produit crée l'adhérent sans email plutôt
 *      que de le rejeter, et cette nuance ne se voit qu'en la testant.
 *
 * Le fichier d'exemple porte exprès les défauts d'un vrai export de tableur. Les
 * chiffres attendus ci-dessous en découlent, et sont écrits en clair plutôt que
 * recalculés : un test qui refait le calcul du code ne teste que lui-même.
 *
 *   7 lignes lues
 *   − 1 doublon d'email (Camille Aubert deux fois)
 *   − 1 ligne sans prénom (« ;Sanchez »)
 *   = 5 adhérents créés, 2 lignes ignorées
 *
 * Et parmi les 5 : Élodie Charpentier entre SANS email (« @example » n'a pas de point)
 * et SANS adhésion (« Aquagym » n'est pas un cours du club).
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/adherents/import",
}));

/** Sonde : on lit l'état réel plutôt que de déduire ce qu'il devrait contenir. */
let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => {
    vu = etat;
  }, [etat]);
  return null;
}

function monter() {
  return render(
    <DemoLayout>
      <DemoImport />
      <Sonde />
    </DemoLayout>
  );
}

const clic = (t: string | RegExp) => act(() => screen.getByText(t).click());
const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

/**
 * Change un `<select>` comme le ferait un utilisateur.
 *
 * Écrire `el.value = "…"` ne suffit pas : React écoute l'événement, pas la propriété.
 * On passe donc par le setter natif du prototype, sinon React ne voit rien et l'écran
 * reste sur l'ancienne valeur — le test passerait en ne changeant rien.
 */
const choisir = (label: string, valeur: string) =>
  act(() => {
    const el = screen.getByLabelText(label) as HTMLSelectElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

const exemple = () => clic("CHARGER LE FICHIER D’EXEMPLE");
const lancer = () => clic(/SIMULER L’IMPORT DE/);

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Lecture et détection ————————————————————————————————————————————————————————

describe("la lecture du fichier", () => {
  it("n’affiche ni colonnes ni aperçu tant qu’aucun fichier n’est chargé", () => {
    monter();
    expect(screen.queryByText("2 — LES COLONNES")).toBeNull();
    expect(screen.queryByText(/3 — APERÇU/)).toBeNull();
    expect(screen.getByText("1 — VOTRE FICHIER")).toBeTruthy();
  });

  it("reconnaît « Adresse email », « Portable » et « Activité »", () => {
    monter();
    exemple();
    // Les intitulés du fichier, pas ceux de Klubster : c'est tout l'intérêt.
    expect((screen.getByLabelText("Email") as HTMLSelectElement).value).toBe("2");
    expect((screen.getByLabelText("Téléphone") as HTMLSelectElement).value).toBe("3");
    expect((screen.getByLabelText("Cours") as HTMLSelectElement).value).toBe("4");
    expect((screen.getByLabelText("Prénom *") as HTMLSelectElement).value).toBe("0");
    expect((screen.getByLabelText("Nom *") as HTMLSelectElement).value).toBe("1");
  });

  it("annonce les sept lignes et n’en montre que cinq", () => {
    monter();
    exemple();
    expect(screen.getByText("3 — APERÇU (7 lignes)")).toBeTruthy();
    expect(document.querySelectorAll("tbody tr").length).toBe(5);
    expect(screen.getByText(/… et 2 autres/)).toBeTruthy();
    // Le doublon tombe en 4e position, donc DANS l'aperçu — et c'est bien ainsi : le
    // visiteur voit la ligne que Klubster va écarter, au lieu de la découvrir dans un
    // compte-rendu. J'avais écrit l'inverse, le test m'a repris.
    expect(screen.getAllByText("Camille").length).toBe(2);
  });

  it("avertit avant d’écrire quoi que ce soit", () => {
    monter();
    exemple();
    expect(screen.getByText(/1 ligne\(s\) sans prénom ou sans nom/)).toBeTruthy();
    expect(screen.getByText(/1 email\(s\) ne sont pas lisibles/)).toBeTruthy();
    // L'état n'a pas bougé : avertir n'est pas importer.
    expect(vu!.adherents.length).toBe(creerEtatDemoInitial().adherents.length);
  });

  it("refuse un fichier sans tableau lisible", async () => {
    monter();
    const input = document.getElementById("fichier") as HTMLInputElement;
    const f = new File([""], "vide.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [f], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(screen.getByRole("alert").textContent).toContain("ne contient pas de tableau lisible");
    expect(screen.queryByText("2 — LES COLONNES")).toBeNull();
  });

  it("lit un fichier choisi sur le disque, sans réseau", async () => {
    monter();
    const input = document.getElementById("fichier") as HTMLInputElement;
    const f = new File(["Prenom,Nom\nZoe,Vasseur\n"], "mesadherents.csv", { type: "text/csv" });
    Object.defineProperty(input, "files", { value: [f], configurable: true });
    await act(async () => {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    // Virgule au lieu du point-virgule, en-têtes sans accent : détectés quand même.
    expect(screen.getByText("3 — APERÇU (1 ligne)")).toBeTruthy();
    expect(screen.getByText("Zoe")).toBeTruthy();
  });
});

// ——— La correspondance des colonnes ——————————————————————————————————————————————

describe("la correspondance des colonnes", () => {
  it("bloque le geste quand « Nom » n’est associé à rien", () => {
    monter();
    exemple();
    choisir("Nom *", "-1");
    expect(screen.getByText(/La colonne « Nom » n’est associée à rien/)).toBeTruthy();
    const bouton = screen.getByText(/SIMULER L’IMPORT DE/) as HTMLButtonElement;
    expect(bouton.disabled).toBe(true);
  });

  it("laisse corriger une association devinée", () => {
    monter();
    exemple();
    // On dit à Klubster que la colonne « Activité » ne doit pas être importée.
    choisir("Cours", "-1");
    lancer();
    avancer(450);
    // Personne n'a d'adhésion : toutes les fiches sont créées, aucune n'est rattachée.
    const nouveaux = vu!.adherents.filter((a) => a.id.startsWith("a-imp"));
    expect(nouveaux.length).toBe(5);
    const ids = new Set(nouveaux.map((a) => a.id));
    expect(vu!.adhesions.filter((ad) => ids.has(ad.adherent_id)).length).toBe(0);
  });
});

// ——— Le geste lui-même ——————————————————————————————————————————————————————————

describe("l’import simulé", () => {
  it("n’écrit rien avant 450 ms", () => {
    monter();
    exemple();
    const avant = vu!.adherents.length;
    lancer();
    avancer(449);
    expect(vu!.adherents.length).toBe(avant);
    avancer(1);
    expect(vu!.adherents.length).toBe(avant + 5);
  });

  it("crée cinq adhérents et en ignore deux", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    expect(screen.getByText("5 adhérents importés.")).toBeTruthy();
    expect(screen.getByText(/2 lignes ignorées sur 7/)).toBeTruthy();
  });

  it("nomme la ligne écartée pour que personne ne la cherche", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    // La sixième ligne du fichier, donc la ligne 7 du tableur en comptant l'en-tête.
    expect(screen.getByText("Ligne 7 : prénom ou nom manquant — ignorée.")).toBeTruthy();
  });

  it("crée l’adhérente à l’email illisible, mais sans email", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    const elodie = vu!.adherents.find((a) => a.nom === "Charpentier");
    expect(elodie).toBeTruthy();
    expect(elodie!.email).toBeNull();
    // Et sans adhésion : « Aquagym » n'est pas un cours de ce club.
    expect(vu!.adhesions.some((ad) => ad.adherent_id === elodie!.id)).toBe(false);
  });

  it("refuse le doublon d’email et accepte l’adhérente sans email", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    expect(vu!.adherents.filter((a) => a.nom === "Aubert").length).toBe(1);
    const farida = vu!.adherents.find((a) => a.nom === "Belkacem");
    expect(farida!.email).toBeNull();
    expect(farida!.telephone).toBe("06 33 33 33 33");
  });

  it("rattache chaque ligne au cours nommé dans le fichier", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    const parId = new Map(vu!.cours.map((c) => [c.id, c.nom]));
    const cours = (nom: string) => {
      const a = vu!.adherents.find((x) => x.nom === nom)!;
      const ad = vu!.adhesions.find((x) => x.adherent_id === a.id);
      return ad ? parId.get(ad.cours_id!) : null;
    };
    expect(cours("Aubert")).toBe("Hatha Yoga");
    expect(cours("Perrot")).toBe("Vinyasa Flow");
    expect(cours("Belkacem")).toBe("Yin Yoga");
    expect(cours("Morvan")).toBe("Yoga sur chaise");
  });

  it("applique le cours par défaut aux lignes sans correspondance", () => {
    monter();
    exemple();
    choisir("COURS PAR DÉFAUT", "c4"); // Yoga Nidra
    lancer();
    avancer(450);
    const elodie = vu!.adherents.find((a) => a.nom === "Charpentier")!;
    const ad = vu!.adhesions.find((x) => x.adherent_id === elodie.id);
    expect(ad).toBeTruthy();
    expect(ad!.cours_id).toBe("c4");
    // Les autres gardent le cours lu dans le fichier — le défaut ne les écrase pas.
    const camille = vu!.adherents.find((a) => a.nom === "Aubert")!;
    expect(vu!.adhesions.find((x) => x.adherent_id === camille.id)!.cours_id).toBe("c1");
  });

  it("ne crée aucune pièce à fournir", () => {
    monter();
    exemple();
    lancer();
    avancer(450);
    const ids = new Set(vu!.adherents.filter((a) => a.id.startsWith("a-imp")).map((a) => a.id));
    // `inserer_adherents_adhesions` ne touche pas à `pieces_adherent` : un dossier
    // importé n'est pas un dossier incomplet, il est un dossier sans exigence.
    expect(vu!.pieces.filter((p) => ids.has(p.adherent_id)).length).toBe(0);
  });

  it("n’écrase aucune fiche existante", () => {
    monter();
    const avant = creerEtatDemoInitial().adherents;
    exemple();
    lancer();
    avancer(450);
    for (const a of avant) {
      const apres = vu!.adherents.find((x) => x.id === a.id);
      expect(apres).toEqual(a);
    }
  });
});

// ——— L'export —————————————————————————————————————————————————————————————————

describe("l’export CSV", () => {
  const etat = creerEtatDemoInitial();
  const csv = construireCsvAdherents(etat.adherents, etat.adhesions, etat.cours);
  const lignes = csv.replace(/^﻿/, "").split("\n");

  it("commence par un BOM, sans quoi Excel massacre les accents", () => {
    expect(csv.startsWith("﻿")).toBe(true);
  });

  it("porte les dix colonnes du produit, dans l’ordre", () => {
    expect(lignes[0]).toBe(COLONNES_EXPORT.map((c) => `"${c}"`).join(";"));
  });

  it("garde dix champs sur chaque ligne, y compris les vides", () => {
    for (const l of lignes) expect(l.split(";").length).toBe(10);
  });

  it("ne contient aucune donnée de santé", () => {
    // L'export réel n'en exporte pas, et c'est une obligation, pas une préférence.
    expect(csv.toLowerCase()).not.toMatch(/sant|certificat|questionnaire|atteste/);
  });

  it("n’expose que des adresses fictives", () => {
    const adresses = csv.match(/[\w.+-]+@[\w.-]+/g) ?? [];
    expect(adresses.length).toBeGreaterThan(20);
    for (const a of adresses) expect(a.endsWith("@example.com")).toBe(true);
  });

  it("laisse vides les cinq dernières colonnes d’un adhérent sans adhésion", () => {
    const sansAdhesion = etat.adherents.filter(
      (a) => !etat.adhesions.some((ad) => ad.adherent_id === a.id)
    );
    for (const a of sansAdhesion) {
      const ligne = lignes.find((l) => l.startsWith(`"${a.prenom}";"${a.nom}"`))!;
      expect(ligne.endsWith(';"";"";"";"";""')).toBe(true);
    }
  });

  it("écrit le montant à la française et laisse le statut brut", () => {
    const michel = lignes.find((l) => l.includes('"Chevalier"'))!;
    // Michel Chevalier n'a pas d'email : la colonne est vide, pas absente.
    expect(michel).toContain('"Chevalier";"";"02 41 77 88 99"');
    expect(michel).toContain('"Yoga sur chaise"');
    expect(michel).toContain('"210,00"');
    // `paye`, pas « Payé » : c'est la valeur de la base, comme dans le produit.
    expect(michel).toContain('"paye"');
  });

  it("trie par nom", () => {
    const noms = lignes.slice(1).map((l) => l.split(";")[1].replace(/"/g, ""));
    expect(noms).toEqual([...noms].sort((a, b) => a.localeCompare(b, "fr")));
  });

  it("porte un nom de fichier qui dit qu’il est fictif", () => {
    expect(NOM_FICHIER_EXPORT).toContain("demonstration");
  });
});
