// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoCours from "@/app/demo/cours/page";
import DemoSite from "@/app/demo/site/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { jaugeDuCours } from "@/lib/demo/selecteurs";
import { CLUB } from "@/lib/demo/donnees";

/**
 * COURS ET TARIFS.
 *
 * CE QUE CES TESTS PROTÈGENT
 *
 * 1. Un cours qui compte des adhérents ne se supprime pas — le refus est côté réducteur,
 *    comme côté serveur, et pas seulement dans l'affichage. Un écran qui se contente de
 *    cacher le bouton laisse la porte ouverte.
 * 2. Un tarif modifié suit jusqu'à la vitrine. C'est la promesse de l'écran ; si elle ne
 *    tient pas, la démonstration ment sur le produit.
 * 3. La jauge, et elle seule, ouvre la liste d'attente — pas un réglage séparé.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/cours",
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
const clic = (nom: string | RegExp) => act(() => screen.getByRole("button", { name: nom }).click());
const clicN = (nom: string | RegExp, i: number) =>
  act(() => screen.getAllByRole("button", { name: nom })[i].click());

const poser = (el: HTMLElement, valeur: string, prototype: { prototype: object }) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Les règles ———————————————————————————————————————————————————————————————

describe("les règles du réducteur", () => {
  const base = creerEtatDemoInitial();

  it("refuse de supprimer un cours qui compte des adhérents", () => {
    const cible = base.cours[0];
    expect(base.adhesions.some((a) => a.cours_id === cible.id)).toBe(true);
    const apres = reducteurDemo(base, { type: "cours/supprimer", id: cible.id });
    // Rien n'a bougé — pas même la référence : l'état est rendu tel quel.
    expect(apres).toBe(base);
    expect(apres.cours.some((c) => c.id === cible.id)).toBe(true);
  });

  it("supprime un cours vide", () => {
    const cree = reducteurDemo(base, { type: "cours/ajouter", nom: "Kata du samedi", tarifCentimes: 18000 });
    const nouveau = cree.cours.at(-1)!;
    const apres = reducteurDemo(cree, { type: "cours/supprimer", id: nouveau.id });
    expect(apres.cours.some((c) => c.id === nouveau.id)).toBe(false);
  });

  it("n’accepte pas un tarif négatif", () => {
    const apres = reducteurDemo(base, { type: "cours/ajouter", nom: "Essai", tarifCentimes: -5000 });
    expect(apres.cours.at(-1)!.tarif_centimes).toBe(0);
  });

  it("promeut une adhésion de la liste d’attente en « en attente » de règlement", () => {
    const attente = base.adhesions.find((a) => a.statut === "liste_attente")!;
    const apres = reducteurDemo(base, { type: "listeAttente/promouvoir", adhesionId: attente.id });
    expect(apres.adhesions.find((a) => a.id === attente.id)!.statut).toBe("en_attente");
    // Et la place est désormais occupée : la jauge le voit.
    expect(jaugeDuCours(apres, attente.cours_id!).inscrits).toBe(jaugeDuCours(base, attente.cours_id!).inscrits + 1);
  });
});

// ——— L'écran ——————————————————————————————————————————————————————————————————

describe("l’écran", () => {
  it("compte les cours dans son titre", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    expect(screen.getByText(`${base.cours.length} cours`)).toBeTruthy();
  });

  it("affiche la jauge d’un cours limité et l’absence de jauge sinon", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    const j = jaugeDuCours(base, base.cours[0].id);
    expect(screen.getByText(new RegExp(`${j.inscrits}/${j.places} inscrits`))).toBeTruthy();
    expect(screen.getByText(/1 en liste d’attente/)).toBeTruthy();
  });

  it("annonce l’impossibilité de supprimer avant le clic", () => {
    monter(<DemoCours />);
    // Les six cours du club ont des inscrits : aucun bouton de suppression.
    expect(screen.getAllByText(/adhérents? — suppression impossible/).length).toBe(6);
    expect(screen.queryByRole("button", { name: "Supprimer ce cours" })).toBeNull();
  });

  it("ouvre la suppression sur un cours créé pendant la visite", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    poser(screen.getByLabelText("Nom du nouveau cours"), "Kata du samedi", window.HTMLInputElement);
    poser(screen.getByLabelText("Tarif du nouveau cours"), "180", window.HTMLInputElement);
    clic(/SIMULER L’AJOUT/);
    avancer(450);

    expect(vu!.cours.length).toBe(base.cours.length + 1);
    expect(vu!.cours.at(-1)!.tarif_centimes).toBe(18000);
    expect(screen.getByText(`${base.cours.length + 1} cours`)).toBeTruthy();

    // Ce cours-là n'a personne : il se supprime.
    clic("Supprimer le cours Kata du samedi");
    expect(screen.getByText(/Supprimer « Kata du samedi » \?/)).toBeTruthy();
    clic("Oui, supprimer");
    expect(vu!.cours.length).toBe(base.cours.length);
  });

  it("modifie un tarif, et le montant est bien en centimes", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    const c = base.cours[3];
    poser(screen.getByLabelText(`Tarif du cours ${c.nom}`), "312,50", window.HTMLInputElement);
    // Le nom accessible porte le cours : c'est ce qui distingue six boutons identiques.
    clic(`Enregistrer les modifications de ${c.nom}`);
    avancer(450);
    expect(vu!.cours.find((x) => x.id === c.id)!.tarif_centimes).toBe(31250);
  });

  it("ajoute puis retire un créneau", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    const c = base.cours[0];
    expect(c.creneaux.length).toBe(1);

    clic(`Ajouter un créneau à ${c.nom}`);
    poser(screen.getByLabelText(`Jour du créneau 2 de ${c.nom}`), "samedi", window.HTMLSelectElement);
    clic(`Enregistrer les modifications de ${c.nom}`);
    avancer(450);

    const apres = vu!.cours.find((x) => x.id === c.id)!;
    expect(apres.creneaux.length).toBe(2);
    expect(apres.creneaux[1].jour).toBe("samedi");
  });

  it("rend la jauge illimitée quand on vide le champ des places", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    const c = base.cours[0];
    poser(screen.getByLabelText(`Places du cours ${c.nom}`), "", window.HTMLInputElement);
    clic(`Enregistrer les modifications de ${c.nom}`);
    avancer(450);
    expect(vu!.cours.find((x) => x.id === c.id)!.places_max).toBeNull();
    expect(jaugeDuCours(vu!, c.id).complet).toBe(false);
    expect(screen.getByText(/Sans limite/)).toBeTruthy();
  });

  it("sert la liste d’attente dans l’ordre d’arrivée, et prévient sans rien envoyer", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoCours />);
    const attente = base.adhesions.filter((a) => a.statut === "liste_attente" && a.saison === CLUB.saison);
    expect(screen.getByText(`LISTE D’ATTENTE — ${attente.length} personne`)).toBeTruthy();

    const qui = base.adherents.find((a) => a.id === attente[0].adherent_id)!;
    clic(`Donner une place à ${qui.prenom} ${qui.nom}`);
    avancer(450);
    expect(vu!.adhesions.find((a) => a.id === attente[0].id)!.statut).toBe("en_attente");
    expect(screen.getByText(/Aucun email n’a réellement été envoyé/)).toBeTruthy();
    // La section disparaît : plus personne n'attend.
    expect(screen.queryByText(/LISTE D’ATTENTE/)).toBeNull();
  });

  it("garde la phrase du produit, sans prescrire un geste impossible", () => {
    monter(<DemoCours />);
    expect(
      screen.getByText(/Un cours qui compte des adhérents ne peut pas être supprimé/)
    ).toBeTruthy();
    // « Déplacez-les d'abord depuis leur fiche » n'existe pas : la fiche adhérent ne
    // propose aucun changement de cours.
    expect(document.body.textContent).not.toMatch(/depuis leur fiche/i);
  });
});

// ——— Ce que la modification entraîne ——————————————————————————————————————————

describe("un tarif modifié suit jusqu’à la vitrine", () => {
  it("change le prix affiché sur le site", () => {
    const base = creerEtatDemoInitial();
    render(
      <DemoLayout>
        <DemoCours />
        <DemoSite />
        <Sonde />
      </DemoLayout>
    );
    const c = base.cours[1];
    poser(screen.getByLabelText(`Tarif du cours ${c.nom}`), "410", window.HTMLInputElement);
    clic(`Enregistrer les modifications de ${c.nom}`);
    avancer(450);

    // Le chapitre « Tarifs » de la vitrine lit le même état, sans autre geste.
    const ligne = screen.getAllByText(c.nom).map((e) => e.closest("div")).find((d) => d?.textContent?.includes("410"));
    expect(ligne).toBeTruthy();
    expect(vu!.cours.find((x) => x.id === c.id)!.tarif_centimes).toBe(41000);
  });

  it("fait basculer un cours en « liste d’attente » sur la vitrine quand la jauge se ferme", () => {
    const base = creerEtatDemoInitial();
    render(
      <DemoLayout>
        <DemoCours />
        <DemoSite />
        <Sonde />
      </DemoLayout>
    );
    const c = base.cours[2]; // Judo benjamins, 16 places, loin d'être plein
    expect(jaugeDuCours(base, c.id).complet).toBe(false);
    expect(screen.getAllByText("S’INSCRIRE À CE COURS →").length).toBeGreaterThan(0);

    poser(screen.getByLabelText(`Places du cours ${c.nom}`), "1", window.HTMLInputElement);
    clic(`Enregistrer les modifications de ${c.nom}`);
    avancer(450);

    expect(jaugeDuCours(vu!, c.id).complet).toBe(true);
    expect(screen.getAllByText("LISTE D’ATTENTE →").length).toBeGreaterThan(0);
  });
});
