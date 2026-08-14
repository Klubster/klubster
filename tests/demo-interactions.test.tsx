// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Suspense, useEffect } from "react";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoAujourdhui from "@/app/demo/page";
import DemoAdherents from "@/app/demo/adherents/page";
import DemoFicheAdherent from "@/app/demo/adherents/[id]/page";
import DemoNouvelAdherent from "@/app/demo/adherents/nouveau/page";
import { useDemo } from "@/components/demo/DemoProvider";
import type { EtatDemo } from "@/lib/demo/etat";

/**
 * Les parcours, joués comme un visiteur les joue.
 *
 * DEUX RYTHMES, ET IL FAUT LES DISTINGUER
 * `BoutonSimuler` attend 450 ms avant d'agir — non pour imiter un réseau, mais parce
 * qu'un changement instantané ne se perçoit pas. Ces gestes-là se vérifient DEUX FOIS :
 * à 449 ms rien ne doit avoir bougé, à 450 ms la mutation doit être exacte. Sans le
 * premier contrôle, un bouton qui agirait immédiatement passerait pour correct.
 *
 * Tous les autres gestes — chercher, paginer, cocher, renouveler, réinitialiser — sont
 * immédiats. Les faire attendre serait aussi faux que l'inverse.
 *
 * POURQUOI LE MÊME LAYOUT D'UN ÉCRAN À L'AUTRE
 * Les tests qui suivent un effet à travers plusieurs écrans gardent la MÊME instance de
 * `DemoLayout` et ne remplacent que l'enfant. Démonter le layout remonterait le
 * provider, qui repartirait de l'état initial : le test passerait en ne prouvant rien.
 */

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
  usePathname: () => "/demo",
}));

/** Promesse déjà résolue : `use(params)` la lit sans suspendre. */
function paramsResolus(id: string): Promise<{ id: string }> {
  const p = Promise.resolve({ id }) as Promise<{ id: string }> & { status?: string; value?: { id: string } };
  p.status = "fulfilled";
  p.value = { id };
  return p;
}

/** Une sonde qui expose l'état réel, pour ne jamais recalculer ce que le code produit. */
let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => {
    vu = etat;
  }, [etat]);
  return null;
}

const fiche = (id: string) => (
  <Suspense fallback={null}>
    <DemoFicheAdherent params={paramsResolus(id)} />
  </Suspense>
);

/** Monte le layout une seule fois, avec la sonde à côté de l'écran. */
function monter(ecran: React.ReactNode) {
  return render(
    <DemoLayout>
      {ecran}
      <Sonde />
    </DemoLayout>
  );
}

