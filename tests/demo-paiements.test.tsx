// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoPaiements from "@/app/demo/paiements/page";
import DemoRelances from "@/app/demo/paiements/relances/page";
import DemoRemise from "@/app/demo/paiements/remise/page";
import { useDemo } from "@/components/demo/DemoProvider";
import { creerEtatDemoInitial, reducteurDemo, type EtatDemo } from "@/lib/demo/etat";
import { aEncaisser, chequesARemettre, impayes, resteDe, totauxParMode } from "@/lib/demo/selecteurs";

/**
 * LA TRÉSORERIE — trois écrans, et un piège de périmètre entre les deux premiers.
 *
 * Les ENCAISSEMENTS ne listent que les chèques et les espèces ; les RELANCES ne filtrent
 * aucun mode. Une cotisation en ligne impayée est donc absente du premier écran et
 * présente sur le second. C'est exactement le genre de règle qu'une démonstration
 * simplifie sans s'en apercevoir, et le premier test ci-dessous existe pour ça.
 */

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo/paiements",
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

const clic = (t: string | RegExp) => act(() => screen.getByText(t).click());
const clicN = (t: string | RegExp, i: number) => act(() => screen.getAllByText(t)[i].click());
const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const taper = (label: string | RegExp, v: string) =>
  act(() => {
    const el = screen.getByLabelText(label) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const cocher = (el: Element) => act(() => (el as HTMLInputElement).click());

beforeEach(() => {
  vu = null;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— Les périmètres ———————————————————————————————————————————————————————————

describe("les deux périmètres, qu’il ne faut pas confondre", () => {
  const base = creerEtatDemoInitial();

  it("les encaissements ignorent les cotisations en ligne, les relances non", () => {
    // Le club n'a aucune cotisation en ligne impayée — le mode « en ligne » n'est posé
    // que sur des adhésions payées. On part donc d'un impayé bien réel et on lui change
    // le seul champ qui compte ici : la règle doit tenir sur la même personne.
    const impaye = aEncaisser(base)[0].adhesion;
    const etat: EtatDemo = {
      ...base,
      adhesions: base.adhesions.map((a) => (a.id === impaye.id ? { ...a, mode_paiement: "en_ligne" } : a)),
    };

    expect(aEncaisser(base).some((l) => l.adhesion.id === impaye.id)).toBe(true);
    expect(aEncaisser(etat).some((l) => l.adhesion.id === impaye.id)).toBe(false);
    // Les relances, elles, ne l'ont pas perdue de vue.
    expect(impayes(base).some((l) => l.adhesion.id === impaye.id)).toBe(true);
    expect(impayes(etat).some((l) => l.adhesion.id === impaye.id)).toBe(true);
  });

  it("une ligne soldée disparaît des deux écrans", () => {
    const cible = aEncaisser(base)[0].adhesion;
    const apres = reducteurDemo(base, {
      type: "reglement/ajouter",
      adhesionId: cible.id,
      montantCentimes: resteDe(base, cible),
      mode: "especes",
      note: null,
    });
    expect(aEncaisser(apres).some((l) => l.adhesion.id === cible.id)).toBe(false);
    expect(impayes(apres).some((l) => l.adhesion.id === cible.id)).toBe(false);
  });
});

// ——— L'écran des encaissements ————————————————————————————————————————————————

describe("l’écran des encaissements", () => {
  it("annonce le solde total sur toutes les lignes, pas sur la sélection", () => {
    const base = creerEtatDemoInitial();
    const attendu = aEncaisser(base).reduce((s, l) => s + l.reste, 0);
    monter(<DemoPaiements />);
    const avant = screen.getByText(/SOLDE TOTAL/).textContent!;
    // Les espaces de `eur()` sont insécables et fines : on compare sur les chiffres.
    const chiffres = avant.replace(/\D/g, "");
    expect(chiffres).toBe(String(attendu));
    // On coche une seule ligne : le total ne doit pas bouger d'un centime.
    cocher(document.querySelectorAll('input[type="checkbox"]')[0]);
    expect(screen.getByText(/SOLDE TOTAL/).textContent).toBe(avant);
  });

  it("montre l’acompte déjà versé sur la ligne", () => {
    monter(<DemoPaiements />);
    // Deux acomptes existent dans les données du club.
    expect(screen.getAllByText(/déjà réglé/).length).toBeGreaterThanOrEqual(2);
  });

  it("distingue une adhésion en retard", () => {
    monter(<DemoPaiements />);
    expect(screen.getAllByText("EN RETARD").length).toBeGreaterThan(0);
  });

  it("encaisse le solde quand aucun montant n’est saisi", () => {
    const base = creerEtatDemoInitial();
    const premiere = aEncaisser(base)[0];
    monter(<DemoPaiements />);
    clicN(/SIMULER L’ENCAISSEMENT/, 0);
    const r = vu!.reglements[vu!.reglements.length - 1];
    expect(r.montant_centimes).toBe(premiere.reste);
    expect(vu!.adhesions.find((a) => a.id === premiere.adhesion.id)!.statut).toBe("paye");
  });

  it("accepte un acompte, garde l’adhésion non soldée, et la ligne reste", () => {
    const base = creerEtatDemoInitial();
    const premiere = aEncaisser(base)[0];
    const nom = base.adherents.find((a) => a.id === premiere.adhesion.adherent_id)!;
    monter(<DemoPaiements />);
    taper(new RegExp(`Montant reçu de ${nom.prenom}`), "10");
    clicN(/SIMULER L’ENCAISSEMENT/, 0);
    const r = vu!.reglements[vu!.reglements.length - 1];
    expect(r.montant_centimes).toBe(1000);
    expect(vu!.adhesions.find((a) => a.id === premiere.adhesion.id)!.statut).not.toBe("paye");
    expect(screen.getByText(/Il reste .* à régler/)).toBeTruthy();
  });

  it("accepte la virgule décimale, comme un clavier français", () => {
    monter(<DemoPaiements />);
    const champ = document.querySelectorAll('input[inputmode="decimal"]')[0];
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(champ, "12,50");
      champ.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clicN(/SIMULER L’ENCAISSEMENT/, 0);
    expect(vu!.reglements[vu!.reglements.length - 1].montant_centimes).toBe(1250);
  });

  it("n’écrit aucune note, même en mode « Autre »", () => {
    // Le champ « Nature » n'existe QUE sur la fiche adhérent. Cet écran envoie null.
    monter(<DemoPaiements />);
    const select = document.querySelectorAll("select")[0] as HTMLSelectElement;
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")!.set!;
      setter.call(select, "autre");
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
    clicN(/SIMULER L’ENCAISSEMENT/, 0);
    const r = vu!.reglements[vu!.reglements.length - 1];
    expect(r.mode).toBe("autre");
    expect(r.note).toBeNull();
    expect(screen.queryByText("Nature")).toBeNull();
  });

  it("recalcule le bloc « encaissé par moyen » après un encaissement", () => {
    const base = creerEtatDemoInitial();
    const avant = totauxParMode(base).find((t) => t.mode === "especes")?.total ?? 0;
    monter(<DemoPaiements />);
    const champ = document.querySelectorAll('input[inputmode="decimal"]')[0];
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
      setter.call(champ, "20");
      champ.dispatchEvent(new Event("input", { bubbles: true }));
    });
    clicN(/SIMULER L’ENCAISSEMENT/, 0);
    expect(totauxParMode(vu!).find((t) => t.mode === "especes")!.total).toBe(avant + 2000);
  });

  it("compte les remboursements en négatif dans le total", () => {
    const base = creerEtatDemoInitial();
    const avecCarte = base.adhesions.find((a) => a.stripe_payment_intent)!;
    const apres = reducteurDemo(base, {
      type: "remboursement/simuler",
      adhesionId: avecCarte.id,
      montantCentimes: null,
    });
    const ligne = totauxParMode(apres).find((t) => t.mode === "remboursement")!;
    expect(ligne.total).toBeLessThan(0);
    const total = totauxParMode(apres).reduce((s, t) => s + t.total, 0);
    expect(total).toBeLessThan(totauxParMode(base).reduce((s, t) => s + t.total, 0));
  });
});

// ——— Les relances ——————————————————————————————————————————————————————————————

describe("les relances", () => {
  it("compte tous les impayés du club", () => {
    const base = creerEtatDemoInitial();
    const lignes = impayes(base);
    monter(<DemoRelances />);
    expect(screen.getByText(new RegExp(`^${lignes.length} impayés ·`))).toBeTruthy();
    expect(screen.getByText(`${lignes.length} avec email`)).toBeTruthy();
  });

  it("n’offre pas de bouton à qui n’a pas d’email, mais compte son montant", () => {
    /**
     * AUCUN IMPAYÉ DU CLUB N'EST SANS EMAIL. Je l'avais supposé, à tort : les trois
     * adhérents sans adresse (`null` dans les données) sont tous à jour. Le cas mérite
     * pourtant d'être tenu, parce qu'il arrive tous les ans — on le fabrique donc en
     * retirant l'adresse d'un impayé réel, plutôt que de renoncer au test.
     */
    const base = creerEtatDemoInitial();
    const cible = impayes(base)[0];
    const etat: EtatDemo = {
      ...base,
      adherents: base.adherents.map((a) =>
        a.id === cible.adhesion.adherent_id ? { ...a, email: null } : a
      ),
    };
    const total = impayes(etat).reduce((s, l) => s + l.reste, 0);
    const avecEmail = impayes(etat)
      .filter((l) => etat.adherents.find((a) => a.id === l.adhesion.adherent_id)!.email)
      .reduce((s, l) => s + l.reste, 0);
    // Son montant reste dans le total à encaisser : le club lui doit un mot, pas un oubli.
    expect(total).toBeGreaterThan(avecEmail);

    // L'écran, lui, se vérifie sur les données du club : personne n'y est sans email.
    monter(<DemoRelances />);
    expect(screen.queryByText("Pas d’email")).toBeNull();
  });

  it("date la relance sans rien envoyer, et le dit", () => {
    monter(<DemoRelances />);
    clicN(/SIMULER LA RELANCE$/, 0);
    avancer(450);
    expect(vu!.adhesions.filter((a) => a.derniere_relance).length).toBe(1);
    expect(screen.getByText(/Aucun email n’est parti/)).toBeTruthy();
  });

  it("passe le libellé à « à nouveau » une fois la personne relancée", () => {
    monter(<DemoRelances />);
    clicN(/SIMULER LA RELANCE$/, 0);
    avancer(450);
    expect(screen.getAllByText("SIMULER À NOUVEAU").length).toBe(1);
    expect(screen.getAllByText(/relancé aujourd’hui/).length).toBe(1);
  });

  it("ne relance en groupe que les personnes qui ont un email", () => {
    const base = creerEtatDemoInitial();
    const avecEmail = impayes(base).filter(
      (l) => base.adherents.find((a) => a.id === l.adhesion.adherent_id)!.email
    );
    monter(<DemoRelances />);
    clic(new RegExp(`SIMULER LA RELANCE DES ${avecEmail.length} PAR EMAIL`));
    avancer(450);
    expect(vu!.adhesions.filter((a) => a.derniere_relance).length).toBe(avecEmail.length);
  });

  it("ignore une relance sans destinataire, sans changer l’état", () => {
    const base = creerEtatDemoInitial();
    expect(reducteurDemo(base, { type: "relance/simuler", adhesionIds: [] })).toBe(base);
  });
});

// ——— La remise de chèques ————————————————————————————————————————————————————

describe("la remise de chèques", () => {
  it("coche tout au départ et affiche le total", () => {
    const base = creerEtatDemoInitial();
    const attendus = chequesARemettre(base);
    expect(attendus.length).toBeGreaterThan(1);
    monter(<DemoRemise />);
    const cases = [...document.querySelectorAll('input[type="checkbox"]')] as HTMLInputElement[];
    expect(cases.length).toBe(attendus.length);
    expect(cases.every((c) => c.checked)).toBe(true);
    expect(screen.getByText("TOUT DÉCOCHER")).toBeTruthy();
  });

  it("ne demande ni banque, ni numéro, ni date de chèque", () => {
    monter(<DemoRemise />);
    // On regarde les CHAMPS, pas le texte : « déposés en banque » est une phrase d'aide
    // légitime, et chercher le mot dans tout le document ne prouverait rien.
    const champs = [...document.querySelectorAll("input, select, textarea")] as HTMLInputElement[];
    expect(champs.length).toBeGreaterThan(0);
    expect(champs.every((c) => c.type === "checkbox")).toBe(true);
  });

  it("retire un chèque décoché du total", () => {
    const base = creerEtatDemoInitial();
    const tous = chequesARemettre(base);
    const restant = tous.slice(1).reduce((s, c) => s + c.montant_centimes, 0);
    monter(<DemoRemise />);
    cocher(document.querySelectorAll('input[type="checkbox"]')[0]);
    const compteur = screen.getByText(new RegExp(`^${tous.length - 1} chèques ·`));
    expect(compteur.textContent!.replace(/\D/g, "")).toBe(`${tous.length - 1}${restant}`);
  });

  it("désactive le geste quand plus rien n’est coché", () => {
    monter(<DemoRemise />);
    clic("TOUT DÉCOCHER");
    expect((screen.getByText(/SIMULER LA REMISE/) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sort les chèques remis de la liste active et garde le bordereau lisible", () => {
    const base = creerEtatDemoInitial();
    const tous = chequesARemettre(base);
    monter(<DemoRemise />);
    clic(/SIMULER LA REMISE/);
    avancer(450);

    // Le bordereau montre bien les chèques qui viennent de partir.
    expect(screen.getByText("Bordereau de remise de chèques")).toBeTruthy();
    expect(document.querySelectorAll("#bordereau tbody tr").length).toBe(tous.length);

    // Et ils ont quitté la liste des chèques à remettre.
    expect(chequesARemettre(vu!).length).toBe(0);
    expect(vu!.remises.length).toBe(1);
    expect(vu!.remises[0].reglementIds.length).toBe(tous.length);
  });

  it("n’écrit rien quand la liste des identifiants est vide", () => {
    const base = creerEtatDemoInitial();
    expect(reducteurDemo(base, { type: "cheques/remettre", ids: [] })).toBe(base);
  });
});

// ——— Les effets transversaux ————————————————————————————————————————————————

describe("ce qu’un encaissement change ailleurs", () => {
  it("solder une cotisation la retire des relances et de la remise à venir", () => {
    const base = creerEtatDemoInitial();
    const cible = impayes(base)[0].adhesion;
    const apres = reducteurDemo(base, {
      type: "reglement/ajouter",
      adhesionId: cible.id,
      montantCentimes: resteDe(base, cible),
      mode: "cheque",
      note: null,
    });
    expect(impayes(apres).some((l) => l.adhesion.id === cible.id)).toBe(false);
    // Payé par chèque : le chèque rejoint la liste des chèques à déposer.
    expect(chequesARemettre(apres).length).toBe(chequesARemettre(base).length + 1);
  });
});
