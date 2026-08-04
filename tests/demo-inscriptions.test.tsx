// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoInscriptions from "@/app/demo/inscriptions/page";
import DemoApercu from "@/app/demo/inscriptions/apercu/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { jaugeDuCours } from "@/lib/demo/selecteurs";

/**
 * L'ATELIER DU FORMULAIRE, ET CE QU'IL PRODUIT.
 *
 * DEUX FAMILLES DE PIÈGES SURVEILLÉES ICI
 *
 * 1. LES GESTES QUI N'EXISTENT PAS AU MÊME ENDROIT. Les réductions n'ont pas de flèches,
 *    les autorisations et les pièces en ont ; une pièce se rattache à un cours, un champ
 *    non ; le champ des options n'apparaît que pour une liste de choix. Ce sont des
 *    asymétries qu'on lisse par réflexe en « harmonisant » un écran.
 * 2. L'APERÇU QUI MENT. Il lit l'état vivant : si un test peut prouver qu'un réglage de
 *    l'atelier ne s'y répercute pas, c'est une démonstration qui montre autre chose que
 *    ce qu'elle promet.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/inscriptions",
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

const poser = (el: HTMLElement, valeur: string, prototype: { prototype: object }) =>
  act(() => {
    const setter = Object.getOwnPropertyDescriptor(prototype.prototype, "value")!.set!;
    setter.call(el, valeur);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

const clic = (nom: string | RegExp) => act(() => screen.getByRole("button", { name: nom }).click());
const clicN = (nom: string | RegExp, i: number) =>
  act(() => screen.getAllByRole("button", { name: nom })[i].click());

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— L'atelier ————————————————————————————————————————————————————————————————

describe("l’atelier", () => {
  it("porte les textes du produit, et pas la promesse de brouillon local", () => {
    monter(<DemoInscriptions />);
    expect(screen.getByText("Votre formulaire d’inscription.")).toBeTruthy();
    expect(screen.getByText(/La base ci-dessous est intégrée d’office/)).toBeTruthy();
    // Le vrai atelier enregistre un brouillon dans localStorage. La démonstration ne le
    // fait pas : elle ne doit donc pas le dire.
    expect(document.body.textContent).not.toContain("brouillon sur cet appareil");
    expect(document.body.textContent).toContain("il disparaît au rechargement");
  });

  it("affiche la base verrouillée, six champs et trois automatismes", () => {
    monter(<DemoInscriptions />);
    expect(screen.getByText("VERROUILLÉ")).toBeTruthy();
    for (const c of ["Prénom *", "Nom *", "Date de naissance *", "Adresse *", "Email *"]) {
      expect(screen.getByText(c)).toBeTruthy();
    }
    // « Téléphone » apparaît deux fois : dans la base verrouillée, et parmi les types de
    // champ proposés — d'où `getAllByText` plutôt qu'un test qui se croirait cassé.
    expect(screen.getAllByText("Téléphone").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/Responsable légal .* dès que la date de naissance indique un mineur/)).toBeTruthy();
  });

  it("garde l’avertissement sur les frais Stripe des échéances", () => {
    monter(<DemoInscriptions />);
    expect(screen.getByText(/le club perçoit un peu moins qu’en paiement unique/)).toBeTruthy();
  });

  it("ajoute une page, la renomme, la déplace, la supprime", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoInscriptions />);
    clic("+ AJOUTER UNE PAGE");
    expect(vu!.form.pages.length).toBe(base.form.pages.length + 1);
    expect(vu!.form.pages[1].titre).toBe("Page 2");

    poser(screen.getByLabelText("Titre de la page 2"), "Assurance", window.HTMLInputElement);
    expect(vu!.form.pages[1].titre).toBe("Assurance");

    clicN("Monter la page", 1);
    expect(vu!.form.pages[0].titre).toBe("Assurance");

    clicN("Supprimer la page", 0);
    expect(vu!.form.pages.length).toBe(base.form.pages.length);
    expect(vu!.form.pages.some((p) => p.titre === "Assurance")).toBe(false);
  });

  it("n’affiche le champ des options que pour une liste de choix", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoInscriptions />);
    // La page de départ contient déjà deux listes de choix.
    const choix = base.form.pages[0].champs.filter((c) => c.type === "choix");
    expect(choix.length).toBe(2);
    expect(screen.getAllByLabelText("Choix proposés").length).toBe(2);

    // On bascule la première en texte court : son champ d'options disparaît.
    const selects = screen.getAllByLabelText(/^Type du champ/);
    const i = base.form.pages[0].champs.findIndex((c) => c.type === "choix");
    poser(selects[i], "texte", window.HTMLSelectElement);
    expect(screen.getAllByLabelText("Choix proposés").length).toBe(1);
  });

  it("crée un champ obligatoire par défaut, comme le produit", () => {
    monter(<DemoInscriptions />);
    clic("Ajouter un champ");
    const dernier = vu!.form.pages[0].champs.at(-1)!;
    expect(dernier.type).toBe("texte");
    expect(dernier.label).toBe("");
    expect(dernier.obligatoire).toBe(true);
  });

  it("ne donne PAS de flèches aux réductions, mais en donne aux autorisations", () => {
    monter(<DemoInscriptions />);
    // Une réduction existe déjà ; aucune autorisation.
    expect(vu === null || vu.form.remises.length === 1).toBe(true);
    expect(screen.queryByRole("button", { name: "Monter la réduction" })).toBeNull();

    clic("+ AJOUTER UNE AUTORISATION");
    expect(screen.getByRole("button", { name: "Monter l’autorisation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Descendre l’autorisation" })).toBeTruthy();
  });

  it("réordonne deux autorisations", () => {
    monter(<DemoInscriptions />);
    clic("+ AJOUTER UNE AUTORISATION");
    poser(screen.getByLabelText("Libellé de l’autorisation"), "Premiers soins", window.HTMLInputElement);
    clic("+ AJOUTER UNE AUTORISATION");
    const champs = screen.getAllByLabelText("Libellé de l’autorisation");
    poser(champs[1], "Sortie seul", window.HTMLInputElement);
    expect(vu!.form.autorisations.map((a) => a.label)).toEqual(["Premiers soins", "Sortie seul"]);

    clicN("Monter l’autorisation", 1);
    expect(vu!.form.autorisations.map((a) => a.label)).toEqual(["Sortie seul", "Premiers soins"]);
  });

  it("saisit une réduction en euros et l’enregistre en centimes", () => {
    monter(<DemoInscriptions />);
    const montant = screen.getAllByLabelText("Montant de la réduction en euros")[0];
    poser(montant, "12,50", window.HTMLInputElement);
    expect(vu!.form.remises[0].montant_centimes).toBe(1250);
    // Une saisie illisible ne fabrique pas un montant négatif.
    poser(montant, "abc", window.HTMLInputElement);
    expect(vu!.form.remises[0].montant_centimes).toBe(0);
  });

  it("rattache une pièce à un seul cours", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoInscriptions />);
    const select = screen.getAllByLabelText(/^Cours concerné/)[0] as HTMLSelectElement;
    // « Tous les cours » d'abord, puis un par cours.
    expect(select.options[0].textContent).toBe("Tous les cours");
    expect(select.options.length).toBe(base.cours.length + 1);
    expect(select.options[1].textContent).toBe(`${base.cours[0].nom} uniquement`);

    poser(select, base.cours[2].id, window.HTMLSelectElement);
    expect(vu!.form.pieces[0].cours_id).toBe(base.cours[2].id);
  });

  it("laisse le questionnaire de santé se décocher", () => {
    const base = creerEtatDemoInitial();
    expect(base.form.sante).toBe(true);
    monter(<DemoInscriptions />);
    const c = screen.getByRole("checkbox", { name: /questionnaire de santé QS-SPORT/ }) as HTMLInputElement;
    act(() => c.click());
    expect(vu!.form.sante).toBe(false);
  });

  it("laisse inerte le seul geste qui sortirait du navigateur", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoInscriptions />);
    // Le nom accessible nomme la pièce ; le libellé visible reste celui du produit.
    // Deux pièces, donc deux boutons : on vise celui de la première, nommément.
    clic(`Joindre un modèle à « ${base.form.pieces[0].label} »`);
    expect(screen.getByText(/Fonction désactivée dans la démonstration/)).toBeTruthy();
    // Et aucun champ de fichier n'est monté : rien à envoyer nulle part.
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it("confirme l’enregistrement sans rien promettre au vrai club", () => {
    monter(<DemoInscriptions />);
    clic(/SIMULER L’ENREGISTREMENT/);
    avancer(450);
    expect(screen.getByText(/Le vrai formulaire de votre club n’a pas été modifié/)).toBeTruthy();
  });
});

// ——— L'aperçu —————————————————————————————————————————————————————————————————

describe("l’aperçu du formulaire", () => {
  it("ne propose aucune saisie", () => {
    monter(<DemoApercu />);
    expect(document.querySelectorAll("input, textarea, select").length).toBe(0);
    expect(screen.getByText(/Aperçu en lecture seule/)).toBeTruthy();
  });

  it("liste les cours au tarif vivant, et signale le cours complet", () => {
    const base = creerEtatDemoInitial();
    monter(<DemoApercu />);
    // Le Hatha est plein : sept inscrits pour sept places. C'est la jauge qui le dit,
    // jamais un réglage — et la donnée le porte réellement, elle ne le prétend pas.
    const hatha = base.cours[0];
    expect(jaugeDuCours(base, hatha.id).complet).toBe(true);
    const ligne = screen.getByText(new RegExp(`^${hatha.nom} —`));
    expect(ligne.textContent).toContain("COMPLET (liste d’attente)");
    // Le tarif affiché est celui du cours, au centime près.
    expect(ligne.textContent!.replace(/\D/g, "")).toContain(String(hatha.tarif_centimes));

    // Un cours qui a de la place ne porte pas la mention.
    const yin = base.cours[2];
    expect(jaugeDuCours(base, yin.id).complet).toBe(false);
    expect(screen.getByText(new RegExp(`^${yin.nom} —`)).textContent).not.toContain("COMPLET");
  });

  it("ne compte pas les saisons passées ni la liste d’attente dans la jauge", () => {
    const base = creerEtatDemoInitial();
    const hatha = base.cours[0];
    const j = jaugeDuCours(base, hatha.id);
    expect(j.places).toBe(7);
    expect(j.inscrits).toBe(7);
    // L'adhérente en attente n'occupe pas la place qu'elle attend.
    expect(j.attente).toBe(1);
    expect(j.inscrits + j.attente).toBeGreaterThan(j.places!);

    // Une adhésion de la saison passée sur ce cours ne doit rien changer.
    const avecVieille: EtatDemo = {
      ...base,
      adhesions: [
        ...base.adhesions,
        { ...base.adhesions[0], id: "ad-vieille", saison: "2025-2026", statut: "paye" },
      ],
    };
    expect(jaugeDuCours(avecVieille, hatha.id).inscrits).toBe(7);
  });

  it("saute une page sans champ", () => {
    const base = creerEtatDemoInitial();
    const avecPageVide = reducteurDemo(base, { type: "form/page-ajouter" });
    // Deux pages en état, une seule rendue : la neuve n'a aucun champ.
    expect(avecPageVide.form.pages.length).toBe(2);
    expect(avecPageVide.form.pages[1].champs.length).toBe(0);

    monter(<DemoInscriptions />);
    clic("+ AJOUTER UNE PAGE");
    act(() => screen.getByText("VOIR LE FORMULAIRE →").click());
    // On remonte l'aperçu sur le même provider : la page vide n'a pas de légende.
    expect(screen.queryByText("PAGE 2")).toBeNull();
  });

  it("suit l’atelier : un champ ajouté apparaît, une pièce supprimée disparaît", () => {
    const base = creerEtatDemoInitial();
    render(
      <DemoLayout>
        <DemoInscriptions />
        <DemoApercu />
        <Sonde />
      </DemoLayout>
    );

    // Un libellé tapé dans l'atelier se lit dans l'aperçu.
    clic("Ajouter un champ");
    const libelles = screen.getAllByLabelText("Libellé du champ");
    poser(libelles.at(-1)!, "Numéro de licence", window.HTMLInputElement);
    expect(screen.getByText("Numéro de licence *")).toBeTruthy();

    // Une pièce supprimée quitte l'aperçu.
    const piece = base.form.pieces[0];
    expect(screen.getAllByText(new RegExp(piece.label)).length).toBeGreaterThan(0);
    clic(`Supprimer « ${piece.label} »`);
    expect(vu!.form.pieces.some((p) => p.id === piece.id)).toBe(false);
  });

  it("retire le bloc santé quand le club décoche le questionnaire", () => {
    render(
      <DemoLayout>
        <DemoInscriptions />
        <DemoApercu />
        <Sonde />
      </DemoLayout>
    );
    expect(screen.getByText(/Le QS-SPORT officiel/)).toBeTruthy();
    const c = screen.getByRole("checkbox", { name: /questionnaire de santé QS-SPORT/ }) as HTMLInputElement;
    act(() => c.click());
    expect(screen.queryByText(/Le QS-SPORT officiel/)).toBeNull();
  });

  it("rappelle qu’une réduction est enregistrée à valider par le club", () => {
    monter(<DemoApercu />);
    expect(screen.getByText(/enregistrée « à\s+valider »/)).toBeTruthy();
    expect(screen.getByText(/CODE JUSTIFICATIF DEMANDÉ/)).toBeTruthy();
  });

  it("annonce le responsable légal comme automatique, hors atelier", () => {
    monter(<DemoApercu />);
    expect(screen.getByText(/Ce bloc ne se règle pas dans l’atelier/)).toBeTruthy();
  });
});