const clic = (t: string | RegExp) => act(() => screen.getByText(t).click());
const clicN = (t: string | RegExp, i: number) => act(() => screen.getAllByText(t)[i].click());
const champ = (l: string) => screen.getByLabelText(l) as HTMLInputElement;
const taper = (l: string, v: string) =>
  act(() => {
    const el = champ(l);
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")!.set!;
    setter.call(el, v);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
const avancer = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
const titre = () => document.querySelector("h1")?.textContent ?? "";

/**
 * Les lignes d'adhérents de la liste.
 *
 * Compter `a[href^="/demo/adherents/"]` attrapait aussi les deux boutons d'en-tête,
 * `…/import` et `…/nouveau` : la première page en annonçait 27 au lieu de 25. Un
 * sélecteur trop large ne se voit qu'au moment où il compte faux — et il aurait tout
 * aussi bien pu compter juste par hasard.
 */
const lignesAdherents = () =>
  Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/demo/adherents/"]')).filter(
    (a) => !/\/(import|nouveau)$/.test(a.getAttribute("href") ?? "")
  );

beforeEach(() => {
  vi.useFakeTimers();
  push.mockClear();
  vu = null;
});
afterEach(() => {
  vi.useRealTimers();
});

// ——— 1. AJOUT ————————————————————————————————————————————————————————————————

describe("ajouter un adhérent", () => {
  it("ne fait rien avant 450 ms, puis ajoute et navigue vers le VRAI identifiant", () => {
    monter(<DemoNouvelAdherent />);
    const avant = vu!.adherents.length;

    taper("PRÉNOM *", "Zoé");
    taper("NOM *", "Nouvelle");
    clic("SIMULER L’AJOUT DE L’ADHÉRENT →");

    avancer(449);
    expect(vu!.adherents).toHaveLength(avant);
    expect(push).not.toHaveBeenCalled();

    avancer(1);
    expect(vu!.adherents).toHaveLength(avant + 1);

    // L'identifiant est LU dans l'état, jamais recalculé : si le test reproduisait la
    // formule du composant, ils pourraient se tromper ensemble et rester verts.
    const nouvel = vu!.adherents[vu!.adherents.length - 1];
    expect(nouvel.prenom).toBe("Zoé");
    expect(push).toHaveBeenCalledWith(`/demo/adherents/${nouvel.id}`);
  });

  it("sans cours, aucune adhésion n’est créée", () => {
    monter(<DemoNouvelAdherent />);
    const avant = vu!.adhesions.length;
    taper("PRÉNOM *", "Sans");
    taper("NOM *", "Cours");
    clic("SIMULER L’AJOUT DE L’ADHÉRENT →");
    avancer(450);
    expect(vu!.adhesions).toHaveLength(avant);
  });

  it("un prénom vide est refusé, et rien n’est ajouté même après 450 ms", () => {
    monter(<DemoNouvelAdherent />);
    const avant = vu!.adherents.length;
    taper("NOM *", "Seul");
    clic("SIMULER L’AJOUT DE L’ADHÉRENT →");
    avancer(450);
    expect(screen.getByText("Le prénom et le nom sont obligatoires.")).toBeTruthy();
    expect(vu!.adherents).toHaveLength(avant);
    expect(push).not.toHaveBeenCalled();
  });
});

// ——— 2. UNE SIMULATION ANNULÉE EN VOL ————————————————————————————————————————

describe("réinitialiser pendant une simulation en cours", () => {
  it("annule le geste : aucun ajout, aucune navigation", () => {
    // Le minuteur de `BoutonSimuler` est nettoyé au démontage. Comme la
    // réinitialisation remonte tout l'arbre, l'action n'a plus personne pour la
    // déclencher. Sans ce nettoyage, un adhérent apparaîtrait 450 ms après un
    // « RÉINITIALISER » — et personne ne saurait d'où il vient.
    monter(<DemoNouvelAdherent />);
    const avant = vu!.adherents.length;

    taper("PRÉNOM *", "Fantôme");
    taper("NOM *", "Annulé");
    clic("SIMULER L’AJOUT DE L’ADHÉRENT →");

    avancer(200);
    clic("RÉINITIALISER");
    avancer(1000);

    expect(vu!.adherents).toHaveLength(avant);
    expect(push).not.toHaveBeenCalled();
  });
});

// ——— 3. MODIFICATION DES COORDONNÉES —————————————————————————————————————————

describe("modifier les coordonnées", () => {
  it("attend 450 ms, puis enregistre", () => {
    monter(fiche("a01"));
    taper("PRÉNOM *", "Mathilde");
    clic("SIMULER L’ENREGISTREMENT DE LA FICHE");

    avancer(449);
    expect(vu!.adherents.find((a) => a.id === "a01")?.prenom).toBe("Lina");

    avancer(1);
    expect(vu!.adherents.find((a) => a.id === "a01")?.prenom).toBe("Mathilde");
  });

  it("un nom vidé est refusé, et l’état ne bouge pas", () => {
    monter(fiche("a01"));
    taper("NOM *", "   ");
    clic("SIMULER L’ENREGISTREMENT DE LA FICHE");
    avancer(450);
    expect(screen.getByText("Le prénom et le nom sont obligatoires.")).toBeTruthy();
    expect(vu!.adherents.find((a) => a.id === "a01")?.nom).toBe("Berthier");
  });
});

// ——— 4. ENCAISSEMENT —————————————————————————————————————————————————————————

describe("encaisser", () => {
  /** Aya Benali, en retard, aucun règlement : le cas propre pour un acompte. */
  const EN_RETARD = "a04";

  it("le montant est réellement prérempli avec le solde", () => {
    monter(fiche(EN_RETARD));
    const attendu = vu!.adhesions.find((a) => a.adherent_id === EN_RETARD)!.montant_centimes;
    expect(champ("MONTANT (€)").value).toBe((attendu / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }));
  });

  it("un acompte CONSERVE le statut, et fait baisser le reste", () => {
    monter(fiche(EN_RETARD));
    taper("MONTANT (€)", "50");
    clic("SIMULER L’ENCAISSEMENT");

    avancer(449);
    expect(vu!.reglements.filter((r) => r.adhesion_id.startsWith("ad")).some((r) => r.montant_centimes === 5000)).toBe(false);

    avancer(1);
    const adhesion = vu!.adhesions.find((a) => a.adherent_id === EN_RETARD)!;
    expect(adhesion.statut).toBe("en_retard"); // toujours en retard : ce n'est qu'un acompte
    const regle = vu!.reglements.filter((r) => r.adhesion_id === adhesion.id).reduce((s, r) => s + r.montant_centimes, 0);
    expect(regle).toBe(5000);
  });

  it("le solde complet passe l’adhésion à « payé »", () => {
    monter(fiche(EN_RETARD));
    // Le champ porte déjà le solde : on clique sans rien changer.
    clic("SIMULER L’ENCAISSEMENT");
    avancer(450);
    expect(vu!.adhesions.find((a) => a.adherent_id === EN_RETARD)?.statut).toBe("paye");
  });

  it("un montant vidé est refusé — on n’encaisse plus la totalité en silence", () => {
    monter(fiche(EN_RETARD));
    taper("MONTANT (€)", "");
    clic("SIMULER L’ENCAISSEMENT");
    avancer(450);
    expect(screen.getByText("Indiquez un montant.")).toBeTruthy();
    expect(vu!.adhesions.find((a) => a.adherent_id === EN_RETARD)?.statut).toBe("en_retard");
  });
});

// ——— 5. LE SOLDE CIRCULE D'UN ÉCRAN À L'AUTRE ————————————————————————————————

describe("solder une adhésion se voit partout", () => {
  it("fiche, puis liste, puis hub — sans jamais remonter le layout", () => {
    const vue = render(
      <DemoLayout>
        {fiche("a04")}
        <Sonde />
      </DemoLayout>
    );

    const retardAvant = vu!.adhesions.filter((a) => a.statut === "en_retard").length;
    clic("SIMULER L’ENCAISSEMENT");
    avancer(450);
    expect(vu!.adhesions.find((a) => a.adherent_id === "a04")?.statut).toBe("paye");

    // Même layout, enfant remplacé : c'est ce que fait Next à un changement de route.
    vue.rerender(
      <DemoLayout>
        <DemoAdherents />
        <Sonde />
      </DemoLayout>
    );
    taper("Rechercher un adhérent par nom, prénom ou email", "Benali");
    clic("CHERCHER");
    expect(screen.getByText("Payé")).toBeTruthy();

    vue.rerender(
      <DemoLayout>
        <DemoAujourdhui />
        <Sonde />
      </DemoLayout>
    );
    // Le hub affiche désormais la hiérarchie du cockpit réel : la ligne « cotisations
    // en retard » remplace la carte « COTISATIONS À RELANCER ». L'intention du test
    // est inchangée — le solde encaissé sur la fiche doit se voir jusque sur le hub.
    const ligne = screen.queryByText(/cotisations? en retard/);
    if (retardAvant - 1 === 0) {
      // Une priorité retombée à zéro n'est plus affichée du tout, comme dans le produit.
      expect(ligne).toBeNull();
    } else {
      expect(Number(ligne?.previousElementSibling?.textContent)).toBe(retardAvant - 1);
    }
  });
});

// ——— 6. GESTES IMMÉDIATS —————————————————————————————————————————————————————

describe("les gestes immédiats n’attendent pas", () => {
  it("CHERCHER agit sans avancer les minuteurs", () => {
    monter(<DemoAdherents />);
    expect(titre()).toContain("34 adhérents");
    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    clic("CHERCHER");
    // Aucun `avancer` : le résultat est là.
    expect(titre()).toContain("1 adhérent");
  });

  it("Effacer aussi, et revient à la page 1", () => {
    monter(<DemoAdherents />);
    clic("Suivants →");
    expect(screen.getByText(/Page 2 sur 2/)).toBeTruthy();

    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    clic("CHERCHER");
    expect(titre()).toContain("1 adhérent");
    clic("Effacer");
    expect(titre()).toContain("34 adhérents");
    expect(screen.getByText(/Page 1 sur 2/)).toBeTruthy();
  });

  it("la pagination est immédiate : 25 puis 9", () => {
    monter(<DemoAdherents />);
    expect(lignesAdherents()).toHaveLength(25);
    clic("Suivants →");
    expect(lignesAdherents()).toHaveLength(9);
    clic("← Précédents");
    expect(lignesAdherents()).toHaveLength(25);
  });

  it("chercher depuis la page 2 ramène page 1", () => {
    // Sans cela, le résultat existerait page 1 et l'écran afficherait une liste vide.
    monter(<DemoAdherents />);
    clic("Suivants →");
    taper("Rechercher un adhérent par nom, prénom ou email", "Berthier");
    clic("CHERCHER");
    expect(titre()).toContain("1 adhérent");
    expect(lignesAdherents()).toHaveLength(1);
  });

  it("le renouvellement est immédiat, et le second clic ne crée rien", () => {
    monter(<DemoAdherents />);
    const avant = vu!.adhesions.length;

    clic("RENOUVELER LA SAISON →");
    expect(vu!.adhesions).toHaveLength(avant + 2);
    expect(screen.getByText(/2 adhésion\(s\) créée\(s\)/)).toBeTruthy();

    clic("RENOUVELER LA SAISON →");
    expect(vu!.adhesions).toHaveLength(avant + 2);
    expect(screen.getByText(/Tout le monde a déjà une adhésion/)).toBeTruthy();
  });

  it("basculer une pièce est immédiat", () => {
    monter(fiche("a03"));
    expect(vu!.pieces.find((p) => p.id === "a03-autorisation")?.statut).toBe("manquante");
    clic("○ Manquante");
    expect(vu!.pieces.find((p) => p.id === "a03-autorisation")?.statut).toBe("recue");
  });

  it("l’anonymisation s’ouvre et se confirme sans attendre", () => {
    monter(fiche("a01"));
    // Photo d’identité et autorisation parentale : Lina est mineure, son dossier en
    // porte donc deux.
    expect(vu!.pieces.filter((p) => p.adherent_id === "a01")).toHaveLength(2);

    clic("Anonymiser (droit à l’effacement)");
    expect(screen.getByText(/Anonymiser définitivement Lina Berthier/)).toBeTruthy();

    clic("OUI, SIMULER L’ANONYMISATION");
    const a = vu!.adherents.find((x) => x.id === "a01")!;
    expect(a.nom).toBe("anonymisé");
    expect(a.email).toBeNull();
    // Les pièces et la santé partent aussi ; les écritures comptables restent.
    expect(vu!.pieces.filter((p) => p.adherent_id === "a01")).toHaveLength(0);
    expect(vu!.questionnaires.filter((q) => q.adherent_id === "a01")).toHaveLength(0);
    expect(vu!.reglements.length).toBeGreaterThan(0);
  });

  it("RÉINITIALISER est immédiat", () => {
    monter(fiche("a03"));
    clic("○ Manquante");
    expect(vu!.pieces.find((p) => p.id === "a03-autorisation")?.statut).toBe("recue");
    clic("RÉINITIALISER");
    expect(vu!.pieces.find((p) => p.id === "a03-autorisation")?.statut).toBe("manquante");
  });
});

// ——— 7. LA FICHE SANS ADHÉSION ———————————————————————————————————————————————

describe("une fiche sans adhésion le dit", () => {
  it("« Aucune adhésion enregistrée » après un ajout sans cours", () => {
    const vue = render(
      <DemoLayout>
        <DemoNouvelAdherent />
        <Sonde />
      </DemoLayout>
    );
    taper("PRÉNOM *", "Sans");
    taper("NOM *", "Cours");
    clic("SIMULER L’AJOUT DE L’ADHÉRENT →");
    avancer(450);

    const nouvel = vu!.adherents[vu!.adherents.length - 1];
    vue.rerender(
      <DemoLayout>
        {fiche(nouvel.id)}
        <Sonde />
      </DemoLayout>
    );
    expect(screen.getByText("Aucune adhésion enregistrée.")).toBeTruthy();
    // Et aucun encart d'encaissement : il n'y a rien à encaisser.
    expect(screen.queryByText("SIMULER L’ENCAISSEMENT")).toBeNull();
  });
});
